import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CaptureOrderRequest {
  orderId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    const paypalBaseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

    console.log('[CAPTURE_PREMIUM] Starting capture process');

    if (!paypalClientId || !paypalSecret) {
      console.error('[CAPTURE_PREMIUM] Missing PayPal credentials');
      return new Response(
        JSON.stringify({ error: 'PayPal credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CAPTURE_PREMIUM] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[CAPTURE_PREMIUM] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CAPTURE_PREMIUM] User authenticated:', user.id);

    const { orderId }: CaptureOrderRequest = await req.json();
    console.log('[CAPTURE_PREMIUM] Order ID:', orderId);

    // Check if this order has already been processed
    const { data: existingPurchase, error: checkError } = await supabase
      .from('user_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_order_id', orderId)
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      console.log('[CAPTURE_PREMIUM] Order already processed:', existingPurchase);
      return new Response(
        JSON.stringify({ success: true, transactionId: existingPurchase.payment_transaction_id, alreadyProcessed: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const auth = btoa(`${paypalClientId}:${paypalSecret}`);
    console.log('[CAPTURE_PREMIUM] Requesting PayPal access token...');

    const accessTokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text();
      console.error('[CAPTURE_PREMIUM] Failed to get access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with PayPal', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await accessTokenResponse.json();
    const access_token = tokenData.access_token;
    console.log('[CAPTURE_PREMIUM] Access token obtained');

    console.log('[CAPTURE_PREMIUM] Attempting to capture order:', orderId);
    const captureResponse = await fetch(
      `${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    const captureData = await captureResponse.json();
    console.log('[CAPTURE_PREMIUM] Capture response status:', captureResponse.status);
    console.log('[CAPTURE_PREMIUM] Capture data:', JSON.stringify(captureData, null, 2));

    // Handle ORDER_ALREADY_CAPTURED - check if we have it in our database
    if (captureData.name === 'UNPROCESSABLE_ENTITY' && captureData.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      console.log('[CAPTURE_PREMIUM] Order already captured on PayPal, checking database...');

      const { data: existingPurchase } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_order_id', orderId)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (existingPurchase) {
        console.log('[CAPTURE_PREMIUM] Found existing purchase in database');
        return new Response(
          JSON.stringify({ success: true, transactionId: existingPurchase.payment_transaction_id, alreadyProcessed: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if order exists for ANY user (race condition with multiple sessions)
      const { data: anyUserPurchase } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('provider_order_id', orderId)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (anyUserPurchase) {
        console.log('[CAPTURE_PREMIUM] Order captured by different user session, treating as success');
        return new Response(
          JSON.stringify({ success: true, transactionId: anyUserPurchase.payment_transaction_id, alreadyProcessed: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // If not in database at all, this is an error state
      console.error('[CAPTURE_PREMIUM] Order captured on PayPal but not in database');
      return new Response(
        JSON.stringify({ error: 'Order already captured but not found in database', details: captureData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (captureData.status === 'COMPLETED') {
      const transactionId = captureData.purchase_units[0]?.payments?.captures[0]?.id;
      console.log('[CAPTURE_PREMIUM] Payment completed! Transaction ID:', transactionId);

      const { data: insertData, error: insertError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          product_type: 'premium',
          purchase_price_cents: 499,
          payment_provider: 'paypal',
          payment_transaction_id: transactionId,
          provider_order_id: orderId,
          payment_status: 'completed',
          currency: 'USD',
          metadata: captureData,
        })
        .select();

      if (insertError) {
        console.error('[CAPTURE_PREMIUM] Failed to record purchase:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record purchase', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[CAPTURE_PREMIUM] Premium purchase recorded successfully:', insertData);

      const { data: verifyData, error: verifyError } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_type', 'premium')
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (verifyError) {
        console.error('[CAPTURE_PREMIUM] Error verifying purchase:', verifyError);
      } else if (!verifyData) {
        console.error('[CAPTURE_PREMIUM] Purchase not found in database after insert');
      } else {
        console.log('[CAPTURE_PREMIUM] Purchase verified in database:', verifyData);
      }
      return new Response(
        JSON.stringify({ success: true, transactionId }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.error('[CAPTURE_PREMIUM] Payment not completed. Status:', captureData.status);
      console.error('[CAPTURE_PREMIUM] Full response:', JSON.stringify(captureData, null, 2));
      return new Response(
        JSON.stringify({ error: 'Payment not completed', details: captureData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[CAPTURE_PREMIUM] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
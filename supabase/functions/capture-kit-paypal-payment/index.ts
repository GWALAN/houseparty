import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CaptureOrderRequest {
  orderId: string;
  kitId: string;
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

    console.log('[CAPTURE] Starting capture process');
    console.log('[CAPTURE] PayPal Base URL:', paypalBaseUrl);
    console.log('[CAPTURE] Has Client ID:', !!paypalClientId);
    console.log('[CAPTURE] Has Secret:', !!paypalSecret);

    if (!paypalClientId || !paypalSecret) {
      console.error('[CAPTURE] Missing PayPal credentials');
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
      console.error('[CAPTURE] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[CAPTURE] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[CAPTURE] User authenticated:', user.id);

    const { orderId, kitId }: CaptureOrderRequest = await req.json();
    console.log('[CAPTURE] Order ID:', orderId);
    console.log('[CAPTURE] Kit ID:', kitId);

    const { data: kit, error: kitError } = await supabase
      .from('house_kits')
      .select('id, name, price_cents')
      .eq('id', kitId)
      .maybeSingle();

    if (kitError || !kit) {
      console.error('[CAPTURE] Kit not found:', kitError);
      return new Response(
        JSON.stringify({ error: 'Kit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CAPTURE] Kit found:', kit.name, '$' + (kit.price_cents / 100).toFixed(2));

    const auth = btoa(`${paypalClientId}:${paypalSecret}`);
    console.log('[CAPTURE] Requesting PayPal access token...');
    
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
      console.error('[CAPTURE] Failed to get access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with PayPal', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await accessTokenResponse.json();
    const access_token = tokenData.access_token;
    console.log('[CAPTURE] Access token obtained');

    console.log('[CAPTURE] Attempting to capture order:', orderId);
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
    console.log('[CAPTURE] Capture response status:', captureResponse.status);
    console.log('[CAPTURE] Capture data:', JSON.stringify(captureData, null, 2));

    // Handle ORDER_ALREADY_CAPTURED - check if we have it in our database
    if (captureData.name === 'UNPROCESSABLE_ENTITY' && captureData.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      console.log('[CAPTURE] Order already captured on PayPal, checking database...');

      const { data: existingPurchase } = await supabase
        .from('user_kit_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('house_kit_id', kitId)
        .eq('payment_status', 'completed')
        .maybeSingle();

      if (existingPurchase) {
        console.log('[CAPTURE] Found existing purchase in database');
        return new Response(
          JSON.stringify({ success: true, transactionId: existingPurchase.payment_transaction_id, alreadyProcessed: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // If not in database, treat as success to prevent user confusion
      console.log('[CAPTURE] Order captured but not in database, likely race condition - treating as success');
      return new Response(
        JSON.stringify({ success: true, transactionId: null, alreadyProcessed: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (captureData.status === 'COMPLETED') {
      const transactionId = captureData.purchase_units[0]?.payments?.captures[0]?.id;
      console.log('[CAPTURE] Payment completed! Transaction ID:', transactionId);

      const { data: insertData, error: insertError } = await supabase
        .from('user_kit_purchases')
        .insert({
          user_id: user.id,
          house_kit_id: kitId,
          purchase_price_cents: kit.price_cents,
          payment_provider: 'paypal',
          payment_transaction_id: transactionId,
          payment_status: 'completed',
          metadata: captureData,
        })
        .select();

      if (insertError) {
        console.error('[CAPTURE] Failed to record purchase:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record purchase', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[CAPTURE] Purchase recorded successfully:', insertData);

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: userKit, error: userKitError } = await supabase
        .from('user_house_kits')
        .select('*')
        .eq('user_id', user.id)
        .eq('house_kit_id', kitId)
        .maybeSingle();

      if (userKitError) {
        console.error('[CAPTURE] Error checking user_house_kits:', userKitError);
      } else if (!userKit) {
        console.error('[CAPTURE] Kit was not added to user_house_kits by trigger, adding manually');
        const { error: manualInsertError } = await supabase
          .from('user_house_kits')
          .insert({
            user_id: user.id,
            house_kit_id: kitId,
            is_active: false,
            unlocked_at: new Date().toISOString(),
          });

        if (manualInsertError) {
          console.error('[CAPTURE] Failed to manually add kit:', manualInsertError);
        } else {
          console.log('[CAPTURE] Kit manually added to user_house_kits');
        }
      } else {
        console.log('[CAPTURE] Kit successfully added to user_house_kits:', userKit);
      }
      return new Response(
        JSON.stringify({ success: true, transactionId }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.error('[CAPTURE] Payment not completed. Status:', captureData.status);
      console.error('[CAPTURE] Full response:', JSON.stringify(captureData, null, 2));
      return new Response(
        JSON.stringify({ error: 'Payment not completed', details: captureData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[CAPTURE] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
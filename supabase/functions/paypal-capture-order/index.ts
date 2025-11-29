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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[CAPTURE] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (captureData.status === 'COMPLETED') {
      const transactionId = captureData.purchase_units[0]?.payments?.captures[0]?.id;
      console.log('[CAPTURE] Payment completed! Transaction ID:', transactionId);

      const { error: insertError } = await supabase
        .from('user_kit_purchases')
        .insert({
          user_id: user.id,
          house_kit_id: kitId,
          purchase_price_cents: kit.price_cents,
          payment_provider: 'paypal',
          payment_transaction_id: transactionId,
          payment_status: 'completed',
          metadata: captureData,
        });

      if (insertError) {
        console.error('[CAPTURE] Failed to record purchase:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record purchase', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[CAPTURE] Purchase recorded successfully');
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
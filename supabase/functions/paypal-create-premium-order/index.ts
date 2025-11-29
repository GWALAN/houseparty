import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    console.log('[CREATE_PREMIUM] Function called');
    console.log('[CREATE_PREMIUM] PayPal credentials present:', !!paypalClientId, !!paypalSecret);

    if (!paypalClientId || !paypalSecret) {
      console.error('[CREATE_PREMIUM] Missing PayPal credentials');
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
      console.error('[CREATE_PREMIUM] No auth header');
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
      console.error('[CREATE_PREMIUM] Auth failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE_PREMIUM] User authenticated:', user.id);

    const { data: existingPurchase } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_type', 'premium')
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      console.log('[CREATE_PREMIUM] User already has premium');
      return new Response(
        JSON.stringify({ error: 'Premium already purchased' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE_PREMIUM] Getting PayPal token');
    const auth = btoa(`${paypalClientId}:${paypalSecret}`);
    const accessTokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!accessTokenResponse.ok) {
      console.error('[CREATE_PREMIUM] PayPal auth failed');
      const errorText = await accessTokenResponse.text();
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with PayPal', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await accessTokenResponse.json();
    console.log('[CREATE_PREMIUM] Got PayPal token');

    const redirectBaseUrl = `${supabaseUrl}/functions/v1/paypal-deeplink-redirect`;

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: '4.99',
          },
          description: 'HouseParty Premium - Lifetime Access',
          custom_id: JSON.stringify({ userId: user.id, productType: 'premium' }),
        },
      ],
      application_context: {
        return_url: redirectBaseUrl,
        cancel_url: `${redirectBaseUrl}?cancel=true`,
        brand_name: 'HouseParty',
        user_action: 'PAY_NOW',
      },
    };

    console.log('[CREATE_PREMIUM] Creating PayPal order');
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await orderResponse.json();
    console.log('[CREATE_PREMIUM] PayPal response:', order.id, order.status);

    if (!orderResponse.ok || !order.id) {
      console.error('[CREATE_PREMIUM] PayPal order creation failed:', order);
      return new Response(
        JSON.stringify({ error: 'Failed to create PayPal order', details: order }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const approvalLink = order.links?.find((link: any) => link.rel === 'approve');
    console.log('[CREATE_PREMIUM] Returning order:', order.id);

    const paypalCheckoutUrl = paypalBaseUrl.includes('sandbox')
      ? 'https://www.sandbox.paypal.com/checkoutnow'
      : 'https://www.paypal.com/checkoutnow';

    return new Response(
      JSON.stringify({
        orderId: order.id,
        approvalUrl: approvalLink?.href || `${paypalCheckoutUrl}?token=${order.id}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CREATE_PREMIUM] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
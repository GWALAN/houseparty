import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateOrderRequest {
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

    console.log('[CREATE] Starting order creation');
    console.log('[CREATE] PayPal Base URL:', paypalBaseUrl);
    console.log('[CREATE] Has Client ID:', !!paypalClientId);
    console.log('[CREATE] Has Secret:', !!paypalSecret);

    if (!paypalClientId || !paypalSecret) {
      console.error('[CREATE] Missing PayPal credentials');
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
      console.error('[CREATE] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to authenticate them
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[CREATE] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now create a service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CREATE] User authenticated:', user.id);

    const { kitId }: CreateOrderRequest = await req.json();
    console.log('[CREATE] Kit ID:', kitId);

    const { data: kit, error: kitError } = await supabase
      .from('house_kits')
      .select('id, name, price_cents')
      .eq('id', kitId)
      .maybeSingle();

    if (kitError || !kit) {
      console.error('[CREATE] Kit not found:', kitError);
      return new Response(
        JSON.stringify({ error: 'Kit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE] Kit found:', kit.name, '$' + (kit.price_cents / 100).toFixed(2));

    if (kit.price_cents === 0) {
      console.error('[CREATE] Kit is free');
      return new Response(
        JSON.stringify({ error: 'This kit is free' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingPurchase } = await supabase
      .from('user_kit_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('house_kit_id', kitId)
      .maybeSingle();

    if (existingPurchase) {
      console.error('[CREATE] Kit already purchased');
      return new Response(
        JSON.stringify({ error: 'Kit already purchased' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE] Getting PayPal access token...');
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
      const errorText = await accessTokenResponse.text();
      console.error('[CREATE] Failed to get access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with PayPal', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await accessTokenResponse.json();
    const access_token = tokenData.access_token;
    console.log('[CREATE] Access token obtained');

    const redirectBaseUrl = `${supabaseUrl}/functions/v1/paypal-deeplink-redirect`;

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: (kit.price_cents / 100).toFixed(2),
          },
          description: kit.name,
          custom_id: JSON.stringify({ userId: user.id, kitId: kit.id }),
        },
      ],
      application_context: {
        return_url: `${redirectBaseUrl}?kitId=${kit.id}`,
        cancel_url: `${redirectBaseUrl}?cancel=true`,
        brand_name: 'HouseParty',
        user_action: 'PAY_NOW',
      },
    };

    console.log('[CREATE] Creating order with return URL:', orderData.application_context.return_url);

    console.log('[CREATE] Creating PayPal order:', JSON.stringify(orderData, null, 2));
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await orderResponse.json();
    console.log('[CREATE] Order response received');
    console.log('[CREATE] Order ID:', order.id);
    console.log('[CREATE] Order Status:', order.status);
    console.log('[CREATE] Order Links:', JSON.stringify(order.links));

    if (!orderResponse.ok) {
      console.error('[CREATE] Failed to create order - response not ok:', JSON.stringify(order));
      return new Response(
        JSON.stringify({ error: 'Failed to create PayPal order', details: order }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order.id) {
      console.error('[CREATE] Failed to create order - no order ID:', JSON.stringify(order));
      return new Response(
        JSON.stringify({ error: 'No order ID returned from PayPal', details: order }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the approval URL from PayPal response
    console.log('[CREATE] Extracting approval link...');
    const approvalLink = order.links?.find((link: any) => link.rel === 'approve');
    console.log('[CREATE] Approval link found:', approvalLink?.href);

    const paypalCheckoutUrl = paypalBaseUrl.includes('sandbox')
      ? 'https://www.sandbox.paypal.com/checkoutnow'
      : 'https://www.paypal.com/checkoutnow';

    const responsePayload = {
      orderId: order.id,
      approvalUrl: approvalLink?.href || `${paypalCheckoutUrl}?token=${order.id}`
    };

    console.log('[CREATE] Sending response:', JSON.stringify(responsePayload));

    return new Response(
      JSON.stringify(responsePayload),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CREATE] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
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

    if (!paypalClientId || !paypalSecret) {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { kitId }: CreateOrderRequest = await req.json();

    const { data: kit, error: kitError } = await supabase
      .from('house_kits')
      .select('id, name, price_cents')
      .eq('id', kitId)
      .maybeSingle();

    if (kitError || !kit) {
      return new Response(
        JSON.stringify({ error: 'Kit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (kit.price_cents === 0) {
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
      return new Response(
        JSON.stringify({ error: 'Kit already purchased' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = btoa(`${paypalClientId}:${paypalSecret}`);
    const accessTokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    const { access_token } = await accessTokenResponse.json();

    // Use the redirect edge function for proper deep linking
    // PayPal requires HTTP URLs, so we use an edge function that redirects to the app
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

    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await orderResponse.json();

    return new Response(
      JSON.stringify({ orderId: order.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

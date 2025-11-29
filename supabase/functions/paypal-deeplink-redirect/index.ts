import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  console.log('[PAYPAL_REDIRECT] Request received:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    console.log('[PAYPAL_REDIRECT] Full URL:', url.href);
    console.log('[PAYPAL_REDIRECT] Search params:', Array.from(url.searchParams.entries()));

    const token = url.searchParams.get('token') ?? '';
    const kitId = url.searchParams.get('kitId') ?? '';
    const cancel = url.searchParams.get('cancel') ?? '';
    const PayerID = url.searchParams.get('PayerID') ?? '';

    console.log('[PAYPAL_REDIRECT] Extracted params:', { token, kitId, cancel, PayerID });

    let deeplink = 'houseparty://paypal/';

    if (cancel) {
      deeplink += 'cancel';
      console.log('[PAYPAL_REDIRECT] Building cancel deeplink');
    } else {
      deeplink += 'success';
      if (token) {
        deeplink += `?token=${encodeURIComponent(token)}`;
      }
      if (kitId) {
        deeplink += token ? '&' : '?';
        deeplink += `kitId=${encodeURIComponent(kitId)}`;
      }
      console.log('[PAYPAL_REDIRECT] Building success deeplink');
    }

    console.log('[PAYPAL_REDIRECT] Final deeplink:', deeplink);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': deeplink,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[PAYPAL_REDIRECT] Error:', error);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'houseparty://paypal/cancel',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
});
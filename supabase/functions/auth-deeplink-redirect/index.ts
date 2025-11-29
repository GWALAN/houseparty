import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req: Request) => {
  console.log('[AUTH_REDIRECT] Request received:', req.method, req.url);

  const url = new URL(req.url);

  // Tokens might be in query (?…) or hash (#…)
  let access_token = url.searchParams.get('access_token') ?? '';
  let refresh_token = url.searchParams.get('refresh_token') ?? '';
  let type = url.searchParams.get('type') ?? '';

  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.substring(1)); // strip '#'
    access_token = access_token || hashParams.get('access_token') || '';
    refresh_token = refresh_token || hashParams.get('refresh_token') || '';
    type = type || hashParams.get('type') || '';
  }

  console.log('[AUTH_REDIRECT] Extracted params:', {
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
    type,
  });

  if (!access_token || !refresh_token) {
    // No tokens → show simple error page
    console.error('[AUTH_REDIRECT] Missing tokens');
    return new Response(
      '<h1>Invalid or expired reset link</h1><p>Please request a new password reset from the app.</p>',
      {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // Build deep link for your app. Query params (not hash) so your deepLinking
  // code & reset-password screen can read them as you already implemented.
  const deeplink = `houseparty://reset-password?access_token=${encodeURIComponent(
    access_token
  )}&refresh_token=${encodeURIComponent(refresh_token)}&type=${encodeURIComponent(
    type || 'recovery'
  )}`;

  console.log('[AUTH_REDIRECT] Redirecting to app:', deeplink);

  // 👇 THIS is the important part: plain HTTP redirect to the deep link
  return Response.redirect(deeplink, 302);
});

export default function handler(req: any, res: any) {
  const squareAppId = process.env.VITE_SQUARE_APPLICATION_ID || process.env.VITE_SQUARE_CLIENT_ID;
  const squareRedirectUri = process.env.VITE_SQUARE_REDIRECT_URI;
  const squareEnv = (process.env.VITE_SQUARE_ENV || 'production').toLowerCase();
  const oauthScopes =
    process.env.VITE_SQUARE_OAUTH_SCOPES ||
    'MERCHANT_PROFILE_READ EMPLOYEES_READ ITEMS_READ CUSTOMERS_READ CUSTOMERS_WRITE APPOINTMENTS_READ APPOINTMENTS_ALL_READ APPOINTMENTS_WRITE SUBSCRIPTIONS_READ SUBSCRIPTIONS_WRITE';

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers['host'];
  const resolvedProto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const resolvedHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const inferredProto = resolvedProto || (req.secure ? 'https' : 'http');
  const protocol = resolvedHost && !resolvedHost.includes('localhost') && !resolvedHost.includes('127.0.0.1')
    ? 'https'
    : inferredProto;
  const requestOrigin = resolvedHost ? `${protocol}://${resolvedHost}` : null;
  const requestRedirectUri = requestOrigin ? `${requestOrigin}/square/callback` : null;

  const resolvedRedirectUri = (() => {
    if (squareRedirectUri && requestRedirectUri && squareRedirectUri !== requestRedirectUri) {
      console.warn('[OAUTH START] Redirect URI mismatch, using request origin:', {
        envRedirect: squareRedirectUri,
        requestRedirect: requestRedirectUri,
      });
      return requestRedirectUri;
    }
    return squareRedirectUri || requestRedirectUri;
  })();

  if (!squareAppId || !resolvedRedirectUri) {
    console.error('[OAUTH START] Missing config:', { hasAppId: !!squareAppId, hasRedirectUri: !!resolvedRedirectUri });
    return res.status(500).json({ message: 'Square OAuth environment variables are not configured on the server.' });
  }

  console.log('[OAUTH START] Initiating OAuth with redirect_uri:', resolvedRedirectUri);

  const authorizeBase =
    squareEnv === 'sandbox'
      ? 'https://connect.squareupsandbox.com/oauth2/authorize'
      : 'https://connect.squareup.com/oauth2/authorize';

  const state = crypto.randomUUID();

  // Store state in secure HTTP-only cookie for CSRF validation
  // Note: Secure flag is only for HTTPS (production)
  const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.secure || false;
  const secureFlag = isSecure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `square_oauth_state=${state}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=600`);

  const oauthUrl =
    `${authorizeBase}` +
    `?client_id=${encodeURIComponent(squareAppId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(oauthScopes)}` +
    `&redirect_uri=${encodeURIComponent(resolvedRedirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&session=false`;

  res.redirect(302, oauthUrl);
}

import { createClient } from '@supabase/supabase-js';

const squareApiFetch = async (
  url: string,
  accessToken: string,
  options: RequestInit = {}
) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2023-10-20',
    },
    body: options.body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.errors?.[0]?.detail || 'Square API request failed');
  }
  return data;
};

export default async function handler(req: any, res: any) {
  console.log('[OAUTH TOKEN] Handler called:', {
    method: req.method,
    headers: {
      contentType: req.headers['content-type'],
      authorization: req.headers['authorization'] ? 'present' : 'missing',
    },
    timestamp: new Date().toISOString(),
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let body = req.body;
    console.log('[OAUTH TOKEN] Raw body:', {
      type: typeof body,
      isString: typeof body === 'string',
      length: typeof body === 'string' ? body.length : 'N/A',
    });
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = undefined;
      }
    }

    let code =
      body?.code ??
      (typeof req.query?.code === 'string' ? req.query.code : undefined);

    // Check if we already have access_token (from retry with email)
    const providedAccessToken = body?.access_token || req.query?.access_token;
    const providedMerchantId = body?.merchant_id || req.query?.merchant_id;

    if (!code && typeof req.headers?.referer === 'string') {
      try {
        const refUrl = new URL(req.headers.referer);
        code = refUrl.searchParams.get('code') ?? undefined;
      } catch {}
    }

    console.log('[OAUTH TOKEN] Request details:', {
      hasCode: !!code,
      hasProvidedAccessToken: !!providedAccessToken,
      hasProvidedMerchantId: !!providedMerchantId,
      bodyEmail: body?.email,
    });

    if (!code && !providedAccessToken) {
      console.error('[OAUTH TOKEN] Missing code or access_token');
      return res.status(400).json({ message: 'Missing OAuth code or access token.' });
    }

    const env = (process.env.VITE_SQUARE_ENV || 'production').toLowerCase();
    const baseUrl =
      env === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    const appId = process.env.VITE_SQUARE_APPLICATION_ID;
    const appSecret = process.env.SQUARE_APPLICATION_SECRET;
    const redirectUri = process.env.VITE_SQUARE_REDIRECT_URI;

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

    const resolvedRedirectUri = redirectUri || requestRedirectUri;

    if (redirectUri && requestRedirectUri && redirectUri !== requestRedirectUri) {
      console.log('[OAUTH TOKEN] Using registered redirect URI from env:', {
        envRedirect: redirectUri,
        requestRedirect: requestRedirectUri,
        note: 'Square only accepts the registered redirect URI, using env variable',
      });
    }

    console.log('[OAUTH TOKEN] Config check:', {
      env,
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasRedirectUri: !!resolvedRedirectUri,
      redirectUri: resolvedRedirectUri,
    });

    if (!appId || !appSecret || !resolvedRedirectUri) {
      console.error('[OAUTH TOKEN] Missing Square config', {
        appId,
        appSecret: appSecret ? '***' : 'MISSING',
        redirectUri: resolvedRedirectUri,
      });
      return res.status(500).json({ message: 'Square OAuth credentials not configured on server.' });
    }

    let access_token = providedAccessToken;
    let merchant_id = providedMerchantId;

    // Only exchange code with Square if we don't already have access_token
    if (!access_token && code) {
      const basicAuth = Buffer.from(
        `${appId}:${appSecret}`
      ).toString('base64');

      console.log('[OAUTH TOKEN] Exchanging code with Square:', {
        code: code.substring(0, 10) + '...',
        redirectUri: resolvedRedirectUri,
        hasAppId: !!appId,
        hasAppSecret: !!appSecret,
      });

      const tokenRes = await fetch(`${baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: resolvedRedirectUri,
        }),
      });

      console.log('[OAUTH TOKEN] Square token response:', {
        status: tokenRes.status,
        ok: tokenRes.ok,
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        console.error('[OAUTH TOKEN] ❌ Square OAuth Token Error:', {
          status: tokenRes.status,
          error: tokenData?.error,
          errorDescription: tokenData?.error_description,
          fullError: JSON.stringify(tokenData),
        });
        return res.status(tokenRes.status).json({
          message: 'Failed to exchange Square OAuth token.',
          square_error: tokenData,
        });
      }

      access_token = tokenData.access_token;
      merchant_id = tokenData.merchant_id;
    } else if (providedAccessToken && providedMerchantId) {
      console.log('[OAUTH TOKEN] Using provided access_token (retry with email)');
    } else {
      throw new Error('No way to get Square access token');
    }

    console.log('[OAUTH TOKEN] ✅ Square OAuth token exchanged successfully:', {
      merchant_id,
      hasAccessToken: !!access_token,
    });

    console.log('[OAUTH TOKEN] Fetching merchant details from Square:', merchant_id);
    const merchantData = await squareApiFetch(
      `${baseUrl}/v2/merchants/${merchant_id}`,
      access_token
    );

    const business_name =
      merchantData?.merchant?.business_name || 'Admin';

    // Extract merchant email from Square data - could be in different fields
    // First check if frontend is providing email
    let email = body?.email || req.query?.email;

    // If not provided, try to get it from Square merchant data
    if (!email) {
      email = merchantData?.merchant?.email ||
              merchantData?.merchant?.contact_email ||
              merchantData?.merchant?.business_email;
    }

    // If still no email, ask the user to provide one
    if (!email) {
      console.log('[OAUTH TOKEN] No email found in Square data, asking user to provide one');
      // Return the already-exchanged tokens so we don't need to exchange the code again
      return res.status(400).json({
        message: 'Email needed to complete authentication',
        needsEmail: true,
        merchant_id,
        business_name,
        access_token,
        // NOTE: DO NOT return code - it's single-use and already exchanged!
      });
    }

    console.log('[OAUTH TOKEN] ✅ Merchant details retrieved:', {
      merchant_id,
      business_name,
      email,
    });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publishableKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
      console.error('[OAUTH TOKEN] ❌ Missing Supabase credentials:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
        hasAnon: !!publishableKey,
      });
      return res.status(500).json({ message: 'Supabase credentials not configured on server.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Generate a random password for this user (they authenticated via Square OAuth, not email/password)
    const password = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

    console.log('[OAUTH TOKEN] Using Square merchant email:', { email, passwordLength: password.length });

    // Use admin API to create or update user
    const { data: createData, error: createError } = await (supabaseAdmin.auth as any).admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', merchant_id, business_name },
    });

    let user = createData?.user;

    // If user already exists, update them instead
    if (createError?.message?.includes('already')) {
      console.log('[OAUTH TOKEN] User already exists, updating instead...');

      // Find the user by email using list (since we can't query by email directly)
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const existingUser = usersList?.users?.find((u: any) => u.email === email);

      if (existingUser) {
        const { data: updateData, error: updateError } = await (supabaseAdmin.auth as any).admin.updateUserById(
          existingUser.id,
          {
            password,
            email_confirm: true,
            user_metadata: { role: 'admin', merchant_id, business_name }
          }
        );

        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }

        user = updateData?.user;
        console.log('[OAUTH TOKEN] ✅ User updated');
      } else {
        throw new Error(`User exists but could not be found in list`);
      }
    } else if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    } else {
      console.log('[OAUTH TOKEN] ✅ User created');
    }

    if (!user) {
      throw new Error('User creation failed');
    }

    // Now sign in with the anon key to get a session
    console.log('[OAUTH TOKEN] Signing in with anon key...');
    const publicSupabase = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: signInData, error: signInError } = await publicSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('[OAUTH TOKEN] ❌ Sign-in failed:', {
        email,
        error: signInError.message,
      });
      throw new Error(`Failed to create session: ${signInError.message}`);
    }

    const session = signInData?.session;

    if (!session) {
      throw new Error('No session returned from sign-in');
    }

    console.log('[OAUTH TOKEN] ✅ Session created');

    // Save merchant settings
    const { error: upsertError } = await supabaseAdmin
      .from('merchant_settings')
      .upsert(
        {
          supabase_user_id: user.id,
          square_merchant_id: merchant_id,
          square_access_token: access_token,
          square_connected_at: new Date().toISOString(),
        },
        { onConflict: 'square_merchant_id' }
      );

    if (upsertError) {
      console.error('[OAUTH TOKEN] ❌ Failed to upsert merchant_settings:', upsertError.message);
      throw new Error(`Failed to save merchant settings: ${upsertError.message}`);
    }

    console.log('[OAUTH TOKEN] ✅ OAuth flow completed successfully');

    return res.status(200).json({
      merchant_id,
      business_name,
      access_token,
      supabase_session: session
        ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }
        : null,
    });

  } catch (e: any) {
    console.error('[OAUTH TOKEN] ❌ CRITICAL ERROR in OAuth flow:', {
      message: e.message,
      stack: e.stack,
      errorCode: (e as any)?.code,
      errorStatus: (e as any)?.status,
      timestamp: new Date().toISOString(),
    });

    // Return helpful error message
    const errorMessage = e.message || 'An unknown error occurred during OAuth';
    const statusCode = e?.status || e?.statusCode || 500;
    console.log('[OAUTH TOKEN] Returning error response:', {
      statusCode,
      message: errorMessage,
    });
    return res.status(statusCode).json({
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

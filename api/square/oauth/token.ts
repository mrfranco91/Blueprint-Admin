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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let body = req.body;
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

    if (!code && typeof req.headers?.referer === 'string') {
      try {
        const refUrl = new URL(req.headers.referer);
        code = refUrl.searchParams.get('code') ?? undefined;
      } catch {}
    }

    console.log('[OAUTH TOKEN] Request details:', {
      hasBody: !!body,
      bodyCode: body?.code,
      queryCode: req.query?.code,
      referer: req.headers?.referer,
      extractedCode: code,
    });

    if (!code) {
      console.error('[OAUTH TOKEN] Missing code after extraction');
      return res.status(400).json({ message: 'Missing OAuth code.' });
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

    const basicAuth = Buffer.from(
      `${appId}:${appSecret}`
    ).toString('base64');

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

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Square OAuth Token Error:', tokenData);
      return res.status(tokenRes.status).json({
        message: 'Failed to exchange Square OAuth token.',
        square_error: tokenData,
      });
    }

    const { access_token, merchant_id } = tokenData;

    console.log('[OAUTH TOKEN] ✅ Square OAuth token exchanged successfully:', {
      merchant_id,
      hasAccessToken: !!access_token,
    });

    // Log full token response to see what fields are available
    console.log('[OAUTH TOKEN] Full token response fields:', {
      keys: Object.keys(tokenData),
      fullData: JSON.stringify(tokenData, null, 2),
    });

    console.log('[OAUTH TOKEN] Fetching merchant details from Square:', merchant_id);
    const merchantData = await squareApiFetch(
      `${baseUrl}/v2/merchants/${merchant_id}`,
      access_token
    );

    const business_name =
      merchantData?.merchant?.business_name || 'Admin';

    // Log full merchant data for debugging
    console.log('[OAUTH TOKEN] Full merchant data:', JSON.stringify(merchantData, null, 2));

    // Extract merchant email from Square data - could be in different fields
    let email = merchantData?.merchant?.email ||
                merchantData?.merchant?.contact_email ||
                merchantData?.merchant?.business_email;

    if (!email) {
      console.error('[OAUTH TOKEN] ❌ No email found in Square merchant data:', {
        merchantId: merchant_id,
        merchantDataKeys: Object.keys(merchantData?.merchant || {}),
        fullMerchantData: merchantData?.merchant,
      });
      return res.status(400).json({
        message: 'Cannot authenticate: no email associated with Square merchant account. Please add an email to your Square account and try again.'
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
    return res.status(500).json({
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

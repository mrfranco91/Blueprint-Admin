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
    const requestOrigin = resolvedHost
      ? `${resolvedProto || (req.secure ? 'https' : 'http')}://${resolvedHost}`
      : null;
    const requestRedirectUri = requestOrigin ? `${requestOrigin}/square/callback` : null;

    const resolvedRedirectUri = (() => {
      if (redirectUri && requestRedirectUri && redirectUri !== requestRedirectUri) {
        console.warn('[OAUTH TOKEN] Redirect URI mismatch, using request origin:', {
          envRedirect: redirectUri,
          requestRedirect: requestRedirectUri,
        });
        return requestRedirectUri;
      }
      return redirectUri || requestRedirectUri;
    })();

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
        redirect_uri: redirectUri,
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

    console.log('[OAUTH TOKEN] Fetching merchant details from Square:', merchant_id);
    const merchantData = await squareApiFetch(
      `${baseUrl}/v2/merchants/${merchant_id}`,
      access_token
    );

    const business_name =
      merchantData?.merchant?.business_name || 'Admin';

    console.log('[OAUTH TOKEN] ✅ Merchant details retrieved:', {
      merchant_id,
      business_name,
    });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[OAUTH TOKEN] ❌ Missing Supabase credentials:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
      });
      return res.status(500).json({ message: 'Supabase credentials not configured on server.' });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 🔍 First, check if this Square merchant already has settings
    console.log('[OAUTH TOKEN] Checking for existing merchant_settings:', {
      merchant_id,
      step: 'lookup_existing_settings',
    });

    const { data: existingSettings, error: settingsLookupError } = await supabaseAdmin
      .from('merchant_settings')
      .select('supabase_user_id')
      .eq('square_merchant_id', merchant_id)
      .maybeSingle();

    console.log('[OAUTH TOKEN] Merchant settings lookup result:', {
      foundExistingSettings: !!existingSettings,
      existingUserId: existingSettings?.supabase_user_id,
      hasError: !!settingsLookupError,
      errorMessage: settingsLookupError?.message,
    });

    if (settingsLookupError) {
      console.error('[OAUTH TOKEN] ❌ Error looking up existing settings:', {
        merchant_id,
        error: settingsLookupError.message,
      });
      throw new Error(`Failed to check existing merchant settings: ${settingsLookupError.message}`);
    }

    // Standard OAuth user credentials (merchant_id based)
    const email = `${merchant_id}@square-oauth.blueprint`;
    const password = merchant_id;

    console.log('[OAUTH TOKEN] Using standard OAuth credentials:', {
      email,
      passwordLength: password.length,
    });

    let user: any;

    // If merchant already has settings, try to use that existing user
    if (existingSettings?.supabase_user_id) {
      console.log('[OAUTH TOKEN] Existing merchant_settings found, checking if user still exists:', {
        userId: existingSettings.supabase_user_id,
        step: 'lookup_existing_user',
      });

      const { data: existingUserData, error: getUserError } = await (supabaseAdmin.auth as any).admin.getUserById(
        existingSettings.supabase_user_id
      );

      console.log('[OAUTH TOKEN] Existing user lookup result:', {
        foundUser: !!existingUserData?.user,
        userId: existingUserData?.user?.id,
        email: existingUserData?.user?.email,
        hasError: !!getUserError,
        errorMessage: getUserError?.message,
      });

      // If user exists, use it and update metadata
      if (existingUserData?.user && !getUserError) {
        console.log('[OAUTH TOKEN] ✅ Existing user found, reusing for OAuth reconnection:', {
          userId: existingUserData.user.id,
          email: existingUserData.user.email,
        });
        user = existingUserData.user;

        // Update user metadata for existing user
        console.log('[OAUTH TOKEN] Updating metadata for existing user:', user.id);
        const { error: updateError } = await (supabaseAdmin.auth as any).admin.updateUserById(
          user.id,
          { user_metadata: { role: 'admin', merchant_id, business_name } }
        );

        if (updateError) {
          console.warn('[OAUTH TOKEN] ⚠️ Failed to update user metadata:', {
            userId: user.id,
            error: updateError.message,
          });
          // Continue anyway - this is not critical
        } else {
          console.log('[OAUTH TOKEN] ✅ User metadata updated successfully');
        }
      } else {
        // User was deleted but merchant_settings still exists - create new user
        console.log('[OAUTH TOKEN] 🔄 Existing user not found (may have been deleted), will create new user:', {
          userId: existingSettings.supabase_user_id,
          error: getUserError?.message,
        });
        user = null; // Will be created below
      }
    } else {
      console.log('[OAUTH TOKEN] No existing merchant_settings found, will create new user');
    }

    // Create new user if needed (either no settings found OR user was deleted)
    if (!user) {
      console.log('[OAUTH TOKEN] Creating or retrieving user by email:', email);
      console.log('[OAUTH TOKEN] Expected password:', password);

      // Strategy: Try to sign in first. If that works, user exists (even if soft-deleted).
      // This avoids the listUsers pagination and soft-delete issues.
      const signInClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      console.log('[OAUTH TOKEN] Attempting sign-in with email:', email);
      const { data: signInAttempt, error: signInAttemptError } = await signInClient.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[OAUTH TOKEN] Sign-in attempt result:', {
        hasUser: !!signInAttempt?.user,
        userId: signInAttempt?.user?.id,
        hasSession: !!signInAttempt?.session,
        hasError: !!signInAttemptError,
        errorMessage: signInAttemptError?.message,
        errorStatus: (signInAttemptError as any)?.status,
      });

      if (signInAttempt?.user && !signInAttemptError) {
        // User exists and credentials work - use this user
        console.log('[OAUTH TOKEN] ✅ User found via sign-in:', {
          userId: signInAttempt.user.id,
          email: signInAttempt.user.email,
          emailConfirmed: signInAttempt.user.email_confirmed_at,
        });
        user = signInAttempt.user;

        // Update metadata for this existing user
        console.log('[OAUTH TOKEN] Updating metadata for existing user:', user.id);
        const { error: updateError } = await (supabaseAdmin.auth as any).admin.updateUserById(
          user.id,
          {
            email_confirm: true,
            user_metadata: { role: 'admin', merchant_id, business_name }
          }
        );

        if (updateError) {
          console.warn('[OAUTH TOKEN] ⚠️ Failed to update user metadata:', {
            userId: user.id,
            error: updateError.message,
          });
        } else {
          console.log('[OAUTH TOKEN] ✅ User metadata updated successfully');
        }
      } else {
        // User doesn't exist or credentials don't work - create new user
        console.log('[OAUTH TOKEN] Sign-in failed, proceeding to create new user:', {
          email,
          signInError: signInAttemptError?.message,
        });

        const { data: createData, error: createError } = await (supabaseAdmin.auth as any).admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: 'admin', merchant_id, business_name },
        });

        console.log('[OAUTH TOKEN] Create user result:', {
          success: !createError,
          userId: createData?.user?.id,
          email: createData?.user?.email,
          errorMessage: createError?.message,
        });

        if (createError) {
          console.error('[OAUTH TOKEN] ❌ Failed to create user:', {
            email,
            errorMessage: createError.message,
            errorCode: (createError as any)?.code,
          });

          // If creation failed due to existing email, the user might exist but password doesn't match
          // This could happen if merchant_id was reused or password changed
          if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
            console.log('[OAUTH TOKEN] 🔄 User email already exists, attempting password reset...');

            // Try to list users to find the existing one (one last attempt)
            console.log('[OAUTH TOKEN] Listing users to find existing user with email:', email);
            const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });

            console.log('[OAUTH TOKEN] listUsers returned:', {
              totalUsers: usersList?.users?.length,
              searchingFor: email,
            });

            const existingUser = usersList?.users?.find((u: any) => u.email === email);

            if (existingUser) {
              console.log('[OAUTH TOKEN] ✅ Found existing user in list:', {
                userId: existingUser.id,
                email: existingUser.email,
              });

              // Update password to match expected password
              console.log('[OAUTH TOKEN] Updating password for existing user:', existingUser.id);
              const { error: passwordUpdateError } = await (supabaseAdmin.auth as any).admin.updateUserById(
                existingUser.id,
                {
                  password,
                  email_confirm: true,
                  user_metadata: { role: 'admin', merchant_id, business_name }
                }
              );

              if (passwordUpdateError) {
                console.error('[OAUTH TOKEN] ❌ Failed to update password:', {
                  userId: existingUser.id,
                  error: passwordUpdateError.message,
                });
                throw new Error(`Failed to update existing user password: ${passwordUpdateError.message}`);
              }

              console.log('[OAUTH TOKEN] ✅ Password updated successfully for user:', existingUser.id);
              user = existingUser;
            } else {
              // User exists according to Supabase but we can't find them - likely soft-deleted
              console.error('[OAUTH TOKEN] ❌ CRITICAL: User email is registered but cannot be found in listUsers', {
                email,
                userCount: usersList?.users?.length,
                likelyReason: 'Soft-deleted user or pagination issue',
              });
              throw new Error(
                'This account cannot be accessed. Please contact support to restore your account or use a different Square merchant account.'
              );
            }
          } else {
            throw new Error(`Failed to create user: ${createError.message}`);
          }
        } else {
          console.log('[OAUTH TOKEN] ✅ User created successfully:', {
            userId: createData?.user?.id,
            email: createData?.user?.email,
          });
          user = createData.user;
        }
      }
    }

    if (!user) {
      console.error('[OAUTH TOKEN] ❌ CRITICAL: User is null after creation/lookup');
      throw new Error('User creation/lookup failed');
    }

    console.log('[OAUTH TOKEN] ✅ User ready for session:', {
      userId: user.id,
      email: user.email,
      step: 'creating_session',
    });

    // Create a new session for the user using admin API (without signing in the admin client)
    // Note: We'll use a separate client instance for this to avoid affecting the admin client
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('[OAUTH TOKEN] Attempting to create session with sign-in:', email);
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password,
    });

    console.log('[OAUTH TOKEN] Session creation attempt result:', {
      hasSession: !!signInData?.session,
      sessionUserId: signInData?.session?.user?.id,
      hasUser: !!signInData?.user,
      hasError: !!signInError,
      errorMessage: signInError?.message,
    });

    if (signInError) {
      console.error('[OAUTH TOKEN] ❌ Failed to create session:', {
        email,
        error: signInError.message,
        errorCode: (signInError as any)?.status,
      });
      throw new Error(`Failed to create session: ${signInError.message}`);
    }

    const session = signInData.session;

    if (!session) {
      console.error('[OAUTH TOKEN] ❌ CRITICAL: Session object is null after sign-in');
      throw new Error('Failed to create session for user');
    }

    console.log('[OAUTH TOKEN] ✅ Session created successfully:', {
      userId: session.user?.id,
      expiresIn: session.expires_in,
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token,
    });

    console.log('[OAUTH TOKEN] Upserting merchant_settings:', {
      supabase_user_id: user.id,
      square_merchant_id: merchant_id,
      hasAccessToken: !!access_token,
    });

    // Use upsert with square_merchant_id as conflict target since it's the unique business key
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from('merchant_settings')
      .upsert(
        {
          supabase_user_id: user.id,
          square_merchant_id: merchant_id,
          square_access_token: access_token,
          square_connected_at: new Date().toISOString(),
        },
        { onConflict: 'square_merchant_id' }
      )
      .select();

    console.log('[OAUTH TOKEN] Upsert result:', {
      success: !upsertError,
      rowCount: upsertData?.length,
      errorMessage: upsertError?.message,
      upsertedData: upsertData?.[0] ? {
        userId: upsertData[0].supabase_user_id,
        merchantId: upsertData[0].square_merchant_id,
        connectedAt: upsertData[0].square_connected_at,
      } : null,
    });

    if (upsertError) {
      console.error('[OAUTH TOKEN] ❌ Failed to upsert merchant_settings:', {
        userId: user.id,
        merchantId: merchant_id,
        error: upsertError.message,
        errorCode: (upsertError as any)?.code,
      });
      throw new Error(`Failed to save merchant settings: ${upsertError.message}`);
    }

    console.log('[OAUTH TOKEN] ✅ OAuth flow completed successfully');

    // ✅ Return session tokens so frontend can authenticate without re-signing-in
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

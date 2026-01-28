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
  console.log('[CREATE SESSION] Request received:', req.method);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { squareAccessToken } = await req.json();

    if (!squareAccessToken) {
      return res.status(400).json({ message: 'Square access token required' });
    }

    if (
      !process.env.VITE_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return res.status(500).json({ message: 'Supabase config missing.' });
    }

    // Determine environment and base URL
    const env = (process.env.VITE_SQUARE_ENV || 'production').toLowerCase();
    const baseUrl =
      env === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    console.log('[CREATE SESSION] Getting merchant info from Square');

    // Get merchant info from Square using the access token
    const merchantData = await squareApiFetch(
      `${baseUrl}/v2/merchants`,
      squareAccessToken
    );

    if (!merchantData?.merchants || merchantData.merchants.length === 0) {
      console.error('[CREATE SESSION] No merchants found for token');
      return res.status(400).json({ message: 'Invalid Square access token or no merchant found' });
    }

    const merchant = merchantData.merchants[0];
    const merchant_id = merchant.id;
    const business_name = merchant.business_name || 'Business';

    console.log('[CREATE SESSION] Found merchant:', merchant_id);

    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const email = `${merchant_id}@square-oauth.blueprint`;
    const password = merchant_id;
    const tempPassword = 'blueprint-token-sync-' + Date.now();

    console.log('[CREATE SESSION] Looking for user with email:', email);

    // Try to find existing user by email
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const getUserResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let user: any;
    let session: any;
    const users = await getUserResponse.json();
    const existingUser = users && users.length > 0 ? users[0] : null;

    if (existingUser) {
      console.log('[CREATE SESSION] User already exists, updating password');
      user = existingUser;

      // Update password for the existing user
      const { error: updateError } = await (supabaseAdmin.auth as any).admin.updateUserById(
        user.id,
        { password: tempPassword }
      );

      if (updateError) {
        console.error('[CREATE SESSION] Failed to update password:', updateError);
        return res.status(500).json({
          message: 'Failed to prepare account for sign-in',
          details: updateError.message,
        });
      }

      // Sign in to get a valid session
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password: tempPassword });
      if (signInError) {
        console.error('[CREATE SESSION] Sign in failed after password update:', signInError);
        return res.status(500).json({
          message: 'Failed to create session',
          details: signInError.message,
        });
      }
      session = signInData.session;
    } else {
      console.log('[CREATE SESSION] Creating new user for merchant');

      // Create new user
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: { role: 'admin', merchant_id, business_name },
        },
      });

      if (signUpError) {
        console.error('[CREATE SESSION] Failed to create user:', signUpError);
        return res.status(500).json({
          message: 'Failed to create user account',
          details: signUpError.message,
        });
      }

      if (!signUpData.user) {
        console.error('[CREATE SESSION] User creation succeeded but no user returned');
        return res.status(500).json({
          message: 'User creation failed - no user returned',
        });
      }

      user = signUpData.user;
      console.log('[CREATE SESSION] User created successfully:', user.id);

      // Upsert merchant settings
      const { error: upsertError } = await supabaseAdmin
        .from('merchant_settings')
        .upsert(
          {
            supabase_user_id: user.id,
            square_merchant_id: merchant_id,
            square_access_token: squareAccessToken,
            square_connected_at: new Date().toISOString(),
          },
          { onConflict: 'supabase_user_id' }
        )
        .select();

      if (upsertError) {
        console.error('[CREATE SESSION] Failed to upsert merchant_settings:', upsertError);
        throw new Error(`Failed to save merchant settings: ${upsertError.message}`);
      }

      console.log('[CREATE SESSION] Merchant settings upserted for user:', user.id);

      // After creating new user, sign them in to get a session
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password: tempPassword });
      if (signInError) {
        console.error('[CREATE SESSION] Failed to sign in new user:', signInError);
        return res.status(500).json({
          message: 'User created but failed to create session',
          details: signInError.message,
        });
      }
      session = signInData.session;
    }

    if (!session) {
      console.error('[CREATE SESSION] No session created');
      return res.status(500).json({
        message: 'Failed to create session',
      });
    }

    // Return session tokens so frontend can set them directly
    return res.status(200).json({
      supabase_session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
      userId: user.id,
    });
  } catch (e: any) {
    console.error('[CREATE SESSION] Fatal error:', e);
    return res.status(500).json({ message: e.message });
  }
}

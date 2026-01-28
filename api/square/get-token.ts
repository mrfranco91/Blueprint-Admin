import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers['authorization'] as string | undefined;
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!bearer) {
      return res.status(401).json({ message: 'Missing authorization token.' });
    }

    // Use Supabase admin client to get user from JWT
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from JWT token
    const { data: userData, error: userErr } = await (supabaseAdmin.auth as any).getUser(bearer);

    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ message: 'Invalid or expired authorization token.' });
    }

    const userId = userData.user.id;

    // Retrieve Square access token from merchant_settings
    const { data: merchantSettings, error: dbError } = await supabaseAdmin
      .from('merchant_settings')
      .select('square_access_token')
      .eq('supabase_user_id', userId)
      .maybeSingle();

    if (dbError) {
      console.error('Database error retrieving merchant settings:', dbError);
      return res.status(500).json({ message: 'Failed to retrieve token settings.' });
    }

    if (!merchantSettings?.square_access_token) {
      return res.status(401).json({ message: 'Square access token not found. Please authenticate with Square.' });
    }

    return res.status(200).json({ access_token: merchantSettings.square_access_token });
  } catch (e: any) {
    console.error('Token retrieval error:', e);
    return res.status(500).json({ message: e.message });
  }
}

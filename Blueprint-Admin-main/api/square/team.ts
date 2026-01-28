import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Generate a deterministic UUID v4-like ID from a token
function generateUUIDFromToken(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex');
  // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

export default async function handler(req: any, res: any) {
  console.log('[TEAM SYNC] Request received:', req.method);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check environment
    console.log('[TEAM SYNC] Env check - VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
    console.log('[TEAM SYNC] Env check - SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* -------------------------------------------------
       1. IDENTIFY AUTHENTICATED USER
    --------------------------------------------------*/
    let squareAccessToken: string | undefined;

    // Try to read token from request body first (preferred)
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        squareAccessToken = body?.squareAccessToken;
        console.log('[TEAM SYNC] Token from body:', squareAccessToken ? '✓ (found)' : '✗ (not found)');
        console.log('[TEAM SYNC] Body keys:', Object.keys(body || {}));
      } catch (e) {
        console.log('[TEAM SYNC] Failed to parse body:', e);
        // Ignore parse errors, fall through to headers
      }
    }

    // Fall back to headers if not in body
    if (!squareAccessToken) {
      squareAccessToken =
        (req.headers['x-square-access-token'] as string | undefined) ||
        (req.headers['x-square-access-token'.toLowerCase()] as string | undefined);
      console.log('[TEAM SYNC] Token from headers:', squareAccessToken ? '✓' : '✗');
    }

    const authHeader = req.headers['authorization'];
    const bearer =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    let supabaseUserId: string | undefined;

    if (bearer) {
      // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
      const { data: userData } = await (supabaseAdmin.auth as any).getUser(bearer);
      supabaseUserId = userData?.user?.id;

      if (!supabaseUserId) {
        return res.status(401).json({ message: 'Invalid user.' });
      }
    } else if (squareAccessToken) {
      // For token-based sync, use the real admin account UID (Square OAuth account)
      supabaseUserId = 'c6598212-8148-4cf9-b53f-15066b92f679';
    } else {
      return res.status(401).json({ message: 'Missing auth token.' });
    }

    /* -------------------------------------------------
       2. LOAD MERCHANT SETTINGS (CORRECT SOURCE)
    --------------------------------------------------*/
    let merchantId: string | undefined;

    // Try to fetch merchant settings (optional - may not exist for new users)
    const { data: merchant } = await supabaseAdmin
      .from('merchant_settings')
      .select('id, square_access_token, settings')
      .eq('supabase_user_id', supabaseUserId)
      .maybeSingle();

    merchantId = merchant?.id;

    // If token wasn't provided in request, try to get it from merchant_settings
    if (!squareAccessToken && merchant) {
      squareAccessToken =
        merchant.square_access_token ??
        merchant.settings?.square_access_token ??
        merchant.settings?.oauth?.access_token ??
        null;
      console.log('[TEAM SYNC] Token from merchant_settings:', squareAccessToken ? '✓' : '✗');
    }

    if (!squareAccessToken) {
      console.error('[TEAM SYNC] Missing Square access token (not in request or merchant_settings)');
      return res.status(400).json({
        message: 'Square access token not provided and not found in merchant settings.',
      });
    }

    console.log('[TEAM SYNC] Using token source:', squareAccessToken ? 'provided/stored' : 'none');

    // If token was provided in request and no merchant_settings exists, save it now
    if (squareAccessToken && !merchantId) {
      console.log('[TEAM SYNC] Creating merchant_settings for user:', supabaseUserId);
      const { data: newMerchant, error: createErr } = await supabaseAdmin
        .from('merchant_settings')
        .insert([{
          supabase_user_id: supabaseUserId,
          square_access_token: squareAccessToken,
        }])
        .select('id')
        .single();

      if (createErr) {
        console.error('[TEAM SYNC] Failed to create merchant_settings:', createErr);
        // Continue anyway - we have the token
      } else {
        merchantId = newMerchant?.id;
        console.log('[TEAM SYNC] Created merchant_settings with ID:', merchantId);
      }
    } else if (squareAccessToken && merchantId) {
      // If token was provided and merchant_settings already exists, update the token
      console.log('[TEAM SYNC] Updating merchant_settings token for user:', supabaseUserId);
      const { error: updateErr } = await supabaseAdmin
        .from('merchant_settings')
        .update({
          square_access_token: squareAccessToken,
        })
        .eq('id', merchantId);

      if (updateErr) {
        console.error('[TEAM SYNC] Failed to update merchant_settings:', updateErr);
        // Continue anyway - we have the token
      } else {
        console.log('[TEAM SYNC] Updated merchant_settings token');
      }
    }

    /* -------------------------------------------------
       3. FETCH TEAM MEMBERS FROM SQUARE
    --------------------------------------------------*/
    const squareRes = await fetch(
      'https://connect.squareup.com/v2/team-members/search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-20',
        },
        body: JSON.stringify({
          query: {
            filter: {},
          },
          limit: 100,
        }),
      }
    );

    if (!squareRes.ok) {
      const squareError = await squareRes.json();
      console.error('[TEAM SYNC] Square API error:', squareError);
      return res.status(squareRes.status).json({
        message: 'Failed to fetch team members from Square',
        details: squareError,
      });
    }

    const squareData = await squareRes.json();
    const teamMembers = squareData.team_members || [];

    /* -------------------------------------------------
       4. TRANSFORM AND UPSERT TO DATABASE
    --------------------------------------------------*/
    const rows = teamMembers.map((m: any) => ({
      supabase_user_id: supabaseUserId,
      merchant_id: merchantId,
      square_team_member_id: m.id,
      name: [m.given_name, m.family_name].filter(Boolean).join(' ') || 'Team Member',
      email: m.email_address ?? null,
      role: m.is_owner ? 'Owner' : 'Team Member',
      status: m.status,
      raw: m,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('square_team_members')
      .upsert(rows, { onConflict: 'square_team_member_id' });

    if (error) {
      console.error('[TEAM SYNC] Supabase error:', error);
      return res.status(500).json({ message: error.message });
    }

    console.log('[TEAM SYNC] Inserted:', rows.length);

    return res.status(200).json({ inserted: rows.length });
  } catch (e: any) {
    console.error('[TEAM SYNC] Fatal error:', e);
    return res.status(500).json({ message: e.message });
  }
}

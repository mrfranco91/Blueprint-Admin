import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Generate a deterministic UUID v4-like ID from a token
function generateUUIDFromToken(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex');
  // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

export default async function handler(req: any, res: any) {
  try {
    let squareAccessToken: string | undefined;

    // Try to read token from request body first (preferred)
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        squareAccessToken = body?.squareAccessToken;
        console.log('[CLIENT SYNC] Token from body:', squareAccessToken ? '✓' : '✗');
      } catch (e) {
        console.log('[CLIENT SYNC] Failed to parse body:', e);
        // Ignore parse errors, fall through to headers
      }
    }

    // Fall back to headers if not in body
    if (!squareAccessToken) {
      squareAccessToken =
        (req.headers['x-square-access-token'] as string | undefined) ||
        (req.headers['x-square-access-token'.toLowerCase()] as string | undefined);
      console.log('[CLIENT SYNC] Token from headers:', squareAccessToken ? '✓' : '✗');
    }

    const authHeader = req.headers['authorization'] as string | undefined;
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (
      !process.env.VITE_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.VITE_SUPABASE_ANON_KEY
    ) {
      return res.status(500).json({ message: 'Supabase config missing.' });
    }

    // Service-role Supabase client (DB access)
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // If token not provided in request, try to fetch from merchant_settings
    let merchantId: string | undefined;

    if (!squareAccessToken) {
      const { data: ms, error: msErr } = await supabaseAdmin
        .from('merchant_settings')
        .select('id, square_access_token')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle();

      if (msErr || !ms?.square_access_token) {
        console.error('[CLIENT SYNC] merchant_settings lookup failed:', msErr);
        return res.status(401).json({
          message: 'Missing Square access token in request or merchant settings.',
        });
      }

      squareAccessToken = ms.square_access_token;
      merchantId = ms.id;
      console.log('[CLIENT SYNC] Token from merchant_settings:', squareAccessToken ? '✓' : '✗');
    } else {
      console.log('[CLIENT SYNC] Token from request body:', squareAccessToken ? '✓' : '✗');

      // If token provided but no merchant_settings exists, create it
      const { data: ms } = await supabaseAdmin
        .from('merchant_settings')
        .select('id')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle();

      if (!ms?.id) {
        const { data: newMerchant } = await supabaseAdmin
          .from('merchant_settings')
          .insert([{
            supabase_user_id: supabaseUserId,
            square_access_token: squareAccessToken,
          }])
          .select('id')
          .single();
        merchantId = newMerchant?.id;
        console.log('[CLIENT SYNC] Created merchant_settings with ID:', merchantId);
      } else {
        merchantId = ms.id;
        // If token provided and merchant_settings exists, update the token
        if (squareAccessToken && ms.id) {
          const { error: updateErr } = await supabaseAdmin
            .from('merchant_settings')
            .update({
              square_access_token: squareAccessToken,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ms.id);

          if (updateErr) {
            console.error('[CLIENT SYNC] Failed to update merchant_settings:', updateErr);
          } else {
            console.log('[CLIENT SYNC] Updated merchant_settings token');
          }
        }
      }
    }

    const squareRes = await fetch(
      'https://connect.squareup.com/v2/customers',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-20',
        },
      }
    );

    const json = await squareRes.json();
    if (!squareRes.ok) {
      return res.status(squareRes.status).json(json);
    }

    const customers = json.customers || [];

    const rows = customers.map((c: any) => ({
      supabase_user_id: supabaseUserId,
      name: [c.given_name, c.family_name].filter(Boolean).join(' ') || 'Client',
      email: c.email_address || null,
      phone: c.phone_number || null,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        [c.given_name, c.family_name].filter(Boolean).join(' ') || 'C'
      )}&background=random`,
      external_id: c.id,
    }));

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from('clients')
        .upsert(rows, { onConflict: 'external_id' });

      if (error) {
        console.error('[CLIENT SYNC] Insert failed:', error);
        return res.status(500).json({ message: error.message });
      }
    }

    return res.status(200).json({ inserted: rows.length });
  } catch (e: any) {
    console.error('[CLIENT SYNC] Fatal error:', e);
    return res.status(500).json({ message: e.message });
  }
}

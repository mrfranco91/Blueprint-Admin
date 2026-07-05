import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/square/status
 *
 * Unified Square status lookup. Routes by `action` query param:
 *   - "has-merchant" (default) → returns { hasMerchant: boolean }
 *   - "get-token"             → returns { access_token: string }
 *
 * Consolidated from: api/square/has-merchant.ts, api/square/get-token.ts
 */

async function resolveUser(req: any) {
  const authHeader = req.headers['authorization'] as string | undefined;
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!bearer) {
    return { error: { status: 401, message: 'Missing authorization token.' } };
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: { status: 500, message: 'Server configuration error.' } };
  }

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: userData, error: userErr } = await (supabaseAdmin.auth as any).getUser(bearer);

  if (userErr || !userData?.user?.id) {
    return { error: { status: 401, message: 'Invalid or expired authorization token.' } };
  }

  return { userId: userData.user.id, supabaseAdmin };
}

// ─── HAS-MERCHANT ────────────────────────────────────────────────────────────
async function handleHasMerchant(req: any, res: any) {
  const ctx = await resolveUser(req);
  if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

  const { data: merchantSettings, error: dbError } = await ctx.supabaseAdmin
    .from('merchant_settings')
    .select('square_merchant_id')
    .eq('supabase_user_id', ctx.userId)
    .maybeSingle();

  if (dbError) {
    console.error('Database error retrieving merchant settings:', dbError);
    return res.status(500).json({ message: 'Failed to retrieve merchant settings.' });
  }

  return res.status(200).json({ hasMerchant: !!merchantSettings?.square_merchant_id });
}

// ─── GET-TOKEN ───────────────────────────────────────────────────────────────
async function handleGetToken(req: any, res: any) {
  const ctx = await resolveUser(req);
  if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

  const { data: merchantSettings, error: dbError } = await ctx.supabaseAdmin
    .from('merchant_settings')
    .select('square_access_token')
    .eq('supabase_user_id', ctx.userId)
    .maybeSingle();

  if (dbError) {
    console.error('Database error retrieving merchant settings:', dbError);
    return res.status(500).json({ message: 'Failed to retrieve token settings.' });
  }

  if (!merchantSettings?.square_access_token) {
    return res.status(401).json({ message: 'Square access token not found. Please authenticate with Square.' });
  }

  return res.status(200).json({ access_token: merchantSettings.square_access_token });
}

// ─── Router ──────────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const action = req.query?.action || 'has-merchant';

    switch (action) {
      case 'has-merchant':
        return await handleHasMerchant(req, res);
      case 'get-token':
        return await handleGetToken(req, res);
      default:
        return res.status(400).json({ message: `Unknown action: ${action}. Use has-merchant or get-token.` });
    }
  } catch (e: any) {
    console.error('Square status error:', e);
    return res.status(500).json({ message: e.message });
  }
}

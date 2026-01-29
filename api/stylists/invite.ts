import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_PERMISSIONS = {
  canBookAppointments: true,
  canOfferDiscounts: false,
  requiresDiscountApproval: true,
  viewGlobalReports: false,
  viewClientContact: true,
  viewAllSalonPlans: false,
  can_book_own_schedule: true,
  can_book_peer_schedules: false,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (!body && typeof req.json === 'function') {
      body = await req.json();
    }
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = undefined;
      }
    }

    const name = body?.name?.trim();
    const email = body?.email?.trim();
    const levelId = body?.levelId || 'lvl_1';

    if (!name || !email) {
      return res.status(400).json({ message: 'Stylist name and email are required.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ message: 'Supabase credentials not configured on server.' });
    }

    const authHeader = req.headers['authorization'];
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!bearerToken) {
      return res.status(401).json({ message: 'Missing auth token.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await (supabaseAdmin.auth as any).getUser(bearerToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ message: 'Invalid user session.' });
    }

    const adminRole = authData.user.user_metadata?.role || 'admin';
    if (adminRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can invite stylists.' });
    }

    const stylistId = randomUUID();

    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers['host'];
    const resolvedProto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    const resolvedHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    const inferredProto = resolvedProto || (req.secure ? 'https' : 'http');
    const protocol = resolvedHost && !resolvedHost.includes('localhost') && !resolvedHost.includes('127.0.0.1')
      ? 'https'
      : inferredProto;
    const requestOrigin = resolvedHost ? `${protocol}://${resolvedHost}` : null;
    const redirectTo = process.env.VITE_STYLIST_APP_URL || (requestOrigin ? `${requestOrigin}/` : undefined);

    const { error: inviteError } = await (supabaseAdmin.auth as any).admin.inviteUserByEmail(email, {
      data: {
        role: 'stylist',
        stylist_id: stylistId,
        stylist_name: name,
        level_id: levelId,
        permissions: DEFAULT_PERMISSIONS,
      },
      redirectTo,
    });

    if (inviteError) {
      return res.status(400).json({ message: inviteError.message });
    }

    const { data: merchantSettings } = await supabaseAdmin
      .from('merchant_settings')
      .select('id')
      .eq('supabase_user_id', authData.user.id)
      .maybeSingle();

    const stylistRow = {
      supabase_user_id: authData.user.id,
      merchant_id: merchantSettings?.id ?? null,
      square_team_member_id: stylistId,
      name,
      email,
      role: 'Stylist',
      status: 'active',
      level_id: levelId,
      permissions: DEFAULT_PERMISSIONS,
      raw: { source: 'invite' },
      updated_at: new Date().toISOString(),
    };

    const { error: stylistError } = await supabaseAdmin
      .from('square_team_members')
      .upsert([stylistRow], { onConflict: 'square_team_member_id' });

    if (stylistError) {
      return res.status(500).json({ message: stylistError.message });
    }

    return res.status(200).json({
      stylist: {
        id: stylistId,
        name,
        role: 'Stylist',
        email,
        levelId,
        permissions: DEFAULT_PERMISSIONS,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to send invite.' });
  }
}

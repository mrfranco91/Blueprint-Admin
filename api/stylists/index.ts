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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function parseBody(req: any) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = undefined; }
  }
  return body;
}

// ─── Generate PIN (admin only) ───────────────────────────────────────────────
async function handleGeneratePin(req: any, res: any) {
  const body = parseBody(req);
  const squareTeamMemberId = body?.squareTeamMemberId?.trim();
  const name = body?.name?.trim() || '';
  const email = body?.email?.trim() || '';
  if (!squareTeamMemberId) {
    return res.status(400).json({ message: 'squareTeamMemberId is required.' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ message: 'Server configuration error.' });

  const authHeader = req.headers['authorization'];
  const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7) : null;
  if (!bearerToken) return res.status(401).json({ message: 'Missing auth token.' });

  const { data: authData, error: authError } = await (supabaseAdmin.auth as any).getUser(bearerToken);
  if (authError || !authData?.user) return res.status(401).json({ message: 'Invalid user session.' });

  const adminRole = authData.user.user_metadata?.role || 'admin';
  if (adminRole !== 'admin') return res.status(403).json({ message: 'Only admins can generate PINs.' });

  const pin = String(Math.floor(1000 + Math.random() * 9000));

  // Look up the merchant_settings UUID for this admin
  const { data: msRow } = await supabaseAdmin
    .from('merchant_settings')
    .select('id')
    .eq('supabase_user_id', authData.user.id)
    .maybeSingle();
  const merchantSettingsId = msRow?.id || null;

  const { data: existing } = await supabaseAdmin
    .from('square_team_members')
    .select('*')
    .eq('square_team_member_id', squareTeamMemberId)
    .maybeSingle();

  const currentRaw = existing?.raw || {};
  const updatedRaw = { ...currentRaw, join_pin: pin, pin_created_at: new Date().toISOString() };

  if (existing) {
    const updateFields: any = {
      raw: updatedRaw,
      updated_at: new Date().toISOString(),
      supabase_user_id: authData.user.id,
    };
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (merchantSettingsId && !existing.merchant_id) updateFields.merchant_id = merchantSettingsId;
    const { error: updateError } = await supabaseAdmin
      .from('square_team_members')
      .update(updateFields)
      .eq('square_team_member_id', squareTeamMemberId);
    if (updateError) return res.status(500).json({ message: updateError.message });
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('square_team_members')
      .insert({
        square_team_member_id: squareTeamMemberId,
        supabase_user_id: authData.user.id,
        merchant_id: merchantSettingsId,
        name: name || null,
        email: email || null,
        raw: updatedRaw,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (insertError) return res.status(500).json({ message: insertError.message });
  }

  return res.status(200).json({ pin, debug: { rowExisted: !!existing, squareTeamMemberId } });
}

// ─── Verify PIN (public) ────────────────────────────────────────────────────
async function handleVerifyPin(req: any, res: any) {
  const body = parseBody(req);
  const pin = body?.pin?.trim();
  if (!pin || pin.length !== 4) {
    return res.status(400).json({ message: 'A valid 4-digit PIN is required.' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ message: 'Server configuration error.' });

  const { data: members, error: fetchError } = await supabaseAdmin
    .from('square_team_members')
    .select('*')
    .not('raw', 'is', null);

  if (fetchError) return res.status(500).json({ message: 'Failed to look up PIN.' });

  const match = (members || []).find((m: any) => m.raw?.join_pin === pin);

  if (!match) {
    const existingPins = (members || []).map((m: any) => ({
      id: m.square_team_member_id,
      pin: m.raw?.join_pin || null,
    }));
    return res.status(400).json({
      message: 'Invalid PIN. Please check with your admin.',
      debug: { searchedPin: pin, rowCount: (members || []).length, existingPins },
    });
  }

  const pinCreatedAt = match.raw?.pin_created_at;
  if (pinCreatedAt) {
    const age = Date.now() - new Date(pinCreatedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'This PIN has expired. Ask your admin to generate a new one.' });
    }
  }

  return res.status(200).json({
    name: match.name || '',
    email: match.email || '',
    squareTeamMemberId: match.square_team_member_id,
  });
}

// ─── Join (public — create account with PIN) ────────────────────────────────
async function handleJoin(req: any, res: any) {
  const body = parseBody(req);
  const pin = body?.pin?.trim();
  const email = body?.email?.trim();
  const password = body?.password?.trim();

  if (!pin || !email || !password) {
    return res.status(400).json({ message: 'PIN, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ message: 'Server configuration error.' });

  const { data: members, error: fetchError } = await supabaseAdmin
    .from('square_team_members')
    .select('*')
    .not('raw', 'is', null);

  if (fetchError) return res.status(500).json({ message: 'Failed to look up PIN.' });

  const match = (members || []).find((m: any) => m.raw?.join_pin === pin);
  if (!match) return res.status(400).json({ message: 'Invalid PIN. Please check with your admin.' });

  const pinCreatedAt = match.raw?.pin_created_at;
  if (pinCreatedAt) {
    const age = Date.now() - new Date(pinCreatedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'This PIN has expired. Ask your admin to generate a new one.' });
    }
  }

  const stylistName = match.name || 'Stylist';
  const stylistId = match.square_team_member_id;
  const adminUserId = match.supabase_user_id || null;
  const levelId = match.level_id || match.raw?.level_id || 'lvl_1';
  const permissionOverrides = match.permissions || {};
  const resolvedPermissions = { ...DEFAULT_PERMISSIONS, ...permissionOverrides };

  // If user already exists (e.g. from a previous invite), delete and recreate
  const { data: existingUsers } = await (supabaseAdmin.auth as any).admin.listUsers();
  const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
  if (existingUser) {
    await (supabaseAdmin.auth as any).admin.deleteUser(existingUser.id);
  }

  const { data: createData, error: signUpError } = await (supabaseAdmin.auth as any).admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'stylist',
      stylist_id: stylistId,
      stylist_name: stylistName,
      admin_user_id: adminUserId,
      level_id: levelId,
      permissions: resolvedPermissions,
    },
  });

  if (signUpError) {
    return res.status(400).json({ message: signUpError.message });
  }

  // Clear PIN from the row
  const updatedRaw = { ...match.raw };
  delete updatedRaw.join_pin;
  delete updatedRaw.pin_created_at;
  updatedRaw.joined_at = new Date().toISOString();

  await supabaseAdmin
    .from('square_team_members')
    .update({ email, raw: updatedRaw, updated_at: new Date().toISOString() })
    .eq('square_team_member_id', stylistId);

  // Sign in to get session
  const { data: signInData, error: signInError } = await (supabaseAdmin.auth as any).signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return res.status(200).json({
      message: 'Account created! You can now log in with your email and password.',
      needsManualLogin: true,
      stylistName,
    });
  }

  return res.status(200).json({
    message: 'Welcome to Blueprint Pro!',
    session: signInData.session,
    stylistName,
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);
    const action = body?.action;

    switch (action) {
      case 'generate-pin':
        return handleGeneratePin(req, res);
      case 'verify-pin':
        return handleVerifyPin(req, res);
      case 'join':
        return handleJoin(req, res);
      default:
        return res.status(400).json({ message: `Unknown action: ${action}. Use generate-pin, verify-pin, or join.` });
    }
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error.' });
  }
}

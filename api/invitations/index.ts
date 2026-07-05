import { createClient } from '@supabase/supabase-js';
import { generateRawToken, hashToken, generateClaimCode } from './token-utils.js';
import { log } from '../lib/logger.js';

/**
 * POST /api/invitations
 *
 * Unified invitation endpoint. Routes by `action` field:
 *   - "create"  → creates a client_invitations record
 *   - "resend"  → regenerates activation token for pending invitation
 *   - "revoke"  → revokes a pending invitation
 *
 * AUTHORIZATION (all actions):
 * - Caller must be authenticated with a valid Supabase JWT.
 * - Caller must have an active salon_memberships record (admin or stylist).
 * - salon_id is derived from the caller's verified membership, never from request input.
 *
 * TOKEN SECURITY:
 * - Activation tokens are stored as SHA-256 hashes. The raw token is only
 *   returned in the activation link and never stored in plaintext.
 */

const CLIENT_APP_URL = process.env.BLUEPRINT_CLIENT_URL || 'https://blueprint-client.vercel.app';

function parseBody(req: any) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = undefined; }
  }
  return body;
}

async function verifyCaller(req: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return { error: { status: 500, message: 'Server configuration error' } };
  }

  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { status: 401, message: 'Missing authorization header' } };
  }

  const bearer = authHeader.slice(7);

  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { data: userData, error: authError } = await (supabaseAnon.auth as any).getUser(bearer);
  if (authError || !userData?.user) {
    return { error: { status: 401, message: 'Invalid or expired token' } };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('salon_memberships')
    .select('salon_id, role, status')
    .eq('user_id', userData.user.id)
    .in('role', ['admin', 'stylist', 'owner'])
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: { status: 403, message: 'No active salon membership found for this account' } };
  }

  return {
    callerUserId: userData.user.id,
    callerRole: userData.user.user_metadata?.role,
    salonId: membership.salon_id,
    supabaseAdmin,
  };
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
async function handleCreate(req: any, res: any) {
  const ctx = await verifyCaller(req);
  if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

  const { callerUserId, callerRole, salonId, supabaseAdmin } = ctx as any;

  if (callerRole !== 'admin' && callerRole !== 'stylist' && callerRole !== 'owner') {
    return res.status(403).json({ message: 'Only salon admins or stylists can create invitations' });
  }

  const body = parseBody(req);
  const { plan_id, invite_email, invite_name, invite_phone } = body;

  if (!plan_id || !invite_email || !invite_name) {
    return res.status(400).json({
      message: 'Missing required fields: plan_id, invite_email, invite_name',
    });
  }

  // Verify the plan exists
  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, client_id')
    .eq('id', plan_id)
    .maybeSingle();

  if (planError || !plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  // Verify the plan belongs to the caller's salon
  // Primary: check client.salon_id matches caller's salonId
  // Fallback: if client.salon_id is null, check supabase_user_id === salon.owner_user_id
  if (plan.client_id) {
    const { data: planClient } = await supabaseAdmin
      .from('clients')
      .select('salon_id, supabase_user_id')
      .eq('id', plan.client_id)
      .maybeSingle();

    if (!planClient) {
      return res.status(403).json({ message: 'This plan does not belong to your salon' });
    }

    // Primary path: salon_id match
    if (planClient.salon_id && planClient.salon_id === salonId) {
      // Verified — client belongs to caller's salon
    } else if (planClient.salon_id === null) {
      // Fallback: client has no salon_id yet, check via owner_user_id
      console.warn(`[FALLBACK:invitations:ownership] client_id=${plan.client_id} has no salon_id, falling back to salons.owner_user_id`);
      const { data: salon } = await supabaseAdmin
        .from('salons')
        .select('owner_user_id')
        .eq('id', salonId)
        .maybeSingle();

      if (!salon?.owner_user_id || planClient.supabase_user_id !== salon.owner_user_id) {
        return res.status(403).json({ message: 'This plan does not belong to your salon' });
      }
    } else {
      // client.salon_id is set but doesn't match caller's salon
      return res.status(403).json({ message: 'This plan does not belong to your salon' });
    }
  }

  // Stylist-specific: verify they have permission to send invites
  if (callerRole === 'stylist') {
    const { data: stylistRecord } = await supabaseAdmin
      .from('square_team_members')
      .select('permissions')
      .eq('supabase_user_id', callerUserId)
      .maybeSingle();

    const permissions = stylistRecord?.permissions;
    if (permissions && !permissions.viewClientContact) {
      return res.status(403).json({ message: 'You do not have permission to send client invitations' });
    }
  }

  // Resolve provider_customer_id from the client's external_id
  const clientDbId = plan.client_id;
  let providerCustomerId: string | null = null;

  if (clientDbId) {
    const { data: clientRow } = await supabaseAdmin
      .from('clients')
      .select('external_id')
      .eq('id', clientDbId)
      .maybeSingle();

    if (clientRow?.external_id) {
      providerCustomerId = clientRow.external_id;
    }
  }

  // Check for existing pending invitation (idempotency)
  // Match by plan_id, not just email — two different clients/plans must
  // never share an invitation even if they happen to have the same email.
  const { data: existingInvite } = await supabaseAdmin
    .from('client_invitations')
    .select('id, status, created_at, claim_code')
    .eq('salon_id', salonId)
    .eq('plan_id', plan_id)
    .eq('status', 'pending')
    .maybeSingle();

  // Rate-limit: if an invitation was created in the last 60 seconds, reject
  if (existingInvite) {
    const createdAgo = Date.now() - new Date(existingInvite.created_at).getTime();
    if (createdAgo < 60_000) {
      log('INVITE_RATE_LIMITED', { salonId, inviteEmail: invite_email, createdAgo });
      return res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'An invitation was just created for this client. Please wait before creating another.',
      });
    }
  }

  if (existingInvite) {
    log('INVITE_REGENERATE', { salonId, inviteEmail: invite_email, existingId: existingInvite.id });
    const rawToken = generateRawToken();
    const hashedToken = hashToken(rawToken);
    // Reuse existing claim code if present so previously-shared codes stay valid.
    // Only generate a new one for legacy invitations that predate the claim_code column.
    const reusedClaimCode = existingInvite.claim_code || generateClaimCode();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('client_invitations')
      .update({
        activation_token: hashedToken,
        activation_expires_at: newExpiresAt,
        provider_customer_id: providerCustomerId,
        invited_by_user_id: callerUserId,
        claim_code: reusedClaimCode,
        // Always refresh name/email from the latest client data so stale
        // info (e.g. from a duplicate-email situation) gets corrected.
        invite_name: invite_name,
        invite_email: invite_email,
        invite_phone: invite_phone || null,
      })
      .eq('id', existingInvite.id);

    if (updateError) {
      console.error('[INVITATION CREATE] Update existing error:', updateError);
      return res.status(500).json({ message: 'Failed to regenerate existing invitation' });
    }

    const activationLink = `${CLIENT_APP_URL}/activate?token=${rawToken}`;
    return res.status(200).json({
      id: existingInvite.id,
      activation_link: activationLink,
      claim_code: reusedClaimCode,
      provider_customer_id: providerCustomerId,
      booking_eligible: !!providerCustomerId,
      message: providerCustomerId
        ? 'Existing pending invitation found. A new link has been generated — share this with the client.'
        : 'Existing pending invitation found, but booking will be unavailable until provider linkage is completed.',
      is_existing: true,
    });
  }

  // Create the invitation record with hashed token
  const rawToken = generateRawToken();
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const claimCode = generateClaimCode();

  const { data: invitation, error: insertError } = await supabaseAdmin
    .from('client_invitations')
    .insert({
      salon_id: salonId,
      plan_id,
      invited_by_user_id: callerUserId,
      invite_email,
      invite_name,
      invite_phone: invite_phone || null,
      activation_token: hashedToken,
      activation_expires_at: expiresAt,
      provider_customer_id: providerCustomerId,
      claim_code: claimCode,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[INVITATION CREATE] Insert error:', insertError);
    return res.status(500).json({ message: 'Failed to create invitation' });
  }

  log('INVITE_CREATED', { invitationId: invitation.id, salonId, planId: plan_id, bookingEligible: !!providerCustomerId });

  const activationLink = `${CLIENT_APP_URL}/activate?token=${rawToken}`;

  return res.status(201).json({
    code: 'INVITATION_CREATED',
    id: invitation.id,
    activation_link: activationLink,
    claim_code: claimCode,
    provider_customer_id: providerCustomerId,
    booking_eligible: !!providerCustomerId,
    message: providerCustomerId
      ? 'Invitation created. Share this link with the client — they will be able to book appointments after activation.'
      : 'Invitation created, but booking will be unavailable until provider linkage is completed. Link a Square customer to this client first, then resend the invitation.',
    is_existing: false,
  });
}

// ─── RESEND ──────────────────────────────────────────────────────────────────
async function handleResend(req: any, res: any) {
  const ctx = await verifyCaller(req);
  if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

  const { callerUserId, salonId: callerSalonId, supabaseAdmin } = ctx as any;

  const body = parseBody(req);
  const { invitation_id } = body;

  if (!invitation_id) {
    return res.status(400).json({ message: 'Missing required field: invitation_id' });
  }

  // Load the existing invitation
  const { data: invitation, error: findError } = await supabaseAdmin
    .from('client_invitations')
    .select('id, salon_id, plan_id, invite_email, invite_name, invite_phone, status, provider_customer_id')
    .eq('id', invitation_id)
    .maybeSingle();

  if (findError || !invitation) {
    return res.status(404).json({ message: 'Invitation not found' });
  }

  if (invitation.status !== 'pending') {
    return res.status(400).json({ code: 'INVALID_STATUS', message: `Cannot resend invitation with status '${invitation.status}'. Only pending invitations can be resent.` });
  }

  // Verify the invitation belongs to the caller's salon
  if (invitation.salon_id !== callerSalonId) {
    log('INVITE_RESEND_SALON_MISMATCH', { callerSalonId, invitationSalonId: invitation.salon_id });
    return res.status(403).json({ code: 'SALON_MISMATCH', message: 'This invitation does not belong to your salon' });
  }

  // Re-resolve provider_customer_id
  let providerCustomerId = invitation.provider_customer_id;

  if (invitation.plan_id) {
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('client_id')
      .eq('id', invitation.plan_id)
      .maybeSingle();

    if (plan?.client_id) {
      const { data: clientRow } = await supabaseAdmin
        .from('clients')
        .select('external_id')
        .eq('id', plan.client_id)
        .maybeSingle();

      if (clientRow?.external_id) {
        providerCustomerId = clientRow.external_id;
      }
    }
  }

  // Generate new hashed token, new claim code, and extend expiry
  const rawToken = generateRawToken();
  const hashedToken = hashToken(rawToken);
  const newClaimCode = generateClaimCode();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('client_invitations')
    .update({
      activation_token: hashedToken,
      activation_expires_at: newExpiresAt,
      provider_customer_id: providerCustomerId,
      claim_code: newClaimCode,
    })
    .eq('id', invitation.id);

  if (updateError) {
    log('INVITE_RESEND_FAILED', { invitationId: invitation.id, error: updateError.message });
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to regenerate invitation' });
  }

  log('INVITE_RESENT', { invitationId: invitation.id, salonId: callerSalonId, bookingEligible: !!providerCustomerId });

  const activationLink = `${CLIENT_APP_URL}/activate?token=${rawToken}`;

  return res.status(200).json({
    code: 'INVITATION_RESENT',
    id: invitation.id,
    activation_link: activationLink,
    claim_code: newClaimCode,
    provider_customer_id: providerCustomerId,
    booking_eligible: !!providerCustomerId,
    message: providerCustomerId
      ? 'Invitation resent with new link. The client will be able to book appointments after activation.'
      : 'Invitation resent, but booking will remain unavailable until provider linkage is completed.',
  });
}

// ─── REVOKE ──────────────────────────────────────────────────────────────────
async function handleRevoke(req: any, res: any) {
  const ctx = await verifyCaller(req);
  if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

  const { salonId: callerSalonId, supabaseAdmin } = ctx as any;

  const body = parseBody(req);
  const { invitation_id } = body;

  if (!invitation_id) {
    return res.status(400).json({ message: 'Missing required field: invitation_id' });
  }

  // Load the invitation
  const { data: invitation, error: findError } = await supabaseAdmin
    .from('client_invitations')
    .select('id, salon_id, status')
    .eq('id', invitation_id)
    .maybeSingle();

  if (findError || !invitation) {
    return res.status(404).json({ message: 'Invitation not found' });
  }

  if (invitation.status !== 'pending') {
    return res.status(400).json({
      code: 'INVALID_STATUS',
      message: `Cannot revoke invitation with status '${invitation.status}'. Only pending invitations can be revoked.`,
    });
  }

  // Verify the invitation belongs to the caller's salon
  if (invitation.salon_id !== callerSalonId) {
    log('INVITE_REVOKE_SALON_MISMATCH', { callerSalonId, invitationSalonId: invitation.salon_id });
    return res.status(403).json({ code: 'SALON_MISMATCH', message: 'This invitation does not belong to your salon' });
  }

  // Revoke
  const { error: updateError } = await supabaseAdmin
    .from('client_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitation.id);

  if (updateError) {
    log('INVITE_REVOKE_FAILED', { invitationId: invitation.id, error: updateError.message });
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to revoke invitation' });
  }

  log('INVITE_REVOKED', { invitationId: invitation.id, salonId: callerSalonId });

  return res.status(200).json({
    code: 'INVITATION_REVOKED',
    id: invitation.id,
    status: 'revoked',
    message: 'Invitation revoked. The activation link is no longer valid.',
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
      case 'create':
        return handleCreate(req, res);
      case 'resend':
        return handleResend(req, res);
      case 'revoke':
        return handleRevoke(req, res);
      default:
        return res.status(400).json({ message: `Unknown action: ${action}. Use create, resend, or revoke.` });
    }
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error.' });
  }
}

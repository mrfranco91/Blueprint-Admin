import { createClient } from '@supabase/supabase-js';

/**
 * /api/stylist-data
 * 
 * Reads services, clients, and team members from Supabase for a stylist's admin.
 * No Square API calls — just reads what the admin already synced.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ message: 'Supabase config missing.' });
    }

    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Identify the calling user
    const userIdHeader = req.headers['x-user-id'] as string | undefined;
    if (!userIdHeader) {
      return res.status(401).json({ message: 'Missing X-User-Id header.' });
    }

    // Get the stylist's auth record to find their admin
    const { data: userData, error: userError } = await (supabaseAdmin.auth as any).admin.getUserById(userIdHeader);
    if (userError || !userData?.user) {
      return res.status(401).json({ message: 'Could not resolve user.' });
    }

    const userMeta = userData.user.user_metadata || {};
    const stylistSquareId = userMeta.stylist_id;
    const userRole = userMeta.role;
    let adminUserId = userMeta.admin_user_id;

    // Fallback 1: resolve admin via square_team_members.supabase_user_id
    if (!adminUserId && stylistSquareId) {
      const { data: tmRow } = await supabaseAdmin
        .from('square_team_members')
        .select('supabase_user_id, merchant_id')
        .eq('square_team_member_id', stylistSquareId)
        .maybeSingle();
      adminUserId = tmRow?.supabase_user_id || null;

      // Fallback 2: if supabase_user_id not set on the row, resolve via merchant_id → merchant_settings
      if (!adminUserId && tmRow?.merchant_id) {
        const { data: msRow } = await supabaseAdmin
          .from('merchant_settings')
          .select('supabase_user_id')
          .eq('id', tmRow.merchant_id)
          .maybeSingle();
        adminUserId = msRow?.supabase_user_id || null;
        if (adminUserId) {
          console.log(`[STYLIST-DATA] Resolved admin via merchant_settings (merchant_id: ${tmRow.merchant_id})`);
        }
      }
    }

    // Fallback 3: client user — resolve admin via clients table → salon owner
    if (!adminUserId && userRole === 'client') {
      console.log(`[STYLIST-DATA] No stylist metadata, checking client→admin path`);
      const { data: clientRow } = await supabaseAdmin
        .from('clients')
        .select('salon_id')
        .eq('supabase_user_id', userIdHeader)
        .maybeSingle();

      if (clientRow?.salon_id) {
        const { data: salonOwner } = await supabaseAdmin
          .from('salons')
          .select('owner_user_id')
          .eq('id', clientRow.salon_id)
          .maybeSingle();

        if (salonOwner?.owner_user_id) {
          adminUserId = salonOwner.owner_user_id;
          console.log(`[STYLIST-DATA] Resolved admin via client→salon owner: ${adminUserId}`);
        }
      }

      // Fallback: try salon_memberships
      if (!adminUserId) {
        const { data: membership } = await supabaseAdmin
          .from('salon_memberships')
          .select('salon_id')
          .eq('user_id', userIdHeader)
          .maybeSingle();

        if (membership?.salon_id) {
          const { data: ownerMembership } = await supabaseAdmin
            .from('salon_memberships')
            .select('user_id')
            .eq('salon_id', membership.salon_id)
            .eq('role', 'owner')
            .maybeSingle();

          if (ownerMembership?.user_id) {
            adminUserId = ownerMembership.user_id;
            console.log(`[STYLIST-DATA] Resolved admin via client→salon membership: ${adminUserId}`);
          }
        }
      }
    }

    if (!adminUserId) {
      return res.status(404).json({
        message: 'Could not determine your admin. Contact your salon admin.',
        debug: { stylistSquareId, userMeta },
      });
    }

    console.log(`[STYLIST-DATA] Stylist ${userIdHeader} → Admin ${adminUserId}`);

    // ── Resolve salonId from admin's salon row ──
    let salonId: string | null = null;
    const { data: salonRow, error: salonErr } = await supabaseAdmin
      .from('salons')
      .select('id')
      .eq('owner_user_id', adminUserId)
      .maybeSingle();
    salonId = salonRow?.id || null;
    console.log(`[STYLIST-DATA] salonId resolved: ${salonId}`, salonErr ? `(error: ${salonErr.message})` : '');

    // ── Fetch services ──
    let services: any[] | null = null;
    if (salonId) {
      const { data, error: svcErr } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('salon_id', salonId)
        .eq('source', 'square');
      if (svcErr) console.error('[STYLIST-DATA] Services query error (salon_id):', svcErr);
      services = data;
    }
    if (!services || services.length === 0) {
      console.warn(`[FALLBACK:stylist-data:services] salon_id=${salonId} returned 0 rows, falling back to supabase_user_id=${adminUserId}`);
      const { data, error: svcErr } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('source', 'square')
        .contains('metadata', { admin_user_id: adminUserId });
      if (svcErr) console.error('[STYLIST-DATA] Services query error (fallback):', svcErr);
      services = data;
    }

    // ── Fetch clients ──
    // Query by both salon_id AND supabase_user_id to tolerate any scoping gap
    let clients: any[] | null = null;
    if (salonId) {
      const { data, error: clientErr } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('salon_id', salonId);
      if (clientErr) console.error('[STYLIST-DATA] Clients query error (salon_id):', clientErr);
      console.log(`[STYLIST-DATA] Clients by salon_id=${salonId}: ${data?.length ?? 'null'} rows`);
      clients = data;
    }
    // Also fetch by supabase_user_id and merge (avoids gaps from salon_id mismatches)
    const { data: legacyClients, error: legacyErr } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('supabase_user_id', adminUserId);
    if (legacyErr) console.error('[STYLIST-DATA] Clients query error (supabase_user_id):', legacyErr);
    console.log(`[STYLIST-DATA] Clients by supabase_user_id=${adminUserId}: ${legacyClients?.length ?? 'null'} rows`);

    // Merge: prefer salon_id rows, add any supabase_user_id rows not already included
    if (clients && clients.length > 0 && legacyClients && legacyClients.length > 0) {
      const clientIds = new Set(clients.map((c: any) => c.id));
      const extras = legacyClients.filter((c: any) => !clientIds.has(c.id));
      if (extras.length > 0) {
        console.warn(`[FALLBACK:stylist-data:clients] merged ${extras.length} extra rows from supabase_user_id path`);
        clients = [...clients, ...extras];
      }
    } else if ((!clients || clients.length === 0) && legacyClients && legacyClients.length > 0) {
      console.warn(`[FALLBACK:stylist-data:clients] salon_id=${salonId} returned 0 rows, using supabase_user_id=${adminUserId} (${legacyClients.length} rows)`);
      clients = legacyClients;
    }

    // ── Fetch team members ──
    let team: any[] | null = null;
    if (salonId) {
      const { data, error: teamErr } = await supabaseAdmin
        .from('square_team_members')
        .select('*')
        .eq('salon_id', salonId);
      if (teamErr) console.error('[STYLIST-DATA] Team query error (salon_id):', teamErr);
      team = data;
    }
    if (!team || team.length === 0) {
      console.warn(`[FALLBACK:stylist-data:team] salon_id=${salonId} returned 0 rows, falling back to supabase_user_id=${adminUserId}`);
      const { data, error: teamErr } = await supabaseAdmin
        .from('square_team_members')
        .select('*')
        .eq('supabase_user_id', adminUserId);
      if (teamErr) console.error('[STYLIST-DATA] Team query error (fallback):', teamErr);
      team = data;
    }

    console.log(`[STYLIST-DATA] Results: ${services?.length || 0} services, ${clients?.length || 0} clients, ${team?.length || 0} team members`);

    return res.status(200).json({
      adminUserId,
      services: services || [],
      clients: clients || [],
      team: team || [],
    });
  } catch (e: any) {
    console.error('[STYLIST-DATA] Fatal error:', e);
    return res.status(500).json({ message: e.message });
  }
}

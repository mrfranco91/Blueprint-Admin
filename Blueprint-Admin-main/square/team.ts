import { supabase } from '../lib/supabase';

const SQUARE_API_BASE = 'https://connect.squareup.com/v2';

/**
 * Sync Square Team Members into Supabase.
 * - Safe if merchant has zero team members.
 * - Non-blocking: returns [] on failure.
 * - Assumes `square_team_members` table already exists in Supabase.
 */
export async function syncSquareTeamMembers(
  accessToken: string,
  merchantId: string
) {
  if (!accessToken || !merchantId) {
    console.warn('[Square Team Sync] Missing accessToken or merchantId');
    return [];
  }

  let response: Response;
  try {
    response = await fetch(`${SQUARE_API_BASE}/team-members/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2023-10-20',
        'Content-Type': 'application/json',
      },
      // Empty search body is valid; can be extended later for pagination/filters
      body: JSON.stringify({}),
    });
  } catch (networkError) {
    console.error('[Square Team Sync] Network error', networkError);
    return [];
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[Square Team Sync] Square API error', response.status, text);
    return [];
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch (parseError) {
    console.error('[Square Team Sync] Failed to parse Square response', parseError);
    return [];
  }

  const members = payload?.team_members ?? [];
  if (!Array.isArray(members) || members.length === 0) {
    // Valid state: solo operator / no team
    return [];
  }

  const rows = members.map((m: any) => ({
    merchant_id: merchantId,
    square_team_member_id: m.id,

    name: `${m.given_name ?? ''} ${m.family_name ?? ''}`.trim() || 'Team Member',
    given_name: m.given_name ?? null,
    family_name: m.family_name ?? null,

    email: m.email_address ?? null,
    phone: m.phone_number ?? null,
    role: m.role ?? null,

    status: m.status ?? null,
    is_owner: m.is_owner ?? false,

    raw: m,
    updated_at: new Date().toISOString(),
  }));

  // Non-blocking: if Supabase write fails, log and return rows fetched from Square
  const { error } = await supabase
    .from('square_team_members')
    .upsert(rows as any, { onConflict: 'square_team_member_id' });

  if (error) {
    console.error('[Square Team Sync] Supabase upsert failed', error);
    return rows;
  }

  return rows;
}

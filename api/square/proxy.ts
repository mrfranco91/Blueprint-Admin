import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const path = typeof req.query?.path === 'string' ? req.query.path : '';
    if (!path || !path.startsWith('/')) {
      return res.status(400).json({
        message:
          "Missing or invalid 'path' query param. Example: /api/square/proxy?path=/v2/customers",
      });
    }

    const env = (process.env.VITE_SQUARE_ENV || 'production').toLowerCase();
    const squareBase =
      env === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    let squareAccessToken: string | undefined =
      (req.headers['x-square-access-token'] as string | undefined) ||
      (req.headers['x-square-access-token'.toLowerCase()] as
        | string
        | undefined);

    // 🔑 FIX: Load access token from merchant_settings (authoritative schema)
    if (!squareAccessToken && process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Try X-User-Id header first (lightweight, avoids Vercel 494 header size limit)
      const userIdHeader = req.headers['x-user-id'] as string | undefined;

      // Fall back to Bearer JWT if no X-User-Id
      const authHeader = req.headers['authorization'] as string | undefined;
      const bearer = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

      let userId = userIdHeader;

      // If we have a bearer token but no user ID header, resolve user from JWT
      if (!userId && bearer) {
        const { data: userData, error: userErr } =
          await (supabaseAdmin.auth as any).getUser(bearer);
        if (!userErr && userData?.user?.id) {
          userId = userData.user.id;
        } else {
          console.log(`[SQUARE PROXY] Auth lookup failed:`, { userErr });
        }
      }

      if (userId) {
        // 1. Try caller's own merchant_settings (admin path)
        const { data: ms } = await supabaseAdmin
          .from('merchant_settings')
          .select('square_access_token')
          .eq('supabase_user_id', userId)
          .maybeSingle();

        console.log(`[SQUARE PROXY] Supabase lookup for user ${userId}:`, { found: !!ms, hasToken: !!ms?.square_access_token });
        if (ms?.square_access_token) {
          squareAccessToken = ms.square_access_token;
          console.log(`[SQUARE PROXY] Using token from own merchant_settings`);
        } else {
          // 2. Caller might be a stylist — resolve admin's token via metadata/square_team_members
          console.log(`[SQUARE PROXY] No own merchant_settings, checking stylist→admin path`);
          const { data: userData } = await (supabaseAdmin.auth as any).admin.getUserById(userId);
          const stylistSquareId = userData?.user?.user_metadata?.stylist_id;
          const userRole = userData?.user?.user_metadata?.role;
          let resolvedAdminId = userData?.user?.user_metadata?.admin_user_id;

          if (!resolvedAdminId && stylistSquareId) {
            const { data: tmRow } = await supabaseAdmin
              .from('square_team_members')
              .select('supabase_user_id')
              .eq('square_team_member_id', stylistSquareId)
              .maybeSingle();
            resolvedAdminId = tmRow?.supabase_user_id;
            console.log(`[SQUARE PROXY] Resolved admin from square_team_members:`, resolvedAdminId);
          }

          if (resolvedAdminId) {
            const { data: adminMs } = await supabaseAdmin
              .from('merchant_settings')
              .select('square_access_token')
              .eq('supabase_user_id', resolvedAdminId)
              .maybeSingle();

            if (adminMs?.square_access_token) {
              squareAccessToken = adminMs.square_access_token;
              console.log(`[SQUARE PROXY] Using token from admin merchant_settings (admin: ${resolvedAdminId})`);
            }
          }

          // 3. Caller might be a client — resolve admin via clients table
          if (!squareAccessToken && userRole === 'client') {
            console.log(`[SQUARE PROXY] No stylist path resolved, checking client→admin path`);
            const { data: clientRow } = await supabaseAdmin
              .from('clients')
              .select('salon_id')
              .eq('supabase_user_id', userId)
              .maybeSingle();

            if (clientRow?.salon_id) {
              const { data: salonOwner } = await supabaseAdmin
                .from('salons')
                .select('owner_user_id')
                .eq('id', clientRow.salon_id)
                .maybeSingle();

              if (salonOwner?.owner_user_id) {
                const { data: ownerMs } = await supabaseAdmin
                  .from('merchant_settings')
                  .select('square_access_token')
                  .eq('supabase_user_id', salonOwner.owner_user_id)
                  .maybeSingle();

                if (ownerMs?.square_access_token) {
                  squareAccessToken = ownerMs.square_access_token;
                  console.log(`[SQUARE PROXY] Using token from salon owner merchant_settings (owner: ${salonOwner.owner_user_id})`);
                }
              }
            }

            // Fallback: try salon_memberships if no salon_id on client row
            if (!squareAccessToken) {
              const { data: membership } = await supabaseAdmin
                .from('salon_memberships')
                .select('salon_id')
                .eq('user_id', userId)
                .maybeSingle();

              if (membership?.salon_id) {
                const { data: ownerMembership } = await supabaseAdmin
                  .from('salon_memberships')
                  .select('user_id')
                  .eq('salon_id', membership.salon_id)
                  .eq('role', 'owner')
                  .maybeSingle();

                if (ownerMembership?.user_id) {
                  const { data: ownerMs } = await supabaseAdmin
                    .from('merchant_settings')
                    .select('square_access_token')
                    .eq('supabase_user_id', ownerMembership.user_id)
                    .maybeSingle();

                  if (ownerMs?.square_access_token) {
                    squareAccessToken = ownerMs.square_access_token;
                    console.log(`[SQUARE PROXY] Using token from salon membership owner (owner: ${ownerMembership.user_id})`);
                  }
                }
              }
            }
          }
        }
      } else {
        console.log(`[SQUARE PROXY] No user ID available from headers`);
      }
    }

    if (!squareAccessToken) {
      squareAccessToken = process.env.VITE_SQUARE_ACCESS_TOKEN;
      console.log(`[SQUARE PROXY] Using token from environment variable`);
    }

    if (!squareAccessToken) {
      return res.status(401).json({
        message:
          'Square access token not available for proxy request. Reconnect Square in Settings and try again.',
      });
    }

    console.log(`[SQUARE PROXY] Token source determined, proceeding with request`);

    const url = `${squareBase}${path}`;
    const method = (req.method || 'GET').toUpperCase();
    const hasBody =
      method !== 'GET' && method !== 'HEAD' && method !== 'DELETE';

    // Handle body - it might be a string from squareIntegration.ts or parsed object
    let requestBody = undefined;
    if (hasBody) {
      if (typeof req.body === 'string') {
        requestBody = JSON.parse(req.body);
      } else {
        requestBody = req.body;
      }
    }

    console.log(`[SQUARE PROXY] ${method} ${url}`);
    if (requestBody) {
        console.log(`[SQUARE PROXY] Request body:`);
        console.log(JSON.stringify(requestBody, null, 2));
    }

    const squareResp = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2025-10-16',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const text = await squareResp.text();
    let payload: any;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    console.log(`[SQUARE PROXY] Response status: ${squareResp.status}`);
    console.log(`[SQUARE PROXY] Response:`, JSON.stringify(payload, null, 2));

    return res.status(squareResp.status).json(payload);
  } catch (e: any) {
    console.error('Square proxy error:', e);
    return res
      .status(500)
      .json({ message: e?.message || 'Square proxy failed' });
  }
}

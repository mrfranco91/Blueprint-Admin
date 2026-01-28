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
    if (!squareAccessToken) {
      const authHeader = req.headers['authorization'] as string | undefined;
      const bearer = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

      if (
        bearer &&
        process.env.VITE_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        const supabaseAdmin = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
        const { data: userData, error: userErr } =
          await (supabaseAdmin.auth as any).getUser(bearer);

        const userId = userData?.user?.id;

        if (!userErr && userId) {
          const { data: ms } = await supabaseAdmin
            .from('merchant_settings')
            .select('square_access_token')
            .eq('supabase_user_id', userId)
            .maybeSingle();

          console.log(`[SQUARE PROXY] Supabase lookup for user ${userId}:`, { found: !!ms, hasToken: !!ms?.square_access_token });
          if (ms?.square_access_token) {
            squareAccessToken = ms.square_access_token;
            console.log(`[SQUARE PROXY] Using token from Supabase merchant_settings`);
          }
        } else {
          console.log(`[SQUARE PROXY] Auth lookup failed:`, { userErr, userId });
        }
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

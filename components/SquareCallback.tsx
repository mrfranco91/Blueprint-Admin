import { useEffect, useRef, useState } from 'react';

export default function SquareCallback() {
  const hasRun = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      setError('Missing authorization code from Square.');
      return;
    }

    console.log('OAuth callback: handling full OAuth flow');

    (async () => {
      try {
        // Step 1: Exchange OAuth code for Square access token
        const tokenRes = await fetch('/api/square/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
          throw new Error(tokenData?.message || 'Square login failed');
        }

        const { access_token: squareToken, merchant_id, supabase_session } = tokenData;

        if (!squareToken) {
          throw new Error('No Square access token received');
        }

        if (!supabase_session?.access_token) {
          throw new Error('No Supabase session received from server');
        }

        // Step 2: Use the session tokens from the server (no re-authentication needed)
        const { supabase } = await import('../lib/supabase');

        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        // Clear any mock user session before setting real session
        localStorage.removeItem('mock_admin_user');

        console.log('[OAuth Callback] Setting Supabase session...');

        // Set the session in Supabase client
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: supabase_session.access_token,
          refresh_token: supabase_session.refresh_token,
        });

        if (setSessionError) {
          throw new Error(`Failed to set session: ${setSessionError.message}`);
        }

        // Give the browser a moment to persist the session to localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify session was set
        const { data: sessionCheck, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) {
          console.error('[OAuth Callback] Error checking session:', getSessionError);
        }
        if (!sessionCheck?.session) {
          console.error('[OAuth Callback] Session check failed. Session data:', sessionCheck);
          throw new Error('Failed to set Supabase session');
        }

        console.log('[OAuth Callback] Session verified. User ID:', sessionCheck.session.user.id);

        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            role: 'admin',
            merchant_id,
            business_name,
          },
        });

        if (metadataError) {
          throw new Error(`Failed to finalize admin access: ${metadataError.message}`);
        }

        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.warn('[OAuth Callback] Failed to refresh session metadata:', refreshError.message);
        } else if (!refreshedSession?.session) {
          console.warn('[OAuth Callback] Refresh session returned no session data.');
        }
        const jwtToken = supabase_session.access_token;

        // Step 3: Sync team and clients (non-blocking - don't wait for these to complete)
        console.log('[OAuth Callback] Syncing team and clients...');

        fetch('/api/square/team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ squareAccessToken: squareToken }),
        }).catch(err => console.warn('[OAuth Callback] Team sync failed:', err));

        fetch('/api/square/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ squareAccessToken: squareToken }),
        }).catch(err => console.warn('[OAuth Callback] Clients sync failed:', err));

        console.log('[OAuth Callback] Redirecting to /admin');

        // Use regular redirect instead of replace to ensure session is persisted
        window.location.href = '/admin';
      } catch (err) {
        console.error('OAuth callback failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Connecting Square…</h2>
      <p>Please wait. This may take a moment.</p>
      {error && (
        <p style={{ color: 'red', marginTop: 16 }}>
          {error}
        </p>
      )}
    </div>
  );
}

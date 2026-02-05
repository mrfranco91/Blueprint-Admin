import { useEffect, useRef, useState } from 'react';

export default function SquareCallback() {
  const hasRun = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [squareTokenData, setSquareTokenData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTokenExchange = async (emailValue?: string) => {
    try {
      const body: any = {};

      // First attempt: use code
      if (!squareTokenData && code) {
        body.code = code;
      }

      // Retry with email: use saved token data
      if (squareTokenData) {
        body.email = emailValue;
        body.access_token = squareTokenData.access_token;
        body.merchant_id = squareTokenData.merchant_id;
      }

      if (emailValue && !squareTokenData) {
        body.email = emailValue;
      }

      // Step 1: Exchange OAuth code for Square access token
      const tokenRes = await fetch('/api/square/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        // Check if email is needed
        if (tokenData?.needsEmail) {
          // Save the token data so we can use it when retrying with email
          setSquareTokenData({
            access_token: tokenData.access_token,
            merchant_id: tokenData.merchant_id,
          });
          setNeedsEmail(true);
          return;
        }
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
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');

    if (!codeParam) {
      setError('Missing authorization code from Square.');
      return;
    }

    setCode(codeParam);
    console.log('OAuth callback: handling full OAuth flow');
    handleTokenExchange();
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    await handleTokenExchange(email);
  };

  if (needsEmail) {
    return (
      <div style={{ padding: 24, maxWidth: 400 }}>
        <h2>Complete Authentication</h2>
        <p>We couldn't find an email associated with your Square account. Please provide one to continue:</p>
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              marginBottom: 12,
              border: '1px solid #ccc',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: 8,
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: isSubmitting ? 'default' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? 'Authenticating...' : 'Continue'}
          </button>
        </form>
        {error && (
          <p style={{ color: 'red', marginTop: 16 }}>
            {error}
          </p>
        )}
      </div>
    );
  }

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

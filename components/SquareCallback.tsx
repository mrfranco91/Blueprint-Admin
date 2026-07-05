import { useEffect, useRef, useState } from 'react';

export default function SquareCallback() {
  const hasRun = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [squareTokenData, setSquareTokenData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTokenExchange = async (emailValue?: string, codeOverride?: string) => {
    try {
      const body: any = {};

      // Retry with email: use saved token data (never send code again - it's single-use!)
      if (squareTokenData) {
        console.log('Retrying with email using saved token data');
        body.email = emailValue;
        body.access_token = squareTokenData.access_token;
        body.merchant_id = squareTokenData.merchant_id;
      } else {
        // First attempt: only use code (prefer override since React state may be stale)
        body.code = codeOverride || code;
        if (emailValue) {
          body.email = emailValue;
        }
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

      const { access_token: squareToken, merchant_id, supabase_auth, salon_id: oauthSalonId } = tokenData;

      if (!squareToken) {
        throw new Error('No Square access token received');
      }

      if (!supabase_auth?.email || !supabase_auth?.password) {
        throw new Error('No Supabase credentials received from server');
      }

      // Step 2: Sign in on the client side to get a proper session with valid refresh tokens
      const { supabase } = await import('../lib/supabase');

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Clear any stale auth tokens and mock sessions before signing in
      // This prevents QuotaExceededError if a previous session had an oversized JWT
      localStorage.removeItem('mock_admin_user');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });

      console.log('[OAuth Callback] Signing in with Supabase...');

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: supabase_auth.email,
        password: supabase_auth.password,
      });

      if (signInError) {
        throw new Error(`Failed to sign in: ${signInError.message}`);
      }

      const session = signInData?.session;
      if (!session) {
        throw new Error('No session returned from sign-in');
      }

      console.log('[OAuth Callback] Session created. User ID:', session.user.id);

      const userId = session.user.id;

      // Step 3: Sync team, clients, and services via consolidated /api/square/sync
      console.log('[OAuth Callback] Syncing team, clients, and services...');

      const syncHeaders = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };

      const syncActions = ['team', 'clients', 'services'] as const;
      const syncResults: Record<string, { ok: boolean; data?: any; error?: string }> = {};

      for (const action of syncActions) {
        try {
          const res = await fetch('/api/square/sync', {
            method: 'POST',
            headers: syncHeaders,
            body: JSON.stringify({ action, squareAccessToken: squareToken, salon_id: oauthSalonId }),
          });
          const json = await res.json();
          syncResults[action] = { ok: res.ok, data: json };
          if (!res.ok) {
            console.error(`[OAuth Callback] ❌ ${action} sync failed:`, json.message || res.status);
          } else {
            console.log(`[OAuth Callback] ✅ ${action} sync ok:`, JSON.stringify(json).substring(0, 120));
          }
        } catch (err) {
          syncResults[action] = { ok: false, error: String(err) };
          console.error(`[OAuth Callback] ❌ ${action} sync error:`, err);
        }
      }

      const failedActions = syncActions.filter(a => !syncResults[a]?.ok);
      if (failedActions.length > 0) {
        console.error('[OAuth Callback] ⚠️ Bootstrap sync failures:', failedActions);
        // Continue to /admin anyway — SettingsContext will retry on load
      }

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
    console.log('OAuth callback: handling full OAuth flow with code:', codeParam.substring(0, 10) + '...');
    handleTokenExchange(undefined, codeParam);
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-sm bp-container-tall bg-card p-6">
          <h2 className="bp-section-title mb-2 text-center">Complete Authentication</h2>
          <p className="bp-body-sm text-muted-foreground mb-4 text-center">
            We couldn't find an email associated with your Square account. Please provide one to continue:
          </p>
          <form onSubmit={handleEmailSubmit}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-ui="field"
              className="w-full px-4 py-2 mb-3 bg-muted text-foreground border border-border"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              data-ui="button"
              className="w-full py-2 bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : 'Continue'}
            </button>
          </form>
          {error && (
            <p className="text-red-500 mt-4 bp-body-sm text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-24 h-24 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-8"></div>
      <h2 className="bp-section-title mb-2">Connecting Square</h2>
      <p className="bp-body text-muted-foreground">Setting up your account...</p>
      {error && (
        <p className="text-red-500 mt-4 bp-body-sm text-center">{error}</p>
      )}
    </div>
  );
}

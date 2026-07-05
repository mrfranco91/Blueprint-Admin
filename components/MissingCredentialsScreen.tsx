import React, { useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import { SettingsIcon } from './icons';

const MissingCredentialsScreen = () => {
  const { branding } = useSettings();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthDebug, setOauthDebug] = useState<null | {
    ok: boolean;
    resolvedRedirectUri?: string;
    requestOrigin?: string;
    authorizeBase?: string;
    squareEnv?: string;
    oauthScopes?: string;
    hasAppId?: boolean;
    hasRedirectUri?: boolean;
  }>(null);
  const [oauthDebugError, setOauthDebugError] = useState<string | null>(null);

  const squareAppId =
    (import.meta as any).env.VITE_SQUARE_APPLICATION_ID ||
    (import.meta as any).env.VITE_SQUARE_CLIENT_ID;
  const squareRedirectUri = (import.meta as any).env.VITE_SQUARE_REDIRECT_URI;
  const squareEnv = ((import.meta as any).env.VITE_SQUARE_ENV || 'production').toLowerCase();
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;

  const scopes =
    ((import.meta as any).env.VITE_SQUARE_OAUTH_SCOPES as string | undefined) ??
    'MERCHANT_PROFILE_READ EMPLOYEES_READ ITEMS_READ CUSTOMERS_READ CUSTOMERS_WRITE APPOINTMENTS_READ APPOINTMENTS_ALL_READ APPOINTMENTS_WRITE SUBSCRIPTIONS_READ SUBSCRIPTIONS_WRITE';

  useEffect(() => {
    let isMounted = true;

    const loadOauthDebug = async () => {
      try {
        const res = await fetch('/api/square/oauth/start?debug=1', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Debug request failed (${res.status})`);
        }
        const data = await res.json();
        if (isMounted) {
          setOauthDebug(data);
        }
      } catch (err) {
        if (isMounted) {
          setOauthDebugError(err instanceof Error ? err.message : 'Unable to load OAuth debug info');
        }
      }
    };

    loadOauthDebug();

    return () => {
      isMounted = false;
    };
  }, []);

  const startOAuth = () => {
    if (!squareAppId || !squareRedirectUri) {
      alert("Square OAuth is not configured correctly. Missing Application ID or Redirect URI.");
      return;
    }

    window.location.href = '/api/square/oauth/start';
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a Square access token');
      return;
    }

    if (!supabaseUrl) {
      setError('Supabase URL is not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { supabase } = await import('../lib/supabase');

      // Get existing session (user is already authenticated at this point)
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const jwtToken = session.session.access_token;

      // Sync team, clients, and services via consolidated /api/square/sync
      const syncHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      };
      const syncActions = ['team', 'clients', 'services'] as const;
      const syncErrors: string[] = [];

      for (const action of syncActions) {
        try {
          const res = await fetch('/api/square/sync', {
            method: 'POST',
            headers: syncHeaders,
            body: JSON.stringify({ action, squareAccessToken: token, salon_id: session.session.user.user_metadata?.salon_id }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            syncErrors.push(`${action}: ${data?.message || res.status}`);
          }
        } catch (err) {
          syncErrors.push(`${action}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (syncErrors.length > 0) {
        throw new Error(`Sync failures: ${syncErrors.join('; ')}`);
      }

      // Save the token to merchant_settings so the app knows Square is connected
      const { error: saveErr } = await supabase
        .from('merchant_settings')
        .upsert(
          {
            supabase_user_id: session.session.user.id,
            square_access_token: token,
            square_connected: true,
            square_connected_at: new Date().toISOString(),
          },
          { onConflict: 'supabase_user_id' }
        );

      if (saveErr) {
        console.error('Failed to save token:', saveErr);
        throw new Error('Failed to save Square token');
      }

      // Reload to refresh the settings context
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 relative overflow-hidden bg-primary"
    >
      {/* Blueprint grid background */}
      <div className="absolute inset-0 opacity-10 bp-grid-bg" />

      <div className="bg-card bp-container-tall shadow-2xl w-full max-w-md relative border-4 border-primary depth-3">
        {/* Header Section with Branding */}
        <div className="p-10 text-center border-b-4 border-primary bp-page-header">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.salonName} Logo`}
              className="login-logo w-20 h-20 object-contain mx-auto mb-4"
            />
          ) : (
            <div
              className="w-20 h-20 bp-container-tall mx-auto flex items-center justify-center mb-4 shadow-xl transform -rotate-3 bg-accent"
            >
              <SettingsIcon className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tighter bp-title text-primary">
            Connect Square
          </h1>
          <p className="bp-overline mt-2">
            Pro Access Required
          </p>
        </div>

        {/* Content Section */}
        <div className="p-10 bg-primary/5">
          <p className="text-center text-sm font-bold mb-8 bp-text-secondary">
            Connect your Square account to access the Pro/Admin dashboard.
          </p>

          {squareRedirectUri && (
            <div className="mb-6">
              <button
                onClick={startOAuth}
                className="blueprint-button"
              >
                Continue with Square OAuth
              </button>
            </div>
          )}

          {(oauthDebug || oauthDebugError) && (
            <div className="mb-6 bp-container-tall border-2 border bg-card/70 p-4 text-xs font-semibold text-muted-foreground">
              <p className="bp-overline">OAuth Debug Info</p>
              {oauthDebugError ? (
                <p className="mt-2 text-red-600">{oauthDebugError}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest bp-label">Request Origin</p>
                    <p className="break-all font-mono text-[11px] bp-text">
                      {oauthDebug?.requestOrigin || 'Not resolved'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest bp-label">Resolved Redirect</p>
                    <p className="break-all font-mono text-[11px] bp-text">
                      {oauthDebug?.resolvedRedirectUri || 'Not resolved'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest bp-label">Env Redirect</p>
                    <p className="break-all font-mono text-[11px] bp-text">
                      {squareRedirectUri || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest bp-label">Square Environment</p>
                    <p className="font-mono text-[11px] bp-text">
                      {oauthDebug?.squareEnv || 'Unknown'}
                    </p>
                  </div>
                  {oauthDebug?.ok === false && (
                    <p className="text-[11px] font-bold text-red-600">
                      {"Missing config: App ID "}{oauthDebug?.hasAppId ? 'OK' : 'Missing'}{", Redirect URI "}{oauthDebug?.hasRedirectUri ? 'OK' : 'Missing'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-0.5 bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground">or</span>
            <div className="flex-1 h-0.5 bg-primary" />
          </div>

          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <label className="block bp-overline mb-2">
                Square Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your Square access token"
                className="w-full px-4 py-3 bp-container-compact font-bold text-sm bp-input"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-red-600 text-xs font-bold text-center bg-red-50 p-3 bp-container-list">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bp-container-compact border-4 border-primary uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center bg-primary text-primary-foreground"
            >
              {loading ? 'Syncing...' : 'Sync with Token'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MissingCredentialsScreen;

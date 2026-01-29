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

      // Sync team members
      const teamRes = await fetch('/api/square/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ squareAccessToken: token }),
      });

      const teamText = await teamRes.text();
      if (!teamRes.ok) {
        const data = teamText ? JSON.parse(teamText) : {};
        throw new Error(data?.message || `Team sync failed (${teamRes.status})`);
      }

      // Sync clients
      const clientRes = await fetch('/api/square/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ squareAccessToken: token }),
      });

      const clientText = await clientRes.text();
      if (!clientRes.ok) {
        const data = clientText ? JSON.parse(clientText) : {};
        throw new Error(data?.message || `Client sync failed (${clientRes.status})`);
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
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative border-4 border-gray-950">
        {/* Header Section with Branding */}
        <div className="bg-gray-50 p-10 text-center border-b-4" style={{ borderColor: branding.primaryColor }}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.salonName} Logo`}
              className="login-logo w-20 h-20 object-contain mx-auto mb-4"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl transform -rotate-3"
              style={{ backgroundColor: branding.accentColor }}
            >
              <SettingsIcon className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-black tracking-tighter" style={{ color: branding.primaryColor }}>
            Connect Square
          </h1>
          <p className="text-xs font-black uppercase tracking-widest mt-2" style={{ color: branding.primaryColor }}>
            Pro Access Required
          </p>
        </div>

        {/* Content Section */}
        <div className="p-10" style={{ backgroundColor: 'rgba(138, 186, 211, 0.25)' }}>
          <p className="text-center text-sm font-bold mb-8" style={{ color: '#374151' }}>
            Connect your Square account to access the Pro/Admin dashboard.
          </p>

          {squareRedirectUri && (
            <div className="mb-6">
              <button
                onClick={startOAuth}
                className="blueprint-button font-black"
              >
                Continue with Square OAuth
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1" style={{ height: '2px', backgroundColor: branding.primaryColor }}></div>
            <span className="text-xs font-semibold" style={{ color: '#374151' }}>or</span>
            <div className="flex-1" style={{ height: '2px', backgroundColor: branding.primaryColor }}></div>
          </div>

          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#374151' }}>
                Square Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your Square access token"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-sm focus:outline-none focus:border-gray-950"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-red-600 text-xs font-bold text-center bg-red-50 p-3 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-black py-4 rounded-2xl border-4 border-gray-950 uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center"
              style={{ backgroundColor: branding.accentColor, color: '#FFFFFF' }}
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

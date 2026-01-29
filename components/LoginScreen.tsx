import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { SettingsIcon } from './icons';
import { ensureAccessibleColor } from '../utils/ensureAccessibleColor';

const LoginScreen: React.FC = () => {
  const { branding } = useSettings();
  const { login } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stylistEmail, setStylistEmail] = useState('');
  const [stylistPassword, setStylistPassword] = useState('');
  const [stylistLoading, setStylistLoading] = useState(false);
  const [stylistError, setStylistError] = useState<string | null>(null);

  const squareRedirectUri = (import.meta as any).env.VITE_SQUARE_REDIRECT_URI;

  const startSquareOAuth = () => {
    // Use server-side OAuth start endpoint for secure state handling
    // Server sets state in HTTP-only cookie and redirects to Square
    window.location.href = '/api/square/oauth/start';
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a Square access token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { supabase } = await import('../lib/supabase');

      // Sync team members via local API endpoint (no auth needed, uses token-based UID)
      const teamRes = await fetch('/api/square/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squareAccessToken: token }),
      });

      const teamText = await teamRes.text();
      console.log('Team sync response:', { status: teamRes.status, text: teamText });
      if (!teamRes.ok) {
        const data = teamText ? JSON.parse(teamText) : {};
        console.warn('Team sync failed:', data?.message || `Team sync failed (${teamRes.status})`);
        // Don't throw - team sync is not critical
      } else {
        console.log('Team sync succeeded');
      }

      // Sync clients via local API endpoint (no auth needed, uses token-based UID)
      const clientRes = await fetch('/api/square/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squareAccessToken: token }),
      });

      const clientText = await clientRes.text();
      console.log('Client sync response:', { status: clientRes.status, text: clientText });
      if (!clientRes.ok) {
        const data = clientText ? JSON.parse(clientText) : {};
        console.warn('Client sync failed:', data?.message || `Client sync failed (${clientRes.status})`);
        // Don't throw - client sync is not critical
      } else {
        console.log('Client sync succeeded');
      }

      // Get session from server
      const sessionRes = await fetch('/api/square/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squareAccessToken: token }),
      });

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json();
        throw new Error(
          `Failed to create session: ${errorData.message || 'Unknown error'}`
        );
      }

      const { supabase_session } = await sessionRes.json();
      if (!supabase_session?.access_token || !supabase_session?.refresh_token) {
        throw new Error('Failed to get session tokens from server');
      }

      console.log('✓ Got session from server, setting session...');

      // Set the session directly from the server tokens
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: supabase_session.access_token,
        refresh_token: supabase_session.refresh_token,
      });

      if (setSessionError) {
        throw new Error(`Failed to set session: ${setSessionError.message}`);
      }

      // Verify the session is set
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck?.session) {
        throw new Error('Failed to verify session');
      }

      localStorage.removeItem('mock_admin_user');
      console.log('✓ Authenticated as real account:', sessionCheck.session.user.id);
      window.location.href = '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleStylistLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stylistEmail.trim() || !stylistPassword.trim()) {
      setStylistError('Enter your email and password.');
      return;
    }

    setStylistLoading(true);
    setStylistError(null);

    const { supabase } = await import('../lib/supabase');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: stylistEmail.trim(),
      password: stylistPassword,
    });

    if (signInError) {
      setStylistError(signInError.message);
      setStylistLoading(false);
      return;
    }

    setStylistLoading(false);
  };

  const safeAccentColor = ensureAccessibleColor(branding.accentColor, '#FFFFFF', '#0F4C81');

  const headerStyle = {
    color: '#0F4C81', /* Blueprint Classic Blue for strong contrast on light background */
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative border-4 border-gray-950"
        style={{
          "@media (max-width: 991px)": {
            maxWidth: "656px",
          },
        } as any}
      >
        <div
          className="bg-gray-50 p-10 text-center border-b-4"
          style={{
            borderColor: branding.primaryColor,
            "@media (max-width: 991px)": {
              backgroundImage:
                "url(https://cdn.builder.io/api/v1/image/assets%2F8d6a989189ff4d9e8633804d5d0dbd86%2F6d20c9ec074b40608799512dc6ed08ca)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "cover",
              paddingTop: "63px",
              display: "flex",
              flexDirection: "column",
            },
          } as any}
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F8d6a989189ff4d9e8633804d5d0dbd86%2F7093acbcb2ca4ac783c4b84bc621e52f"
            alt="Blueprint Logo"
            className="login-logo object-contain mx-auto mb-4"
            style={{
              maxWidth: "100%",
              width: "100%",
              display: "block",
              "@media (max-width: 991px)": {
                maxWidth: "100%",
                width: "100%",
              },
            } as any}
          />

          <h1
            className="text-3xl tracking-tighter"
            style={{
              color: branding.primaryColor,
              fontFamily: "Quicksand, sans-serif",
              fontWeight: "600",
              textAlign: "left",
              "@media (max-width: 991px)": {
                color: "rgba(11, 52, 88, 1)",
                fontFamily: "Quicksand, sans-serif",
                fontWeight: "400",
                textAlign: "left",
                margin: "0 auto 0 27px",
              },
            } as any}
          >
            Pro Access
          </h1>
        </div>

        <div
          className="p-10"
          style={{
            backgroundColor: `rgba(${parseInt(branding.primaryColor.slice(1, 3), 16)}, ${parseInt(branding.primaryColor.slice(3, 5), 16)}, ${parseInt(branding.primaryColor.slice(5, 7), 16)}, 0.08)`,
            "@media (max-width: 991px)": {
              marginTop: "-3px",
            },
          } as any}
        >

          {squareRedirectUri && (
            <div className="mb-6">
              <button
                onClick={startSquareOAuth}
                className="blueprint-button font-black"
                style={{
                  "@media (max-width: 991px)": {
                    borderStyle: "dashed",
                    borderWidth: "1px",
                    fontWeight: "400",
                    fontSize: "27px",
                  },
                } as any}
              >
                Login with Square
              </button>
            </div>
          )}

          {squareRedirectUri && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1" style={{ height: '2px', backgroundColor: branding.primaryColor }}></div>
              <span className="text-xs font-semibold" style={{ color: '#374151' }}>or</span>
              <div className="flex-1" style={{ height: '2px', backgroundColor: branding.primaryColor }}></div>
            </div>
          )}

          <p className="text-center text-sm font-bold mb-6" style={{ color: '#374151' }}>
            Enter your Square access token to sync your team and clients
          </p>
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#374151' }}>
                Square Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your access token"
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
              className="w-full font-black py-4 rounded-2xl border-4 border-gray-950 uppercase tracking-widest text-sm shadow-lg sync-button"
              style={{
                backgroundColor: branding.accentColor,
                color: '#FFFFFF',
                "@media (max-width: 991px)": {
                  backgroundColor: "rgba(11, 67, 97, 1)",
                  fontWeight: "500",
                  fontSize: "19px",
                },
              } as any}
            >
              {loading ? 'Syncing...' : 'Sync with Token'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-0.5 bg-gray-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stylist access</span>
            <div className="flex-1 h-0.5 bg-gray-200" />
          </div>

          <form onSubmit={handleStylistLogin} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-gray-600">
                Stylist email
              </label>
              <input
                type="email"
                value={stylistEmail}
                onChange={(event) => setStylistEmail(event.target.value)}
                placeholder="name@salon.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-sm focus:outline-none focus:border-gray-950"
                autoComplete="email"
                disabled={stylistLoading}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-gray-600">
                Password
              </label>
              <input
                type="password"
                value={stylistPassword}
                onChange={(event) => setStylistPassword(event.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-sm focus:outline-none focus:border-gray-950"
                autoComplete="current-password"
                disabled={stylistLoading}
              />
            </div>
            {stylistError && (
              <p className="text-red-600 text-xs font-bold text-center bg-red-50 p-3 rounded-lg">
                {stylistError}
              </p>
            )}
            <button
              type="submit"
              disabled={stylistLoading}
              className="w-full font-black py-4 rounded-2xl border-4 border-gray-950 uppercase tracking-widest text-sm shadow-lg bg-gray-950 text-white"
            >
              {stylistLoading ? 'Signing in...' : 'Sign in as stylist'}
            </button>
            <p className="text-xs text-gray-500 font-semibold text-center">
              Invited stylists can set a password from the invite email, then sign in here.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

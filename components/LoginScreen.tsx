import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const LoginScreen: React.FC = () => {
  const { branding } = useSettings();
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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div
        className="bg-white rounded-[80px] shadow-2xl w-full max-w-md overflow-hidden relative border-4 border-gray-950"
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
                marginBottom: "-23px",
              },
            } as any}
          >
            Pro Access
          </h1>
        </div>

        <div
          className="p-10 login-screen-content"
          style={{
            backgroundColor: `rgba(${parseInt(branding.primaryColor.slice(1, 3), 16)}, ${parseInt(branding.primaryColor.slice(3, 5), 16)}, ${parseInt(branding.primaryColor.slice(5, 7), 16)}, 0.08)`,
          } as any}
        >

          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-0.5 bg-gray-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Admin access</span>
            <div className="flex-1 h-0.5 bg-gray-200" />
          </div>

          {squareRedirectUri && (
            <div className="mb-6" style={{ marginBottom: "16px" } as any}>
              <button
                onClick={startSquareOAuth}
                className="blueprint-button font-black square-oauth-button"
              >
                Login with Square
              </button>
            </div>
          )}

          <div className="my-8 flex items-center gap-3 stylist-divider">
            <div className="flex-1 h-0.5 bg-gray-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stylist access</span>
            <div className="flex-1 h-0.5 bg-gray-200" />
          </div>

          <form onSubmit={handleStylistLogin} className="space-y-4 login-form">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-gray-600">
                Stylist email
              </label>
              <input
                type="email"
                value={stylistEmail}
                onChange={(event) => setStylistEmail(event.target.value)}
                placeholder="name@salon.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-sm focus:outline-none focus:border-gray-950 stylist-email-input"
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-sm focus:outline-none focus:border-gray-950 stylist-password-input"
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
              className="blueprint-button font-black stylist-signin-button"
            >
              {stylistLoading ? 'Signing in...' : 'Sign in as stylist'}
            </button>
            <p className="text-xs text-gray-500 font-semibold text-center help-text">
              Invited stylists can set a password from the invite email, then sign in here.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

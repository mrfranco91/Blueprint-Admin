import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const LoginScreen: React.FC = () => {
  const { setTheme } = useTheme();
  const [showStylistLogin, setShowStylistLogin] = useState(false);

  useEffect(() => {
    setTheme('light');
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startSquareOAuth = () => {
    window.location.href = '/api/square/oauth/start';
  };

  const handleStylistLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bp-login-screen">
      <div className="bp-login-card">
        <header className="bp-login-logo-wrap">
          <img
            src="/logo.png"
            alt="Blueprint Salon Software"
            className="bp-login-logo"
          />
        </header>

        <div className="bp-login-body">
          <div className="bp-login-divider">
            <span className="bp-login-divider-line" />
            <span className="bp-label">Admin Access</span>
            <span className="bp-login-divider-line" />
          </div>

          <button className="bp-btn-primary w-full" onClick={startSquareOAuth}>
            Login with Square
          </button>

          <div className="bp-login-divider">
            <span className="bp-login-divider-line" />
            <span className="bp-label">Team Access</span>
            <span className="bp-login-divider-line" />
          </div>

          {!showStylistLogin ? (
            <div className="bp-login-team">
              <button className="bp-btn-primary w-full" onClick={() => setShowStylistLogin(true)}>
                Stylist Login
              </button>
              <button
                type="button"
                className="bp-login-pin-link"
                onClick={() => { window.location.href = '/join'; }}
              >
                New here? Join with PIN
              </button>
            </div>
          ) : (
            <form onSubmit={handleStylistLogin} className="bp-login-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="bp-field"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bp-field"
                required
              />
              {error && (
                <p className="text-destructive text-xs font-semibold text-center">{error}</p>
              )}
              <button type="submit" disabled={loading} className="bp-btn-primary w-full">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setShowStylistLogin(false); setError(null); }}
                className="bp-login-pin-link"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

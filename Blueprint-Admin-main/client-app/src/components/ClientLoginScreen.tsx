import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';

const ClientLoginScreen: React.FC = () => {
  const { branding } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6">
      <div className="bg-white border-4 border-gray-100 rounded-3xl shadow-lg p-8 w-full max-w-md">
        <div className="space-y-2 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Client access</p>
          <h1 className="text-3xl font-black text-gray-950">Welcome back</h1>
          <p className="text-sm text-gray-600 font-semibold">
            Sign in to view your plan and appointments from {branding.salonName}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-gray-900 focus:outline-none"
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-gray-900 focus:outline-none"
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gray-950 text-white py-3 text-sm font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-gray-500 font-semibold mt-6 text-center">
          Need access? Ask your stylist to create your client account.
        </p>
      </div>
    </div>
  );
};

export default ClientLoginScreen;

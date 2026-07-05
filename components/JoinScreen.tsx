import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface JoinScreenProps {
  onComplete: () => void;
}

type Step = 'pin' | 'setup';

const JoinScreen: React.FC<JoinScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [stylistName, setStylistName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('Please enter a valid 4-digit PIN.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stylists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin }),
      });

      const data = await response.json();
      console.log('[Join] verify-pin response:', JSON.stringify(data, null, 2));
      if (!response.ok) {
        throw new Error(data?.message || 'Invalid PIN.');
      }

      setStylistName(data.name || '');
      setEmail(data.email || '');
      setStep('setup');
    } catch (err: any) {
      setError(err.message || 'Failed to verify PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Email is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stylists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', pin, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to join.');
      }

      // If we got a session back, set it in Supabase client
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-primary">
      <div className="absolute inset-0 opacity-10 bp-grid-bg" />

      <div className="bg-white bp-container-tall shadow-2xl w-full max-w-md relative border border-border depth-3 overflow-hidden text-[#0B3559]">
        <div className="p-10 text-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F8d6a989189ff4d9e8633804d5d0dbd86%2F7093acbcb2ca4ac783c4b84bc621e52f"
            alt="Blueprint Logo"
            className="login-logo object-contain mx-auto w-full block"
          />
        </div>

        <div className="px-10 pb-10 pt-2">
          {step === 'pin' ? (
            <>
              <h2 className="bp-section-title text-center mb-2 text-[#0B3559]">Join Your Team</h2>
              <p className="bp-body-sm text-center text-[#2B5470] mb-6">
                Enter the 4-digit PIN your admin gave you.
              </p>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block bp-overline mb-2 text-[#2B5470]">Team PIN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    className="w-full p-4 border-2 bp-container-compact font-bold text-2xl text-center tracking-[0.5em] outline-none bg-[#0B3559] text-white placeholder-white/40 focus:border-accent transition-all"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-destructive text-sm font-semibold text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#0B3559] text-white font-bold text-center disabled:opacity-50"
                  data-ui="button"
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="bp-section-title text-center mb-2 text-[#0B3559]">
                {stylistName ? `Welcome, ${stylistName.split(' ')[0]}!` : 'Set Up Your Account'}
              </h2>
              <p className="bp-body-sm text-center text-[#2B5470] mb-6">
                Confirm your email and set a password.
              </p>

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block bp-overline mb-2 text-[#2B5470]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full p-4 border-2 bp-container-compact font-medium outline-none bg-[#EDF2F7] text-[#0B3559] focus:border-accent transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block bp-overline mb-2 text-[#2B5470]">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full p-4 border-2 bp-container-compact font-medium outline-none bg-[#EDF2F7] text-[#0B3559] focus:border-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block bp-overline mb-2 text-[#2B5470]">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full p-4 border-2 bp-container-compact font-medium outline-none bg-[#EDF2F7] text-[#0B3559] focus:border-accent transition-all"
                  />
                </div>

                {error && (
                  <p className="text-destructive text-sm font-semibold text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#0B3559] text-white font-bold text-center disabled:opacity-50"
                  data-ui="button"
                >
                  {loading ? 'Setting up...' : 'Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('pin'); setError(null); }}
                  className="w-full py-2 text-xs uppercase tracking-widest text-[#2B5470] hover:text-[#0B3559] transition-colors"
                >
                  Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;

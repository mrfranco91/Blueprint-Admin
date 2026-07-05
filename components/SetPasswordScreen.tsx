import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SetPasswordScreenProps {
  onComplete: () => void;
}

const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
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

      <div className="bg-white bp-container-tall shadow-2xl w-full max-w-md relative border border-border depth-3 overflow-hidden">
        <div className="p-10 text-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F8d6a989189ff4d9e8633804d5d0dbd86%2F7093acbcb2ca4ac783c4b84bc621e52f"
            alt="Blueprint Logo"
            className="login-logo object-contain mx-auto w-full block"
          />
        </div>

        <div className="px-10 pb-10 pt-2">
          <h2 className="bp-section-title text-center mb-2">Welcome to Blueprint</h2>
          <p className="bp-body-sm text-center text-muted-foreground mb-6">
            Set a password to complete your account setup.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block bp-overline mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full p-4 border-2 bp-container-compact font-medium outline-none bg-muted text-foreground focus:border-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block bp-overline mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full p-4 border-2 bp-container-compact font-medium outline-none bg-muted text-foreground focus:border-accent transition-all"
                required
              />
            </div>

            {error && (
              <p className="text-destructive text-sm font-semibold text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bp-btn-primary text-center disabled:opacity-50"
              data-ui="button"
            >
              {loading ? 'Setting up...' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordScreen;

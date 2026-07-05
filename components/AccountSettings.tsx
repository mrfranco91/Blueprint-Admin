import React, { useState } from 'react';
import type { User } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Toggle } from './Toggle';
import { SaveToast, useSaveToast } from './SaveToast';
import ThemeToggle from './ThemeToggle';
import { SettingsIcon, UsersIcon, TrashIcon, DocumentTextIcon, SunIcon } from './icons';


interface AccountSettingsProps {
  user: User | null;
  onLogout: () => void;
  subtitle: string;
  role?: 'admin' | 'stylist';
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onLogout, subtitle, role = 'admin' }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { pushAlertsEnabled, updatePushAlertsEnabled, cancellationPolicy, updateCancellationPolicy, textSize, updateTextSize, saveAll } = useSettings();
  const { toastVisible, showToast, hideToast } = useSaveToast();
  const { updateUser } = useAuth();

  const isStylist = role === 'stylist';

  const handlePasswordChange = () => {
    alert("Password change functionality is not yet connected to the backend.");
    setIsChangingPassword(false);
  };

  const MAX_AVATAR_SIZE = 500 * 1024; // 500 KB

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_AVATAR_SIZE) {
      alert('Image is too large. Please choose an image under 500 KB.');
      e.target.value = '';
      return;
    }

    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) return;

      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.warn('[Avatar] Upload failed:', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        updateUser({ avatarUrl: urlData.publicUrl });
      }
    } catch (err) {
      console.warn('[Avatar] Storage upload failed:', err);
    }
  };

  const isMockUser = !!user?.isMock;

  return (
    <div className="bp-page">
      <h1 className="bp-page-title px-2 pt-2 mb-8">Account</h1>

      <div className="space-y-6 animate-fade-in px-1">
        <div className="bg-card p-8 bp-container-list border border-border shadow-sm text-center">
          <input type="file" accept="image/*" id="avatar-upload" className="hidden" onChange={handleAvatarChange} />
          <label htmlFor="avatar-upload" className="cursor-pointer block">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-primary shadow-lg object-cover hover:opacity-80 transition-opacity" />
            ) : (
              <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold shadow-xl border-4 bg-primary text-primary-foreground border-primary hover:opacity-80 transition-opacity">{user?.name?.[0]}</div>
            )}
            <span className="bp-caption text-accent">Tap to change photo</span>
          </label>
          <h2 className="bp-section-title leading-none mb-2 mt-3">{user?.name}</h2>
          <p className="bp-overline">{subtitle}</p>
        </div>

        <div className="bg-card p-6 px-8 bp-container-tall border border-border shadow-sm space-y-6">
          <div>
            <h3 className="bp-overline mb-4 flex items-center">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="bp-overline">Push Alerts</span>
                <Toggle
                  data-ui="toggle"
                  checked={pushAlertsEnabled}
                  onCheckedChange={(checked) => {
                    updatePushAlertsEnabled(checked);
                    saveAll().then(showToast);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="bp-overline mb-4 flex items-center">
              <UsersIcon className="w-4 h-4 mr-2" />
              Account Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block bp-caption mb-1">Email</label>
                {isMockUser && !user?.email ? (
                  <div className="w-full p-3 border-2 bp-container-compact font-medium text-sm italic bp-input-readonly text-foreground">
                    Mock account — no email associated
                  </div>
                ) : (
                  <input data-ui="field" type="email" readOnly value={user?.email || ''} className="w-full p-3 font-medium text-sm outline-none bp-input-readonly" />
                )}
              </div>
              {isChangingPassword ? (
                <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} className="space-y-3 pt-2 animate-fade-in bp-card-padding-sm bp-container-list border-2 border bg-muted">
                  <div>
                    <label className="block bp-caption mb-1">Current Password</label>
                    <input data-ui="field" type="password" required className="w-full p-3 bg-card border-2 border font-medium text-sm outline-none text-foreground" />
                  </div>
                  <div>
                    <label className="block bp-overline mb-1">New Password</label>
                    <input data-ui="field" type="password" required className="w-full p-3 bg-card border-2 border font-medium text-sm outline-none text-foreground" />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button data-ui="button" type="submit" className="w-full py-3 border-b-4 border-black/20 uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all bp-btn-secondary">Save</button>
                    <button data-ui="button" type="button" onClick={() => setIsChangingPassword(false)} className="w-full py-3 border-b-4 uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all bp-btn-ghost border">Cancel</button>
                  </div>
                </form>
              ) : (
                <div>
                  <label className="block bp-overline mb-1">Password</label>
                  {isMockUser ? (
                    <>
                      <div className="w-full text-left p-3 border-2 bp-container-compact font-bold text-sm cursor-not-allowed bp-btn-disabled">
                        Change Password
                      </div>
                      <p className="bp-caption mt-2 px-1">This feature is disabled for the demo administrator account.</p>
                    </>
                  ) : (
                    <button data-ui="button" onClick={() => setIsChangingPassword(true)} className="w-full text-left p-3 border-2 border font-medium text-sm hover:opacity-80 transition-colors bg-muted text-foreground">
                      Change Password
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Appearance: Theme + Text Size */}
        <div className="bg-card p-6 px-8 bp-container-tall border border-border shadow-sm space-y-6">
          <div>
            <h3 className="bp-overline mb-4 flex items-center">
              <SunIcon className="w-4 h-4 mr-2" />
              Appearance
            </h3>
            <ThemeToggle />
          </div>
          <div className="pt-4 border-t border-border">
            <h3 className="bp-overline mb-4">Text Size</h3>
            <div className="flex p-1 rounded-full bg-muted w-fit">
              {(['S', 'M', 'L'] as const).map(sz => (
                <button
                  data-ui="button"
                  key={sz}
                  onClick={() => {
                    updateTextSize(sz);
                    saveAll().then(showToast);
                  }}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${sz === textSize ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cancellation Policy — admin only */}
        {!isStylist && (
          <div className="bg-card p-6 px-8 bp-container-tall border border-border shadow-sm space-y-4">
            <h3 className="bp-overline mb-2 flex items-center">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Cancellation Policy
            </h3>
            <p className="bp-caption text-muted-foreground">This will be shown to clients when confirming a booking.</p>
            <textarea
              value={cancellationPolicy}
              onChange={(e) => updateCancellationPolicy(e.target.value)}
              onBlur={() => saveAll().then(showToast)}
              placeholder="e.g. Cancellations must be made at least 24 hours in advance. Late cancellations may be subject to a fee."
              rows={4}
              className="w-full p-4 bg-muted border-2 border bp-container-list font-medium text-sm outline-none resize-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        <button data-ui="button" onClick={onLogout} className="w-full py-5 border-b-8 border-black/20 uppercase tracking-widest text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3 bp-btn-primary">
          <TrashIcon className="w-6 h-6" />
          <span>SIGN OUT</span>
        </button>
      </div>
      <SaveToast visible={toastVisible} onDone={hideToast} />
    </div>
  );
};

export default AccountSettings;

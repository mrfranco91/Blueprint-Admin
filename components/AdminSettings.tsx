import React, { useState } from 'react';
import type { User, AppTextSize } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Toggle } from './Toggle';
import { SettingsIcon, UsersIcon, TrashIcon } from './icons';
import { ensureAccessibleColor } from '../utils/ensureAccessibleColor';


interface AdminSettingsProps {
  user: User | null;
  onLogout: () => void;
  subtitle: string;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ user, onLogout, subtitle }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { textSize, updateTextSize, pushAlertsEnabled, updatePushAlertsEnabled, branding, saveAll } = useSettings();

  const handlePasswordChange = () => {
    alert("Password change functionality is not yet connected to the backend.");
    setIsChangingPassword(false);
  };

  const isMockUser = !!user?.isMock;

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 overflow-y-auto pb-48">
        <h1 className="text-3xl font-black tracking-tighter px-2 pt-2 mb-8" style={{ color: ensureAccessibleColor(branding.accentColor, '#F9FAFB', '#1E3A8A') }}>Account</h1>

        <div className="space-y-6 animate-fade-in px-1">
            <div className="bg-white p-8 rounded-[40px] border-4 border-gray-950 shadow-2xl text-center">
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} className="w-24 h-24 rounded-[32px] mx-auto mb-6 border-4 border-gray-100 shadow-lg object-cover" />
                ) : (
                    <div className="w-24 h-24 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-gray-900" style={{ backgroundColor: branding.primaryColor }}>{user?.name?.[0]}</div>
                )}
                <h2 className="text-2xl font-black text-gray-950 tracking-tighter leading-none mb-2">{user?.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: ensureAccessibleColor(branding.primaryColor, '#FFFFFF', '#BE123C') }}>{subtitle}</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-4 border-gray-100 shadow-sm space-y-6">
                <div>
                    <h3 className="font-black text-sm tracking-widest uppercase text-gray-400 mb-4 flex items-center">
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        App Settings
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Text Size</span>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {(['S', 'M', 'L'] as AppTextSize[]).map(sz => (
                                    <button
                                        data-ui="button"
                                        key={sz}
                                        onClick={() => {
                                          updateTextSize(sz);
                                          saveAll();
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-black ${sz === textSize ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}
                                    >
                                      {sz}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Push Alerts</span>
                            <Toggle
                                data-ui="toggle"
                                checked={pushAlertsEnabled}
                                onCheckedChange={(checked) => {
                                  updatePushAlertsEnabled(checked);
                                  saveAll();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t-2 border-gray-100">
                    <h3 className="font-black text-sm tracking-widest uppercase text-gray-400 mb-4 flex items-center">
                        <UsersIcon className="w-4 h-4 mr-2" />
                        Account Security
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            {isMockUser && !user?.email ? (
                                <div className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-500 italic">
                                    Mock account — no email associated
                                </div>
                            ) : (
                                <input data-ui="field" type="email" readOnly value={user?.email || ''} className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm outline-none" />
                            )}
                        </div>
                        {isChangingPassword ? (
                            <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} className="space-y-3 pt-2 animate-fade-in">
                                 <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Password</label>
                                    <input data-ui="field" type="password" required className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">New Password</label>
                                    <input data-ui="field" type="password" required className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-sm outline-none" />
                                </div>
                                <div className="flex space-x-2 pt-2">
                                     <button data-ui="button" type="submit" className="w-full text-white font-black py-3 rounded-xl border-b-4 border-black/20 uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all" style={{ backgroundColor: branding.accentColor, color: ensureAccessibleColor(branding.accentColor, '#FFFFFF', '#BE123C') }}>Save</button>
                                     <button data-ui="button" type="button" onClick={() => setIsChangingPassword(false)} className="w-full text-gray-800 font-black py-3 bg-gray-100 rounded-xl border-b-4 border-gray-300 uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">Cancel</button>
                                </div>
                            </form>
                        ) : (
                             <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Password</label>
                                {isMockUser ? (
                                    <>
                                        <div className="w-full text-left p-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-400 cursor-not-allowed">
                                            Change Password
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 px-1">This feature is disabled for the demo administrator account.</p>
                                    </>
                                ) : (
                                    <button data-ui="button" onClick={() => setIsChangingPassword(true)} className="w-full text-left p-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-900 hover:border-gray-400 transition-colors">
                                        Change Password
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button data-ui="button" onClick={onLogout} className="w-full font-black py-5 rounded-[28px] border-b-8 border-black/20 uppercase tracking-widest text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3" style={{ backgroundColor: branding.accentColor, color: ensureAccessibleColor(branding.accentColor, '#FFFFFF', '#FFFFFF') }}>
                <TrashIcon className="w-6 h-6" />
                <span>SIGN OUT</span>
            </button>
        </div>
    </div>
  );
};

export default AdminSettings;

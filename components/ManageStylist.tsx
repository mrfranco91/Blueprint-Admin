import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Toggle } from './Toggle';
import type { Stylist, StylistLevel } from '../types';

interface ManageStylistProps {
  onBack: () => void;
}

export default function ManageStylist({ onBack }: ManageStylistProps) {
  const { levels, updateLevels, stylists, updateStylists, saveAll } = useSettings();
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLevelId, setInviteLevelId] = useState('lvl_1');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [stylistSaveLoading, setStylistSaveLoading] = useState(false);
  const [stylistSaveError, setStylistSaveError] = useState<string | null>(null);

  const fallbackPermissions = levels[0]?.defaultPermissions || {
    canBookAppointments: true,
    canOfferDiscounts: false,
    requiresDiscountApproval: true,
    viewGlobalReports: false,
    viewClientContact: true,
    viewAllSalonPlans: false,
    can_book_own_schedule: true,
    can_book_peer_schedules: false,
  };

  const resolveLevelDefaults = (levelId: string) => {
    return levels.find(level => level.id === levelId)?.defaultPermissions || fallbackPermissions;
  };

  const levelPermissionKeys = Object.keys(fallbackPermissions) as (keyof typeof fallbackPermissions)[];

  const handleLevelUpdate = (levelId: string, updates: Partial<StylistLevel>) => {
    updateLevels(levels.map(level => (level.id === levelId ? { ...level, ...updates } : level)));
  };

  const handleLevelPermissionToggle = (levelId: string, permissionKey: keyof typeof fallbackPermissions) => {
    updateLevels(
      levels.map(level => {
        if (level.id !== levelId) return level;
        return {
          ...level,
          defaultPermissions: {
            ...level.defaultPermissions,
            [permissionKey]: !level.defaultPermissions[permissionKey],
          },
        };
      })
    );
  };

  const handleAddLevel = () => {
    const nextLevel: StylistLevel = {
      id: `lvl_${Date.now()}`,
      name: 'New Tier',
      color: '#111827',
      order: levels.length + 1,
      defaultPermissions: fallbackPermissions,
    };
    updateLevels([...levels, nextLevel]);
  };

  const handleInviteStylist = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteError(null);
    setInviteStatus(null);

    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Enter a name and email for the stylist.');
      return;
    }

    if (!supabase) {
      setInviteError('Supabase is not configured.');
      return;
    }

    setInviteLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Please log in again to send invites.');
      }

      const response = await fetch('/api/stylists/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          levelId: inviteLevelId || levels[0]?.id || 'lvl_1',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to send invite.');
      }

      if (data?.stylist) {
        const nextStylists = stylists.some(s => s.id === data.stylist.id)
          ? stylists.map(s => (s.id === data.stylist.id ? data.stylist : s))
          : [...stylists, data.stylist];
        updateStylists(nextStylists);
      }

      setInviteStatus('Invite sent.');
      setInviteName('');
      setInviteEmail('');
      setInviteLevelId(levels[0]?.id || 'lvl_1');
      setShowInviteForm(false);
    } catch (e: any) {
      setInviteError(e.message || 'Failed to send invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const persistStylistUpdates = async (stylist: Stylist) => {
    if (!supabase) {
      setStylistSaveError('Supabase is not configured.');
      return;
    }

    setStylistSaveLoading(true);
    setStylistSaveError(null);

    try {
      const { error } = await supabase
        .from('square_team_members')
        .update({
          level_id: stylist.levelId,
          permissions: stylist.permissionOverrides || {},
        })
        .eq('square_team_member_id', stylist.id);

      if (error) {
        throw new Error(error.message);
      }

      saveAll();
      setEditingStylist(null);
    } catch (e: any) {
      setStylistSaveError(e.message || 'Failed to save stylist changes.');
    } finally {
      setStylistSaveLoading(false);
    }
  };

  if (editingStylist) {
    const levelDefaults = resolveLevelDefaults(editingStylist.levelId || levels[0]?.id || 'lvl_1');
    const effectivePermissions = { ...levelDefaults, ...(editingStylist.permissionOverrides || {}) };
    const permissionKeys = Object.keys(levelDefaults) as (keyof typeof levelDefaults)[];

    return (
      <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
        <button data-ui="button" onClick={() => setEditingStylist(null)} className="mb-6 flex items-center text-xs font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
        <h2 className="text-4xl font-black mb-4 text-brand-accent">Editing {editingStylist.name}</h2>
        <p className="text-xs font-bold text-gray-500 mb-6">Level defaults are applied first, then individual overrides.</p>
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Stylist level</label>
          <select
            data-ui="field"
            value={editingStylist.levelId}
            onChange={(event) => {
              const nextLevelId = event.target.value;
              const nextDefaults = resolveLevelDefaults(nextLevelId);
              const currentOverrides = editingStylist.permissionOverrides || {};
              const nextOverrides = Object.keys(currentOverrides).reduce((acc, key) => {
                const typedKey = key as keyof typeof nextDefaults;
                const overrideValue = currentOverrides[typedKey];
                if (overrideValue === nextDefaults[typedKey]) {
                  return acc;
                }
                return { ...acc, [typedKey]: overrideValue };
              }, {} as Partial<typeof nextDefaults>);
              const nextPermissions = { ...nextDefaults, ...nextOverrides };
              const nextStylist = {
                ...editingStylist,
                levelId: nextLevelId,
                permissions: nextPermissions,
                permissionOverrides: nextOverrides,
              };
              setEditingStylist(nextStylist);
              updateStylists(stylists.map(s => s.id === editingStylist.id ? nextStylist : s));
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          {permissionKeys.map((permKey) => (
            <div key={permKey} className="flex justify-between items-center p-4 bg-white border-4 border-gray-100 rounded-2xl">
              <div>
                <span className="font-black text-sm capitalize">{String(permKey).replace(/_/g, ' ')}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Default: {levelDefaults[permKey] ? 'On' : 'Off'}
                </p>
              </div>
              <Toggle
                checked={!!effectivePermissions[permKey]}
                onCheckedChange={(checked) => {
                  const nextValue = checked;
                  const nextOverrides = { ...(editingStylist.permissionOverrides || {}) };
                  if (nextValue === levelDefaults[permKey]) {
                    delete nextOverrides[permKey];
                  } else {
                    nextOverrides[permKey] = nextValue;
                  }
                  const nextPermissions = { ...levelDefaults, ...nextOverrides };
                  const nextStylist = {
                    ...editingStylist,
                    permissions: nextPermissions,
                    permissionOverrides: nextOverrides,
                  };
                  setEditingStylist(nextStylist);
                  updateStylists(stylists.map(s => s.id === editingStylist.id ? nextStylist : s));
                }}
              />
            </div>
          ))}
        </div>
        {stylistSaveError && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-700">
            {stylistSaveError}
          </div>
        )}
        <button
          data-ui="button"
          onClick={() => persistStylistUpdates(editingStylist)}
          disabled={stylistSaveLoading}
          className="w-full py-4 bg-gray-950 text-white font-black rounded-2xl mt-8 disabled:opacity-60"
        >
          {stylistSaveLoading ? 'Saving...' : 'Save permissions'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <button data-ui="button" onClick={onBack} className="mb-6 flex items-center text-xs font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
      <h2 className="text-4xl font-black text-black tracking-tighter mb-8">Team Access</h2>
      <div className="space-y-6">
        <div className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Team tier setup</p>
              <p className="text-sm font-black text-gray-900">Define default feature access by tier.</p>
            </div>
            <button data-ui="button" onClick={handleAddLevel} className="px-4 py-2 bg-gray-950 text-white font-black rounded-2xl text-xs uppercase tracking-widest">
              Add tier
            </button>
          </div>
          <div className="space-y-4">
            {levels.map((level) => (
              <div key={level.id} className="border-2 border-gray-100 rounded-2xl p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Tier name</label>
                    <input
                      data-ui="field"
                      type="text"
                      value={level.name}
                      onChange={(event) => handleLevelUpdate(level.id, { name: event.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-[87px] overflow-hidden font-bold text-sm text-[#9b9b9b] focus:outline-none focus:border-gray-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Display order</label>
                    <input
                      data-ui="field"
                      type="number"
                      min={1}
                      value={level.order}
                      onChange={(event) => handleLevelUpdate(level.id, { order: Number(event.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-[87px] font-bold text-sm text-[#9b9b9b] focus:outline-none focus:border-gray-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Tier color</label>
                    <input
                      data-ui="field"
                      type="color"
                      value={level.color}
                      onChange={(event) => handleLevelUpdate(level.id, { color: event.target.value })}
                      className="w-full h-12 px-4 py-3 border-2 border-gray-200 rounded-[87px] cursor-pointer font-bold text-sm text-[#9b9b9b]"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {levelPermissionKeys.map((permissionKey) => (
                    <div key={`${level.id}-${permissionKey}`} className="flex justify-between items-center p-3 bg-gray-50 border-2 border-gray-100 rounded-2xl">
                      <div>
                        <span className="text-xs font-black capitalize text-gray-900">
                          {String(permissionKey).replace(/_/g, ' ')}
                        </span>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                          Default: {level.defaultPermissions[permissionKey] ? 'On' : 'Off'}
                        </p>
                      </div>
                      <Toggle
                        checked={!!level.defaultPermissions[permissionKey]}
                        onCheckedChange={() => handleLevelPermissionToggle(level.id, permissionKey)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Invite team member</p>
              <p className="text-sm font-black text-gray-900">Send a secure invite so a stylist can create their login.</p>
            </div>
            <button
              data-ui="button"
              onClick={() => {
                setShowInviteForm((prev) => !prev);
                setInviteError(null);
                setInviteStatus(null);
                if (!inviteLevelId) {
                  setInviteLevelId(levels[0]?.id || 'lvl_1');
                }
              }}
              className="px-5 py-3 bg-gray-950 text-white font-black rounded-2xl text-xs uppercase tracking-widest"
            >
              {showInviteForm ? 'Close invite' : 'Invite stylist'}
            </button>
          </div>
          {showInviteForm && (
            <form onSubmit={handleInviteStylist} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-gray-500">
                    Stylist name
                  </label>
                  <input
                    data-ui="field"
                    type="text"
                    value={inviteName}
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Stylist name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
                    disabled={inviteLoading}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-gray-500">
                    Stylist email
                  </label>
                  <input
                    data-ui="field"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="stylist@salon.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
                    disabled={inviteLoading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-gray-500">
                  Stylist level
                </label>
                <select
                  data-ui="field"
                  value={inviteLevelId}
                  onChange={(event) => setInviteLevelId(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
                  disabled={inviteLoading}
                >
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              {inviteError && (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-700">
                  {inviteError}
                </div>
              )}
              {inviteStatus && (
                <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-3 text-xs font-semibold text-green-700">
                  {inviteStatus}
                </div>
              )}
              <button
                data-ui="button"
                type="submit"
                disabled={inviteLoading}
                className="w-full py-4 bg-brand-accent text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-shadow disabled:opacity-60"
              >
                {inviteLoading ? 'Sending invite...' : 'Send stylist invite'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Individual access</p>
              <p className="text-sm font-black text-gray-900">Override access by team member.</p>
            </div>
          </div>
          <div className="space-y-4">
            {stylists.length === 0 && (
              <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 text-center">
                No team members yet. Invite your first stylist to assign access.
              </div>
            )}
            {stylists.map(s => (
              <button data-ui="button" key={s.id} onClick={() => setEditingStylist(s)} className="w-full flex items-center p-6 bg-white border-4 border-gray-100 rounded-3xl hover:border-brand-accent hover:shadow-md transition-all shadow-sm group">
                <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center font-black mr-5 text-lg">{s.name[0]}</div>
                <div className="flex-grow text-left">
                  <p className="font-black text-gray-950 text-lg">{s.name}</p>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{s.role}</p>
                </div>
                <ChevronRightIcon className="w-6 h-6 text-gray-300 group-hover:text-brand-accent transition-colors"/>
              </button>
            ))}
          </div>
        </div>

        <button data-ui="button" onClick={saveAll} className="w-full py-4 bg-gray-950 text-white font-black rounded-2xl">SAVE TEAM ACCESS</button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Toggle } from './Toggle';
import { SaveToast, useSaveToast } from './SaveToast';
import type { Stylist, StylistLevel } from '../types';

interface TeamAccessSettingsProps {
  onBack: () => void;
}

export default function TeamAccessSettings({ onBack }: TeamAccessSettingsProps) {
  const { levels, updateLevels, stylists, updateStylists, saveAll } = useSettings();
  const { toastVisible, showToast, hideToast } = useSaveToast();
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoadingStylistId, setPinLoadingStylistId] = useState<string | null>(null);
  const [pinMap, setPinMap] = useState<Record<string, string>>({});
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
      color: '#0B3559',
      order: levels.length + 1,
      defaultPermissions: fallbackPermissions,
    };
    updateLevels([...levels, nextLevel]);
  };

  const handleGeneratePin = async (stylist: Stylist) => {
    if (!supabase) return;

    setPinLoadingStylistId(stylist.id);
    setPinLoading(true);
    setPinError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please log in again.');

      const response = await fetch('/api/stylists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'generate-pin', squareTeamMemberId: stylist.id, name: stylist.name, email: stylist.email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to generate PIN.');

      setPinMap(prev => ({ ...prev, [stylist.id]: data.pin }));
      setPinLoadingStylistId(null);
    } catch (e: any) {
      setPinError(e.message || 'Failed to generate PIN.');
    } finally {
      setPinLoading(false);
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
        throw new Error(error.message || 'Failed to update stylist');
      }

      updateStylists(stylists.map(s => (s.id === stylist.id ? stylist : s)));
      setEditingStylist(null);
    } catch (e: any) {
      setStylistSaveError(e.message || 'Failed to save stylist changes.');
    } finally {
      setStylistSaveLoading(false);
    }
  };

  const renderStylists = () => (
    <div className="space-y-4 pb-8">
      {stylists.length === 0 ? (
        <div className="p-4 text-center text-sm font-medium bp-container-compact border-2 border-dashed text-foreground bg-muted border">
          No stylists on your team yet. Invite one to get started.
        </div>
      ) : (
        stylists.map((stylist) => {
          const isEditing = editingStylist?.id === stylist.id;
          const levelColor = levels.find(l => l.id === stylist.levelId)?.color || '#0B3559';

          return (
            <div key={stylist.id} className="bp-container-tall border-4 border bp-card-padding-md bg-card">
              {isEditing ? (
                <>
                  <div className="space-y-6">
                    <div>
                      <label className="block bp-overline mb-2">Level</label>
                      <select
                        data-ui="field"
                        value={stylist.levelId || ''}
                        onChange={(e) => {
                          const newStylist = { ...stylist, levelId: e.target.value };
                          setEditingStylist(newStylist);
                        }}
                        className="w-full px-4 py-3 border-2 border font-medium text-sm text-foreground focus:outline-none focus:border-sky"
                      >
                        {levels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <p className="bp-overline text-center">Custom permissions</p>
                      <div className="space-y-3">
                        {levelPermissionKeys.map((permKey) => {
                          const levelPerms = resolveLevelDefaults(stylist.levelId || '');
                          const levelDefault = levelPerms[permKey];
                          const stylistOverride = stylist.permissionOverrides?.[permKey];
                          const currentValue = stylistOverride !== undefined ? stylistOverride : levelDefault;

                          return (
                            <div key={permKey} className="flex items-center justify-between bp-card-padding-sm bp-container-compact bg-muted border-2 border">
                              <label className="text-xs font-medium capitalize text-foreground flex-1">
                                {permKey.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <Toggle
                                checked={currentValue}
                                onCheckedChange={(checked) => {
                                  const newStylist = {
                                    ...stylist,
                                    permissionOverrides: {
                                      ...stylist.permissionOverrides,
                                      [permKey]: checked,
                                    },
                                  };
                                  setEditingStylist(newStylist);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {stylistSaveError && (
                      <p className="text-xs text-red-600 font-medium text-center">{stylistSaveError}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        data-ui="button"
                        onClick={() => persistStylistUpdates(editingStylist!)}
                        disabled={stylistSaveLoading}
                        className="flex-1 px-4 py-3 text-xs uppercase tracking-widest disabled:opacity-50 bp-btn-primary"
                      >
                        {stylistSaveLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        data-ui="button"
                        onClick={() => setEditingStylist(null)}
                        className="flex-1 px-4 py-3 text-xs uppercase tracking-widest bp-btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{stylist.name}</p>
                      <p className="text-xs text-muted-foreground">{stylist.email || 'No email on file'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bp-container-compact text-xs font-bold bg-secondary text-secondary-foreground">
                        {levels.find(l => l.id === stylist.levelId)?.name || 'Unknown'}
                      </div>
                      <button
                        data-ui="button"
                        onClick={() => setEditingStylist(stylist)}
                        className="p-2 transition-colors hover:opacity-70 text-foreground"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {stylist.permissionOverrides && Object.keys(stylist.permissionOverrides).length > 0 && (
                        <p className="bp-caption">
                          {Object.keys(stylist.permissionOverrides).length} custom permission(s)
                        </p>
                      )}
                    </div>
                    <button
                      data-ui="button"
                      onClick={() => handleGeneratePin(stylist)}
                      disabled={pinLoading && pinLoadingStylistId === stylist.id}
                      className="px-4 py-1.5 text-xs uppercase tracking-widest bp-btn-primary disabled:opacity-50"
                    >
                      {pinLoading && pinLoadingStylistId === stylist.id ? 'Generating...' : pinMap[stylist.id] ? 'New PIN' : 'Generate PIN'}
                    </button>
                  </div>
                  {pinError && pinLoadingStylistId === stylist.id && (
                    <p className="text-xs text-red-600 font-medium mt-2">{pinError}</p>
                  )}
                  {pinMap[stylist.id] && (
                    <div className="mt-3 p-4 bg-muted bp-container-compact border border-border text-center">
                      <p className="bp-caption mb-3">Share this PIN with {stylist.name.split(' ')[0]}:</p>
                      <p className="text-4xl font-bold tracking-[0.3em] text-foreground mb-3">{pinMap[stylist.id]}</p>
                      <p className="bp-caption mb-2">Then have them go to:</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-xs px-3 py-2 bg-card border border-border bp-container-compact text-accent font-bold">
                          {window.location.origin}/join
                        </code>
                        <button
                          data-ui="button"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join`)}
                          className="px-3 py-2 text-xs uppercase tracking-widest bp-btn-primary whitespace-nowrap"
                        >
                          Copy
                        </button>
                      </div>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/join`)}`}
                        alt="QR Code"
                        className="mx-auto mt-4 w-28 h-28"
                      />
                      <p className="bp-caption mt-2 text-muted-foreground">PIN expires in 24 hours</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const renderLevels = () => (
    <div className="space-y-4 pb-8">
      {levels.length === 0 ? (
        <div className="p-4 text-center text-sm font-medium bp-container-compact border-2 border-dashed text-foreground bg-muted border">
          No levels yet. Click "Add level" to create one.
        </div>
      ) : (
        levels.map((level) => (
          <div key={level.id} className="bp-container-tall border-4 border bp-card-padding-md bg-card space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block bp-overline mb-2">Level name</label>
                <input
                  data-ui="field"
                  type="text"
                  value={level.name}
                  onChange={(e) => handleLevelUpdate(level.id, { name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border font-medium text-sm text-foreground focus:outline-none focus:border-sky"
                />
              </div>
              <div>
                <label className="block bp-overline mb-2">Color</label>
                <input
                  data-ui="field"
                  type="color"
                  value={level.color}
                  onChange={(e) => handleLevelUpdate(level.id, { color: e.target.value })}
                  className="w-full h-12 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="bp-overline text-center">Default permissions</p>
              <div className="space-y-3">
                {levelPermissionKeys.map((permKey) => (
                  <div key={permKey} className="flex items-center justify-between bp-card-padding-sm bp-container-compact bg-muted border-2 border">
                    <label className="text-xs font-medium capitalize text-muted-foreground flex-1">
                      {permKey.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <Toggle
                      checked={level.defaultPermissions[permKey]}
                      onCheckedChange={() => handleLevelPermissionToggle(level.id, permKey)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="bp-page">
      <button data-ui="button" onClick={onBack} className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back">
        <ChevronLeftIcon className="w-4 h-4 mr-1" />
        Back
      </button>

      <h2 className="bp-page-subtitle mb-8">Team Access</h2>

      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="bp-overline">Access Levels</p>
              <p className="bp-body text-foreground">Define permission tiers for team members.</p>
            </div>
            <button data-ui="button" onClick={handleAddLevel} className="px-4 py-2 text-xs uppercase tracking-widest bp-btn-primary">
              Add level
            </button>
          </div>
          {renderLevels()}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="bp-overline">Team Members</p>
              <p className="bp-body text-foreground">Synced from Square. Generate a PIN to give them app access.</p>
            </div>
          </div>

          {renderStylists()}
        </div>

        <button data-ui="button" onClick={() => saveAll().then(showToast)} className="w-full py-4 bp-btn-primary">
          SAVE ALL SETTINGS
        </button>
        <SaveToast visible={toastVisible} onDone={hideToast} />
      </div>
    </div>
  );
}

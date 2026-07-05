import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Toggle } from './Toggle';
import { SaveToast, useSaveToast } from './SaveToast';
import { ChevronLeftIcon } from './icons';
import type { MembershipTier } from '../types';

interface MembershipSetupProps {
  onBack: () => void;
}

export default function MembershipSetup({ onBack }: MembershipSetupProps) {
  const { membershipConfig, updateMembershipConfig, saveAll } = useSettings();
  const { toastVisible, showToast, hideToast } = useSaveToast();
  const [perkDrafts, setPerkDrafts] = useState<Record<string, string>>({});

  const handleMembershipToggle = () => {
    updateMembershipConfig(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const handleMembershipTierUpdate = (tierId: string, updates: Partial<MembershipTier>) => {
    updateMembershipConfig(prev => ({
      ...prev,
      tiers: prev.tiers.map(tier => (tier.id === tierId ? {
        ...tier,
        ...updates,
        // Ensure minSpend is always a number
        minSpend: updates.minSpend !== undefined ? Number(updates.minSpend) || 0 : tier.minSpend
      } : tier)),
    }));
  };

  const handleAddMembershipTier = () => {
    const newTier: MembershipTier = {
      id: `tier_${Date.now()}`,
      name: 'New Tier',
      minSpend: 0,
      perks: [],
      color: '#0B3559',
    };
    updateMembershipConfig(prev => ({
      ...prev,
      tiers: [...prev.tiers, newTier],
    }));
  };

  const handleAddTierPerk = (tierId: string) => {
    const nextPerk = perkDrafts[tierId]?.trim();
    if (!nextPerk) return;
    updateMembershipConfig(prev => ({
      ...prev,
      tiers: prev.tiers.map(tier => (
        tier.id === tierId
          ? { ...tier, perks: [...tier.perks, nextPerk] }
          : tier
      )),
    }));
    setPerkDrafts(prev => ({ ...prev, [tierId]: '' }));
  };

  const handleRemoveTierPerk = (tierId: string, perkIndex: number) => {
    updateMembershipConfig(prev => ({
      ...prev,
      tiers: prev.tiers.map(tier => (
        tier.id === tierId
          ? { ...tier, perks: tier.perks.filter((_, index) => index !== perkIndex) }
          : tier
      )),
    }));
  };

  return (
    <div className="bp-page">
      <button data-ui="button" onClick={onBack} className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back"><ChevronLeftIcon className="w-4 h-4 mr-1" /> Back</button>
      <h2 className="bp-page-subtitle mb-8">Memberships</h2>
      <div className="space-y-6">
        <div className="bg-card bp-card-padding-md bp-container-list border-4 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="bp-overline">Memberships</p>
              <p className="bp-body text-foreground">Offer memberships from projected yearly totals.</p>
            </div>
            <Toggle
              checked={membershipConfig.enabled}
              onCheckedChange={handleMembershipToggle}
            />
          </div>
          <p className="bp-body-sm mt-4">{"Membership pricing is based on the monthly average of the client’s projected yearly spend."}</p>
        </div>

        <div className="bg-card bp-card-padding-md bp-container-tall border-4 border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="bp-overline">Membership tiers</p>
              <p className="bp-body text-foreground">Set minimum spend and benefits.</p>
            </div>
            <button data-ui="button" onClick={handleAddMembershipTier} className="px-4 py-2 text-xs uppercase tracking-widest bp-btn-primary">Add tier</button>
          </div>

          <div className="space-y-4">
            {membershipConfig.tiers.length === 0 && (
              <div className="p-4 bp-container-list border-2 border-dashed text-xs font-medium text-center border text-muted-foreground">
                No membership tiers yet. Add your first tier to get started.
              </div>
            )}
            {membershipConfig.tiers.map((tier) => (
              <div key={tier.id} className="bp-container-tall border-4 border bp-card-padding-md">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block bp-overline mb-2">Tier name</label>
                    <input
                      data-ui="field"
                      type="text"
                      value={tier.name}
                      onChange={(event) => handleMembershipTierUpdate(tier.id, { name: event.target.value })}
                      className="w-full px-4 py-3 border-2 border font-medium text-sm text-foreground focus:outline-none focus:border-sky"
                    />
                  </div>
                  <div>
                    <label className="block bp-overline mb-2">Minimum monthly spend</label>
                    <input
                      data-ui="field"
                      type="number"
                      min={0}
                      value={tier.minSpend || 0}
                      onChange={(event) => {
                        const value = event.target.value;
                        // Prevent empty values and ensure proper number conversion
                        const numValue = value === '' ? 0 : Number(value);
                        handleMembershipTierUpdate(tier.id, { minSpend: numValue });
                      }}
                      className="w-full px-4 py-3 border-2 border font-medium text-sm text-foreground focus:outline-none focus:border-sky"
                    />
                  </div>
                  <div>
                    <label className="block bp-overline mb-2">Tier color</label>
                    <input
                      data-ui="field"
                      type="color"
                      value={tier.color}
                      onChange={(event) => handleMembershipTierUpdate(tier.id, { color: event.target.value })}
                      className="w-full h-12 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="bp-overline">{"Perks & benefits"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tier.perks.map((perk, index) => (
                      <div key={`${tier.id}-perk-${index}`} className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
                        <span>{perk}</span>
                        <button
                          data-ui="button"
                          type="button"
                          onClick={() => handleRemoveTierPerk(tier.id, index)}
                          className="hover:opacity-70 text-muted-foreground"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      data-ui="field"
                      type="text"
                      value={perkDrafts[tier.id] || ''}
                      onChange={(event) => setPerkDrafts(prev => ({ ...prev, [tier.id]: event.target.value }))}
                      placeholder="Add a perk"
                      className="flex-1 min-w-[200px] px-4 py-3 border-2 border font-medium text-sm text-foreground focus:outline-none focus:border-sky"
                    />
                    <button
                      data-ui="button"
                      type="button"
                      onClick={() => handleAddTierPerk(tier.id)}
                      className="px-4 py-3 text-xs uppercase tracking-widest bp-btn-primary"
                    >
                      Add perk
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button data-ui="button" onClick={() => saveAll().then(showToast)} className="w-full py-4 bp-btn-primary">SAVE MEMBERSHIP SETTINGS</button>
        <SaveToast visible={toastVisible} onDone={hideToast} />
      </div>
    </div>
  );
}

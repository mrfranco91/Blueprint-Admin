import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Toggle } from './Toggle';
import { ChevronLeftIcon } from './icons';
import type { MembershipTier } from '../types';

interface MembershipSetupProps {
  onBack: () => void;
}

export default function MembershipSetup({ onBack }: MembershipSetupProps) {
  const { membershipConfig, updateMembershipConfig, saveAll } = useSettings();
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
      tiers: prev.tiers.map(tier => (tier.id === tierId ? { ...tier, ...updates } : tier)),
    }));
  };

  const handleAddMembershipTier = () => {
    const newTier: MembershipTier = {
      id: `tier_${Date.now()}`,
      name: 'New Tier',
      minSpend: 0,
      perks: [],
      color: '#111827',
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
    <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <button onClick={onBack} className="mb-6 flex items-center text-xs font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
      <h2 className="text-4xl font-black mb-8 text-brand-accent">Memberships</h2>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-[32px] border-4 border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Memberships</p>
              <p className="text-sm font-black text-gray-900">Offer memberships from projected yearly totals.</p>
            </div>
            <Toggle
              checked={membershipConfig.enabled}
              onCheckedChange={handleMembershipToggle}
            />
          </div>
          <p className="text-xs font-bold text-gray-500 mt-4">Membership pricing is based on the monthly average of the client’s projected yearly spend.</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-4 border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Membership tiers</p>
              <p className="text-sm font-black text-gray-900">Set minimum spend and benefits.</p>
            </div>
            <button onClick={handleAddMembershipTier} className="px-4 py-2 bg-gray-950 text-white font-black rounded-2xl text-xs uppercase tracking-widest">Add tier</button>
          </div>

          <div className="space-y-4">
            {membershipConfig.tiers.length === 0 && (
              <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 text-center">
                No membership tiers yet. Add your first tier to get started.
              </div>
            )}
            {membershipConfig.tiers.map((tier) => (
              <div key={tier.id} className="rounded-2xl border-2 border-gray-100 p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Tier name</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(event) => handleMembershipTierUpdate(tier.id, { name: event.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Minimum monthly spend</label>
                    <input
                      type="number"
                      min={0}
                      value={tier.minSpend}
                      onChange={(event) => handleMembershipTierUpdate(tier.id, { minSpend: Number(event.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Tier color</label>
                    <input
                      type="color"
                      value={tier.color}
                      onChange={(event) => handleMembershipTierUpdate(tier.id, { color: event.target.value })}
                      className="w-full h-12 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Perks & benefits</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tier.perks.map((perk, index) => (
                      <div key={`${tier.id}-perk-${index}`} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-xs font-bold text-gray-700">
                        <span>{perk}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTierPerk(tier.id, index)}
                          className="text-gray-400 hover:text-gray-900"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={perkDrafts[tier.id] || ''}
                      onChange={(event) => setPerkDrafts(prev => ({ ...prev, [tier.id]: event.target.value }))}
                      placeholder="Add a perk"
                      className="flex-1 min-w-[200px] px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-gray-950"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTierPerk(tier.id)}
                      className="px-4 py-3 bg-gray-950 text-white font-black rounded-2xl text-xs uppercase tracking-widest"
                    >
                      Add perk
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={saveAll} className="w-full py-4 bg-gray-950 text-white font-black rounded-2xl">SAVE MEMBERSHIP SETTINGS</button>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNav, { Tab } from './BottomNav';
import { useSettings } from '../contexts/SettingsContext';
import { usePlans } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    CheckCircleIcon,
    UsersIcon,
    GlobeIcon,
    SettingsIcon,
    ChevronLeftIcon
} from './icons';
import type { UserRole, GeneratedPlan } from '../types';
import { GOOGLE_FONTS_LIST } from '../data/fonts';
import AdminAccountSettings from './AdminAccountSettings';
import PlanSummaryStep from './PlanSummaryStep';
import StylistDashboard from './StylistDashboard';
import TeamAccessSettings from './TeamAccessSettings';
import MembershipSettings from './MembershipSettings';
import { canCustomizeBranding } from '../utils/isEnterpriseAccount';

export default function AdminDashboardV2({ role }: { role: UserRole }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeSettingsView, setActiveSettingsView] = useState<'menu' | 'branding' | 'account' | 'team' | 'memberships'>('menu');
  const [editingPlan, setEditingPlan] = useState<GeneratedPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const {
    branding, updateBranding,
    clients,
    saveAll
  } = useSettings();
  const { plans, getStats } = usePlans();
  const { user, logout } = useAuth();

  const stats = getStats();
  const totalPipeline = plans.filter(p => p.status === 'active' || p.status === 'draft').reduce((sum, p) => sum + p.totalCost, 0);

  const pipelineGrowthData = useMemo(() => {
    const sortedPlans = [...plans].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let cumulativeValue = 0;
    const dataMap = new Map<string, number>();
    sortedPlans.forEach(plan => {
      const month = new Date(plan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      cumulativeValue += plan.totalCost;
      dataMap.set(month, cumulativeValue);
    });
    const lastSixMonths = [];
    const today = new Date();
    for(let i=5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      lastSixMonths.push(d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
    }
    let lastValue = 0;
    return lastSixMonths.map(month => {
      if(dataMap.has(month)) lastValue = dataMap.get(month)!;
      return { name: month, value: lastValue };
    });
  }, [plans]);

  const renderDashboard = () => (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <h1 className="text-4xl font-black text-black tracking-tighter mb-8">Admin Dashboard v2</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2 bg-gray-950 text-white p-8 rounded-[32px] border-4 border-gray-950 shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-sm font-black uppercase text-gray-400 mb-2 tracking-widest">Roadmap Pipeline</p>
          <p className="text-6xl font-black text-brand-secondary">${totalPipeline.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border-4 border-gray-100 shadow-sm hover:shadow-md hover:border-brand-accent transition-all">
          <p className="text-[10px] text-gray-500 font-black uppercase mb-3 tracking-widest">Active Plans</p>
          <p className="text-5xl font-black text-black">{stats.activePlansCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border-4 border-gray-100 shadow-sm hover:shadow-md hover:border-brand-accent transition-all">
          <p className="text-[10px] text-gray-500 font-black uppercase mb-3 tracking-widest">Total Clients</p>
          <p className="text-5xl font-black text-black">{clients.length}</p>
        </div>
      </div>
      <div className="bg-white p-7 rounded-3xl border-4 border-gray-100 shadow-sm hover:shadow-md transition-shadow mb-6">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Pipeline Growth</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pipelineGrowthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <Area type="monotone" dataKey="value" stroke="var(--color-brand-secondary)" fill="var(--color-brand-secondary)" fillOpacity={0.1} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => {
    if (activeSettingsView === 'branding') {
      // ENTERPRISE FEATURE: Branding customization is only available for enterprise accounts
      // This view should not be accessible for standard accounts (menu item is conditionally hidden)
      return (
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-xs font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
          <h2 className="text-4xl font-black mb-8 text-brand-accent">Branding</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase mb-2">Salon Name</label>
              <input type="text" value={branding.salonName} onChange={e => updateBranding({...branding, salonName: e.target.value})} className="w-full p-4 border-4 border-gray-100 rounded-2xl font-black outline-none focus:border-brand-accent"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2">Primary Color</label>
                <input type="color" value={branding.primaryColor} onChange={e => updateBranding({...branding, primaryColor: e.target.value})} className="w-full h-12 rounded-xl cursor-pointer"/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-2">Accent Color</label>
                <input type="color" value={branding.accentColor} onChange={e => updateBranding({...branding, accentColor: e.target.value})} className="w-full h-12 rounded-xl cursor-pointer"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-2">Font</label>
              <select value={branding.font} onChange={e => updateBranding({...branding, font: e.target.value})} className="w-full p-4 border-4 border-gray-100 rounded-2xl font-black outline-none">
                {GOOGLE_FONTS_LIST.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <button onClick={() => { saveAll(); setActiveSettingsView('menu'); }} className="w-full py-4 bg-gray-950 text-white font-black rounded-2xl">SAVE CHANGES</button>
          </div>
        </div>
      );
    }

    if (activeSettingsView === 'account') {
      return (
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-xs font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
          <AdminAccountSettings user={user} onLogout={logout} subtitle="System Controller" />
        </div>
      );
    }

    if (activeSettingsView === 'team') {
      return <TeamAccessSettings onBack={() => setActiveSettingsView('menu')} />;
    }

    if (activeSettingsView === 'memberships') {
      return <MembershipSettings onBack={() => setActiveSettingsView('menu')} />;
    }

    return (
      <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
        <h1 className="text-4xl font-black text-black tracking-tighter mb-8">Admin Settings</h1>
        <div className={`grid gap-6 mb-8 ${canCustomizeBranding(user) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button onClick={() => setActiveSettingsView('account')} className="p-8 bg-white border-4 border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-brand-accent hover:shadow-md transition-all shadow-sm">
            <SettingsIcon className="w-10 h-10 text-brand-primary"/>
            <span className="text-[10px] font-black uppercase tracking-widest">Admin Account Settings</span>
          </button>
          <button onClick={() => setActiveSettingsView('team')} className="p-8 bg-white border-4 border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-brand-accent hover:shadow-md transition-all shadow-sm">
            <UsersIcon className="w-10 h-10 text-brand-primary"/>
            <span className="text-[10px] font-black uppercase tracking-widest">Team Access</span>
          </button>
          <button onClick={() => setActiveSettingsView('memberships')} className="p-8 bg-white border-4 border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-brand-accent hover:shadow-md transition-all shadow-sm">
            <CheckCircleIcon className="w-10 h-10 text-brand-primary"/>
            <span className="text-[10px] font-black uppercase tracking-widest">Memberships</span>
          </button>
          {canCustomizeBranding(user) && (
            <button onClick={() => setActiveSettingsView('branding')} className="p-8 bg-white border-4 border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-brand-accent hover:shadow-md transition-all shadow-sm">
              <GlobeIcon className="w-10 h-10 text-brand-primary"/>
              <span className="text-[10px] font-black uppercase tracking-widest">Branding</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPlans = () => (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-black tracking-tighter">Plans</h1>
        <button onClick={() => setIsCreatingPlan(true)} className="bg-brand-accent text-white px-8 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-lg hover:shadow-xl">+ NEW PLAN</button>
      </div>
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border-4 border-gray-100 rounded-3xl shadow-sm">
            <p className="font-black text-lg mb-2 text-gray-950">No plans yet</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Create your first plan to get started</p>
          </div>
        ) : (
          plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setEditingPlan(plan)}
              className="w-full text-left p-6 bg-white border-4 border-gray-100 rounded-3xl shadow-sm hover:shadow-md hover:border-brand-accent active:scale-95 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-black text-gray-950 text-xl">{plan.client?.name || 'Unnamed Client'}</h3>
                <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'draft' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {plan.status}
                </span>
              </div>
              <p className="text-lg font-black text-brand-primary mb-2">${plan.totalCost?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-500 font-bold">{plan.description || 'No description'}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const renderActiveTab = () => {
    // If creating or editing a plan, show the plan wizard
    if (isCreatingPlan || editingPlan !== null) {
      return (
        <StylistDashboard
          role="admin"
          onLogout={() => {}}
          client={editingPlan?.client}
          existingPlan={editingPlan || undefined}
          onPlanChange={(plan) => {
            setEditingPlan(plan);
            if (!plan) {
              setIsCreatingPlan(false);
              setActiveTab('plans');
            }
          }}
          initialStep={isCreatingPlan ? 'select-client' : (editingPlan ? 'summary' : undefined)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'plans': return renderPlans();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setEditingPlan(null);
    if (tab === 'settings') {
      setActiveSettingsView('menu');
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg pb-24">
      {renderActiveTab()}
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}

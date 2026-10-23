import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNav, { Tab } from './BottomNav';
import ThemeToggle from './ThemeToggle';
import { useSettings } from '../contexts/SettingsContext';
import { usePlans } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import {
    CheckCircleIcon,
    GlobeIcon,
    SettingsIcon,
    ChevronLeftIcon
} from './icons';
import type { UserRole, GeneratedPlan } from '../types';
import { GOOGLE_FONTS_LIST } from '../data/fonts';
import AccountSettings from './AccountSettings';
import PlanWizard from './PlanWizard';
import MembershipSetup from './MembershipSetup';
import TeamAccessSettings from './TeamAccessSettings';
import { canCustomizeBranding } from '../utils/isEnterpriseAccount';

export default function AdminDashboardV2({ role }: { role: UserRole }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeSettingsView, setActiveSettingsView] = useState<'menu' | 'branding' | 'account' | 'memberships' | 'teamAccess' | 'appearance'>('menu');
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

  const plansByMonth = useMemo(() => {
    const counts = new Map<string, number>();
    plans.forEach(plan => {
      const d = new Date(plan.createdAt);
      const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const today = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      return { name: key, count: counts.get(key) || 0 };
    });
  }, [plans]);

  const renderDashboard = () => (
    <div className="bp-page">
      <h1 className="bp-page-title">Dashboard</h1>
      {user?.name && <p className="bp-subtitle">Welcome back, {user.name.split(' ')[0]}</p>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2 p-8 bg-primary text-primary-foreground bp-container-list border-4 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col items-center justify-center text-center h-full py-4">
            <p className="bp-section-title mb-3 text-primary-foreground">Roadmap Pipeline</p>
            <p className="text-5xl bp-stat-value text-primary-foreground">${totalPipeline.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card p-4 bp-container-list shadow-sm hover:shadow-md transition-all elevated-card">
          <p className="bp-overline mb-1 text-center">Active Plans</p>
          <p className="text-4xl bp-stat-value text-center mb-1">{stats.activePlansCount}</p>
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart accessibilityLayer={false} aria-hidden="true" data={plansByMonth} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
              <Area isAnimationActive={false} type="monotone" dataKey="count" stroke="var(--chart-line)" fill="var(--accent)" fillOpacity={0.35} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card p-4 bp-container-list shadow-sm hover:shadow-md transition-all elevated-card">
          <p className="bp-overline mb-1 text-center">Total Clients</p>
          <p className="text-4xl bp-stat-value text-center mb-2">{clients.length}</p>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (clients.length / Math.max(clients.length, 50)) * 100)}%` }}
            />
          </div>
          <p className="bp-caption text-center mt-1">{clients.length >= 50 ? 'Full roster' : `${50 - clients.length} to next milestone`}</p>
        </div>
      </div>
      <div className="bg-card p-7 bp-container-tall shadow-sm hover:shadow-md transition-shadow mb-6 elevated-card">
        <h2 className="bp-section-title mb-4">Pipeline Growth</h2>
        <div className="w-full h-56 p-2" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart accessibilityLayer={false} data={pipelineGrowthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(val) => `$${val / 1000}k`} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Area isAnimationActive={false} type="monotone" dataKey="value" stroke="var(--chart-line)" fill="var(--accent)" fillOpacity={0.3} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">View pipeline growth data</summary>
          <table className="w-full mt-3 text-left">
            <caption className="sr-only">Pipeline growth by month</caption>
            <thead><tr><th scope="col">Month</th><th scope="col">Pipeline value</th></tr></thead>
            <tbody>{pipelineGrowthData.map(point => (
              <tr key={point.name}><th scope="row">{point.name}</th><td>${point.value.toLocaleString()}</td></tr>
            ))}</tbody>
          </table>
        </details>
      </div>

    </div>
  );

  const renderSettings = () => {
    if (activeSettingsView === 'appearance') {
      return <div className="bp-page">
        <button className="bp-back mb-6" onClick={() => setActiveSettingsView('menu')}>Back</button>
        <h1 className="bp-page-title">Appearance</h1>
        <div className="bg-card bp-container-list p-6"><ThemeToggle /></div>
      </div>;
    }
    if (activeSettingsView === 'branding') {
      // ENTERPRISE FEATURE: Branding customization is only available for enterprise accounts
      // This view should not be accessible for standard accounts (menu item is conditionally hidden)
      return (
        <div className="bp-page">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-xs font-black uppercase text-muted-foreground hover:text-foreground transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
          <h1 className="bp-page-title">Branding</h1>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase mb-2">Salon Name</label>
              <input type="text" value={branding.salonName} onChange={e => updateBranding({...branding, salonName: e.target.value})} className="w-full p-4 border-4 border-border rounded-2xl font-black outline-none focus:border-ring"/>
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
              <select value={branding.font} onChange={e => updateBranding({...branding, font: e.target.value})} className="w-full p-4 border-4 border-border rounded-2xl font-black outline-none">
                {GOOGLE_FONTS_LIST.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <button onClick={() => { saveAll(); setActiveSettingsView('menu'); }} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-2xl">SAVE CHANGES</button>
          </div>
        </div>
      );
    }

    if (activeSettingsView === 'account') {
      return (
        <div className="bp-page">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-xs font-black uppercase text-muted-foreground hover:text-foreground transition-colors"><ChevronLeftIcon className="w-4 h-4 mr-1"/> Back</button>
          <AccountSettings user={user} onLogout={logout} subtitle="System Controller" />
        </div>
      );
    }

    if (activeSettingsView === 'memberships') {
      return <MembershipSetup onBack={() => setActiveSettingsView('menu')} />;
    }

    if (activeSettingsView === 'teamAccess') {
      return <TeamAccessSettings onBack={() => setActiveSettingsView('menu')} />;
    }

    return (
      <div className="bp-page">
        <h1 className="bp-page-title">Settings</h1>
        <button onClick={() => setActiveSettingsView('appearance')} className="bg-card bp-container-list p-6 mb-6 w-full text-left font-semibold">Appearance</button>
        <div className={`grid gap-6 mb-8 ${canCustomizeBranding(user) ? 'grid-cols-2' : 'grid-cols-2'}`}>
          <button onClick={() => setActiveSettingsView('account')} className="p-8 bg-card border-4 border-border rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-ring hover:shadow-md transition-all shadow-sm">
            <SettingsIcon className="w-10 h-10 text-card-foreground"/>
            <span className="text-[10px] font-black uppercase tracking-widest">Account</span>
          </button>
          <button onClick={() => setActiveSettingsView('teamAccess')} className="p-8 bg-card border-4 border-border rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-ring hover:shadow-md transition-all shadow-sm">
            <CheckCircleIcon className="w-10 h-10 text-card-foreground"/>
            <span className="text-[10px] font-black uppercase tracking-widest">Team Access</span>
          </button>
          <button onClick={() => setActiveSettingsView('memberships')} className="p-8 bg-card border-4 border-border rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-ring hover:shadow-md transition-all shadow-sm">
            <CheckCircleIcon className="w-10 h-10 text-card-foreground"/>
            <span className="text-[10px] font-black uppercase tracking-widest">Memberships</span>
          </button>
          {canCustomizeBranding(user) && (
            <button onClick={() => setActiveSettingsView('branding')} className="p-8 bg-card border-4 border-border rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-ring hover:shadow-md transition-all shadow-sm">
              <GlobeIcon className="w-10 h-10 text-card-foreground"/>
              <span className="text-[10px] font-black uppercase tracking-widest">Branding</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPlans = () => (
    <div className="bp-page">
      <h1 className="bp-page-title">Plans</h1>
      <div className="flex justify-end mb-6">
        <button onClick={() => setIsCreatingPlan(true)} className="px-8 py-3 text-sm active:scale-95 transition-transform shadow-lg hover:shadow-xl bp-btn-primary">+ NEW PLAN</button>
      </div>
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card bp-container-list shadow-sm elevated-card">
            <p className="bp-section-title mb-2">No plans yet</p>
            <p className="bp-overline">Create your first plan to get started</p>
          </div>
        ) : (
          plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setEditingPlan(plan)}
              className="w-full text-left bp-card-padding-md bg-card bp-container-list shadow-sm hover:shadow-md active:scale-95 transition-all elevated-card"
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="bp-card-title">{plan.client?.name || 'Unnamed Client'}</h2>
                <span data-status={plan.status} className="bp-overline bp-status px-3 py-1.5 rounded-full">
                  {plan.status}
                </span>
              </div>
              <p className="text-lg font-bold mb-2 text-foreground">${plan.totalCost?.toLocaleString() || '0'}</p>
              <p className="bp-body-sm">{(plan as any).description || 'No description'}</p>
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
        <PlanWizard
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
    <div className="flex flex-col h-full bg-background bp-app-shell min-h-screen">
      <main id="main-content">{renderActiveTab()}</main>
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}

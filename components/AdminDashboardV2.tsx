import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNav, { Tab } from './BottomNav';
import { useSettings } from '../contexts/SettingsContext';
import { usePlans } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircleIcon,
  GlobeIcon,
  SettingsIcon,
  ChevronLeftIcon,
  SunIcon,
  UsersIcon,
  LayoutDashboardIcon,
} from './icons';
import ReportsPanel from './ReportsPanel';
import DashboardCustomization from './DashboardCustomization';
import { computeReportMetrics, getWidgetValue, DASHBOARD_WIDGETS, DEFAULT_PINNED_ADMIN } from '../utils/reportMetrics';
import type { UserRole, GeneratedPlan } from '../types';
import { GOOGLE_FONTS_LIST } from '../data/fonts';
import AccountSettings from './AccountSettings';
import PlanWizard from './PlanWizard';
import MembershipSetup from './MembershipSetup';
import TeamAccessSettings from './TeamAccessSettings';
import ThemeToggle from './ThemeToggle';
import { SaveToast, useSaveToast } from './SaveToast';
import { canCustomizeBranding } from '../utils/isEnterpriseAccount';

export default function AdminDashboardV2({ role }: { role: UserRole }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeSettingsView, setActiveSettingsView] = useState<'menu' | 'branding' | 'account' | 'memberships' | 'teamAccess' | 'appearance' | 'dashboardCustomization'>('menu');
  const [editingPlan, setEditingPlan] = useState<GeneratedPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const {
    branding, updateBranding,
    clients,
    textSize, updateTextSize,
    pinnedReports, updatePinnedReports,
    saveAll
  } = useSettings();
  const { toastVisible, showToast, hideToast } = useSaveToast();
  const { plans, bookings, getStats } = usePlans();
  console.log('[AdminDashboardV2] render — clients:', clients.length, 'plans:', plans.length);
  const { user, updateUser, logout } = useAuth();

  const stats = getStats();
  const totalPipeline = plans.filter(p => p.status === 'active' || p.status === 'draft').reduce((sum, p) => sum + p.totalCost, 0);

  const metrics = useMemo(
    () => computeReportMetrics(plans, bookings as any, clients.length),
    [plans, bookings, clients.length]
  );

  const pinnedWidgetIds = useMemo(() => {
    const ids = user?.id ? (pinnedReports[String(user.id)] ?? DEFAULT_PINNED_ADMIN) : DEFAULT_PINNED_ADMIN;
    return ids.filter(id => DASHBOARD_WIDGETS.find(w => w.id === id && w.roles.includes('admin')));
  }, [pinnedReports, user?.id]);

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
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      lastSixMonths.push(d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
    }
    let lastValue = 0;
    return lastSixMonths.map(month => {
      if (dataMap.has(month)) lastValue = dataMap.get(month)!;
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

  const hasPinnedCustomization = user?.id ? pinnedReports[String(user.id)] !== undefined : false;

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
            <AreaChart data={plansByMonth} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
              <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.35} strokeWidth={2} dot={false} />
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
        <h3 className="bp-section-title mb-4">Pipeline Growth</h3>
        <div className="w-full h-56 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pipelineGrowthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(val) => `$${val / 1000}k`} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pinned metrics — only rendered after user explicitly customizes via Settings → Dashboard */}
      {hasPinnedCustomization && pinnedWidgetIds.length > 0 && (
        <div className="mb-6">
          <h3 className="bp-section-title mb-4">My Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {pinnedWidgetIds.map((id, idx) => {
              const widget = DASHBOARD_WIDGETS.find(w => w.id === id);
              if (!widget) return null;
              const { value, sub } = getWidgetValue(id, metrics);
              const isWide = pinnedWidgetIds.length % 2 !== 0 && idx === pinnedWidgetIds.length - 1;
              return (
                <div
                  key={id}
                  className={`bg-card p-6 bp-container-list shadow-sm hover:shadow-md transition-all elevated-card ${isWide ? 'col-span-2' : ''}`}
                >
                  <p className="bp-overline mb-2">{widget.title}</p>
                  <p className="text-3xl bp-stat-value">{value}</p>
                  {sub && <p className="bp-caption mt-1 text-muted-foreground">{sub}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <ReportsPanel role="admin" metrics={metrics} />
  );

  const renderSettings = () => {
    if (activeSettingsView === 'branding') {
      return (
        <div className="bp-page">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back"><ChevronLeftIcon className="w-4 h-4 mr-1" /> Back</button>
          <h2 className="bp-page-subtitle mb-8">Branding</h2>
          <div className="space-y-6">
            <div>
              <label className="block bp-overline mb-2">Salon Name</label>
              <input type="text" value={branding.salonName} onChange={e => updateBranding({ ...branding, salonName: e.target.value })} className="w-full p-4 border-4 rounded-full font-semibold outline-none border text-foreground focus:border-sky" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block bp-overline mb-2">Primary Color</label>
                <input type="color" value={branding.primaryColor} onChange={e => updateBranding({ ...branding, primaryColor: e.target.value })} className="w-full h-12 rounded-full cursor-pointer" />
              </div>
              <div>
                <label className="block bp-overline mb-2">Accent Color</label>
                <input type="color" value={branding.accentColor} onChange={e => updateBranding({ ...branding, accentColor: e.target.value })} className="w-full h-12 rounded-full cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="block bp-overline mb-2">Font</label>
              <select value={branding.font} onChange={e => updateBranding({ ...branding, font: e.target.value })} className="w-full p-4 border-4 rounded-full font-semibold outline-none border text-foreground">
                {GOOGLE_FONTS_LIST.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <button onClick={() => { saveAll().then(showToast); }} className="w-full py-4 rounded-full bp-btn-primary">SAVE CHANGES</button>
          </div>
        </div>
      );
    }

    if (activeSettingsView === 'account') {
      return (
        <div className="bp-page">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back"><ChevronLeftIcon className="w-4 h-4 mr-1" /> Back</button>
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

    if (activeSettingsView === 'dashboardCustomization') {
      return (
        <DashboardCustomization
          role="admin"
          userId={user?.id ?? ''}
          pinnedReports={pinnedReports}
          onUpdatePinned={(ids) => {
            updatePinnedReports(user?.id ?? '', ids);
            saveAll();
          }}
          onBack={() => setActiveSettingsView('menu')}
        />
      );
    }

    if (activeSettingsView === 'appearance') {
      const MAX_AVATAR_SIZE = 500 * 1024; // 500 KB

      const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > MAX_AVATAR_SIZE) {
          alert('Image is too large. Please choose an image under 500 KB.');
          e.target.value = '';
          return;
        }

        // Upload to Supabase Storage (no base64 optimistic preview — it bloats the JWT)
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

      return (
        <div className="bp-page">
          <button onClick={() => setActiveSettingsView('menu')} className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back"><ChevronLeftIcon className="w-4 h-4 mr-1" /> Back</button>
          <h2 className="bp-page-subtitle mb-8">Appearance</h2>
          <div className="space-y-6">
            <div className="bg-card p-8 bp-container-list border border-border shadow-sm text-center">
              <input type="file" accept="image/*" id="avatar-upload" className="hidden" onChange={handleAvatarChange} />
              <label htmlFor="avatar-upload" className="cursor-pointer block">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-24 h-24 bp-container-tall mx-auto mb-4 border-4 border-primary shadow-lg object-cover hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-24 h-24 bp-container-tall mx-auto mb-4 flex items-center justify-center text-4xl font-bold shadow-xl border-4 bg-primary text-primary-foreground border-primary hover:opacity-80 transition-opacity">{user?.name?.[0]}</div>
                )}
                <span className="bp-overline text-accent">Change Profile Photo</span>
              </label>
            </div>

            <div className="bg-card p-6 bp-container-tall border border-border shadow-sm space-y-6">
              <div>
                <h3 className="bp-overline mb-4">Theme</h3>
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
          </div>
        </div>
      );
    }

    return (
      <div className="bp-page">
        <h1 className="bp-page-title">Settings</h1>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <button onClick={() => setActiveSettingsView('account')} className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card">
            <SettingsIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Account</span>
          </button>
          <button onClick={() => setActiveSettingsView('appearance')} className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card">
            <SunIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Appearance</span>
          </button>
          <button onClick={() => setActiveSettingsView('teamAccess')} className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card">
            <UsersIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Team Access</span>
          </button>
          <button onClick={() => setActiveSettingsView('memberships')} className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card">
            <CheckCircleIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Memberships</span>
          </button>
          {canCustomizeBranding(user) && (
            <button onClick={() => setActiveSettingsView('branding')} className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card">
              <GlobeIcon className="w-10 h-10 text-primary" />
              <span className="bp-overline">Branding</span>
            </button>
          )}
          <button onClick={() => setActiveSettingsView('dashboardCustomization')} className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card">
            <LayoutDashboardIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Dashboard</span>
          </button>
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
                <h3 className="bp-card-title">{plan.client?.name || 'Unnamed Client'}</h3>
                <span className={`bp-overline px-3 py-1.5 rounded-full ${plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'draft' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
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
      case 'reports': return renderReports();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setEditingPlan(null);
    setIsCreatingPlan(false);
    if (tab === 'settings') {
      setActiveSettingsView('menu');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background bp-app-shell min-h-screen pb-24 safe-area-bottom">
      <div className="flex-1 overflow-auto pb-8 px-4">
        {renderActiveTab()}
      </div>
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
      <SaveToast visible={toastVisible} onDone={hideToast} />
    </div>
  );
}

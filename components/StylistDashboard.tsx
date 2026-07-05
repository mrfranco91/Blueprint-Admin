import React, { useState, useMemo } from 'react';
import BottomNav, { Tab } from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { usePlans } from '../contexts/PlanContext';
import { CalendarIcon, SettingsIcon, ChevronRightIcon, LayoutDashboardIcon, SunIcon } from './icons';
import AccountSettings from './AccountSettings';
import PlanWizard from './PlanWizard';
import ReportsPanel from './ReportsPanel';
import DashboardCustomization from './DashboardCustomization';
import { computeReportMetrics, getWidgetValue, DASHBOARD_WIDGETS, DEFAULT_PINNED_STYLIST } from '../utils/reportMetrics';
import type { GeneratedPlan, StylistPermissions } from '../types';

const FALLBACK_PERMISSIONS: StylistPermissions = {
  canBookAppointments: true,
  canOfferDiscounts: false,
  requiresDiscountApproval: true,
  viewGlobalReports: false,
  viewClientContact: true,
  viewAllSalonPlans: false,
  can_book_own_schedule: true,
  can_book_peer_schedules: false,
};

export default function StylistDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [editingPlan, setEditingPlan] = useState<GeneratedPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [settingsView, setSettingsView] = useState<'menu' | 'account' | 'dashboardCustomization'>('menu');

  const { user, logout } = useAuth();
  const { services: allServices, clients, stylists, levels, pinnedReports, updatePinnedReports, saveAll } = useSettings();
  const { plans, bookings } = usePlans();

  const stylistId = user?.stylistData?.id || user?.id;

  // Resolve effective permissions: find this stylist in the loaded team list (which has
  // level-defaults already merged), falling back to user metadata + level defaults.
  const effectivePermissions = useMemo((): StylistPermissions => {
    const record = stylists.find(s => s.id === stylistId);
    if (record?.permissions) return record.permissions as StylistPermissions;
    const levelId = user?.stylistData?.levelId;
    const levelDefaults = levels.find(l => l.id === levelId)?.defaultPermissions || FALLBACK_PERMISSIONS;
    const overrides = (user?.stylistData?.permissions || {}) as Partial<StylistPermissions>;
    return { ...levelDefaults, ...overrides };
  }, [stylists, stylistId, user, levels]);

  // Filter plans assigned to this stylist
  const myPlans = useMemo(() => {
    if (!stylistId) return plans;
    return plans.filter(p => p.stylistId === stylistId || p.stylistName === user?.name);
  }, [plans, stylistId, user?.name]);

  // Respect viewAllSalonPlans permission
  const visiblePlans = useMemo(
    () => effectivePermissions.viewAllSalonPlans ? plans : myPlans,
    [effectivePermissions.viewAllSalonPlans, plans, myPlans]
  );

  // Tabs to hide in the bottom nav based on permissions
  const hiddenNavTabs = useMemo((): Tab[] => {
    const hidden: Tab[] = [];
    if (!effectivePermissions.viewGlobalReports) hidden.push('reports');
    return hidden;
  }, [effectivePermissions.viewGlobalReports]);

  // Upcoming appointments across all my plans
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return myPlans
      .flatMap(plan =>
        plan.appointments
          .filter(a => a.date >= now)
          .map(a => ({ ...a, clientName: plan.client?.name || 'Client', planId: plan.id }))
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [myPlans]);

  // My bookings
  const myBookings = useMemo(() => {
    if (!stylistId) return bookings;
    return bookings.filter(b => b.stylist_id === String(stylistId));
  }, [bookings, stylistId]);

  // Stats
  const activePlans = myPlans.filter(p => p.status === 'active').length;
  const totalClients = new Set(myPlans.map(p => p.client?.name)).size;
  const totalRevenue = myPlans.reduce((sum, p) => sum + (p.totalCost || 0), 0);

  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;

  const metrics = useMemo(
    () => computeReportMetrics(myPlans, bookings as any, clients.length),
    [myPlans, bookings, clients.length]
  );

  const pinnedWidgetIds = useMemo(() => {
    const ids = user?.id ? (pinnedReports[String(user.id)] ?? DEFAULT_PINNED_STYLIST) : DEFAULT_PINNED_STYLIST;
    return ids.filter(id => DASHBOARD_WIDGETS.find(w => w.id === id && w.roles.includes('stylist')));
  }, [pinnedReports, user?.id]);

  const hasPinnedCustomization = user?.id ? pinnedReports[String(user.id)] !== undefined : false;

  const renderDashboard = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = (user?.name || 'Stylist').split(' ')[0];
    const levelName = levels.find(l => l.id === user?.stylistData?.levelId)?.name;

    return (
    <div className="bp-page">
      {/* Welcome header — inline card, no negative-margin clipping */}
      <div className="flex items-center justify-between mb-6 p-5 bg-primary text-primary-foreground bp-container-tall shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SunIcon className="w-4 h-4 opacity-70" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">{greeting}</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
          {levelName && <p className="text-xs opacity-60 uppercase tracking-widest mt-1">{levelName}</p>}
        </div>
      </div>

      {/* Quick Stats — original layout preserved */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card p-4 bp-container-list shadow-sm text-center elevated-card">
          <p className="text-2xl bp-stat-value text-foreground">{activePlans}</p>
          <p className="bp-caption mt-1">Active Plans</p>
        </div>
        <div className="bg-card p-4 bp-container-list shadow-sm text-center elevated-card">
          <p className="text-2xl bp-stat-value text-foreground">{totalClients}</p>
          <p className="bp-caption mt-1">Clients</p>
        </div>
        <div className="bg-card p-4 bp-container-list shadow-sm text-center elevated-card">
          <p className="text-2xl bp-stat-value text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="bp-caption mt-1">Pipeline</p>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="mb-6">
        <h2 className="bp-section-title mb-4 pl-4">Upcoming Appointments</h2>
        {upcomingAppointments.length === 0 ? (
          <div className="bg-card p-6 bp-container-list shadow-sm text-center elevated-card">
            <p className="bp-body-sm text-muted-foreground">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((appt, i) => (
              <div key={i} className="bg-card p-4 bp-container-list shadow-sm flex items-center justify-between elevated-card">
                <div>
                  <p className="font-bold text-sm text-foreground">{appt.clientName}</p>
                  <p className="bp-caption mt-0.5">
                    {appt.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="bp-caption">
                    {appt.services.map(s => s.name).join(', ')}
                  </p>
                </div>
                <CalendarIcon className="w-5 h-5 text-accent" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Plan Button */}
      <div className="mb-6">
        <button
          data-ui="button"
          onClick={() => setIsCreatingPlan(true)}
          className="w-full py-4 bp-btn-primary text-center font-bold"
        >
          + New Plan
        </button>
      </div>

      {/* Recent Plans */}
      <div>
        <h2 className="bp-section-title mb-4 pl-4">My Plans</h2>
        {visiblePlans.length === 0 ? (
          <div className="bg-card p-6 bp-container-list shadow-sm text-center elevated-card">
            <p className="bp-body-sm text-muted-foreground">No plans yet — create your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePlans.slice(0, 5).map(plan => (
              <button
                key={plan.id}
                onClick={() => setEditingPlan(plan)}
                className="w-full text-left p-4 bg-card bp-container-list shadow-sm flex items-center justify-between active:scale-95 transition-all elevated-card"
              >
                <div>
                  <p className="font-bold text-sm text-foreground">{plan.client?.name || 'Client'}</p>
                  <p className="bp-caption mt-0.5">
                    {plan.appointments.length} visits &middot; {formatCurrency(plan.totalCost)}
                  </p>
                  <span className={`bp-caption px-2 py-0.5 rounded-full mt-1 inline-block ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {plan.status}
                  </span>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pinned metrics — only rendered after user explicitly customizes via Settings → Dashboard */}
      {hasPinnedCustomization && pinnedWidgetIds.length > 0 && (
        <div className="mt-6">
          <h2 className="bp-section-title mb-4 pl-4">My Metrics</h2>
          <div className="grid grid-cols-2 gap-3">
            {pinnedWidgetIds.map((id, idx) => {
              const widget = DASHBOARD_WIDGETS.find(w => w.id === id);
              if (!widget) return null;
              const { value, sub } = getWidgetValue(id, metrics);
              const isWide = pinnedWidgetIds.length % 2 !== 0 && idx === pinnedWidgetIds.length - 1;
              return (
                <div
                  key={id}
                  className={`bg-card p-4 bp-container-list shadow-sm text-center elevated-card ${isWide ? 'col-span-2' : ''}`}
                >
                  <p className="text-2xl bp-stat-value text-foreground">{value}</p>
                  <p className="bp-caption mt-1">{widget.title}</p>
                  {sub && <p className="bp-caption text-muted-foreground">{sub}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderPlans = () => (
    <div className="bp-page">
      <h2 className="bp-page-subtitle mb-6">My Plans</h2>

      <button
        data-ui="button"
        onClick={() => setIsCreatingPlan(true)}
        className="w-full py-4 bp-btn-primary text-center font-bold mb-6"
      >
        + New Plan
      </button>

      <div className="space-y-4">
        {visiblePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card bp-container-list shadow-sm elevated-card">
            <p className="bp-section-title mb-2">No plans yet</p>
            <p className="bp-overline">Create your first plan above!</p>
          </div>
        ) : (
          visiblePlans.map(plan => (
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
              <p className="bp-body-sm text-muted-foreground">{plan.appointments.length} upcoming visits</p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const renderSettings = () => {
    if (settingsView === 'account') {
      return (
        <div className="bp-page">
          <button
            onClick={() => setSettingsView('menu')}
            className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <AccountSettings user={user} onLogout={logout} subtitle="Team Member" role="stylist" />
        </div>
      );
    }

    if (settingsView === 'dashboardCustomization') {
      return (
        <DashboardCustomization
          role="stylist"
          userId={user?.id ?? ''}
          pinnedReports={pinnedReports}
          onUpdatePinned={(ids) => {
            updatePinnedReports(user?.id ?? '', ids);
            saveAll();
          }}
          onBack={() => setSettingsView('menu')}
        />
      );
    }

    return (
      <div className="bp-page">
        <h2 className="bp-page-subtitle mb-6">Settings</h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setSettingsView('account')}
            className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card"
          >
            <SettingsIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Account</span>
          </button>
          <button
            onClick={() => setSettingsView('dashboardCustomization')}
            className="p-8 bg-card bp-container-list flex flex-col items-center justify-center space-y-3 hover:shadow-md transition-all shadow-sm elevated-card"
          >
            <LayoutDashboardIcon className="w-10 h-10 text-primary" />
            <span className="bp-overline">Dashboard</span>
          </button>
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    if (isCreatingPlan || editingPlan) {
      return (
        <PlanWizard
          role="stylist"
          client={editingPlan?.client}
          existingPlan={editingPlan || undefined}
          onPlanChange={(plan) => {
            setEditingPlan(plan);
            if (!plan) {
              setIsCreatingPlan(false);
              setActiveTab('plans');
            }
          }}
          initialStep={isCreatingPlan ? 'select-client' : 'summary'}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'plans': return renderPlans();
      case 'reports':
        if (!effectivePermissions.viewGlobalReports) return renderDashboard();
        return <ReportsPanel role="stylist" metrics={metrics} />;
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setEditingPlan(null);
    setIsCreatingPlan(false);
    if (tab === 'settings') setSettingsView('menu');
  };

  return (
    <div className="flex flex-col h-full bg-background bp-app-shell">
      {renderActiveTab()}
      <BottomNav activeTab={activeTab} onChange={handleTabChange} hiddenTabs={hiddenNavTabs} />
    </div>
  );
}

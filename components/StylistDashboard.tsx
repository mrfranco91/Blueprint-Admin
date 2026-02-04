import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Step, Service, PlanDetails, GeneratedPlan, PlanAppointment, Client, UserRole } from '../types';
import SelectClientStep from './SelectClientStep';
import SelectServicesStep from './SelectServicesStep';
import SetDatesStep from './SetDatesStep';
import SetFrequencyStep from './SetFrequencyStep';
import LoadingStep from './LoadingStep';
import PlanSummaryStep from './PlanSummaryStep';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlans } from '../contexts/PlanContext';
import { RefreshIcon, DocumentTextIcon, PlusIcon, CalendarIcon, ChevronRightIcon, UsersIcon, ClipboardIcon } from './icons';
import StylistAccountSettings from './StylistAccountSettings';
import AdminAccountSettings from './AdminAccountSettings';
import AdminDashboard from './AdminDashboard';
import StylistReports from './StylistReports';
import { ensureAccessibleColor } from '../utils/ensureAccessibleColor';
// FIX: Import BottomNav and Tab to resolve "Cannot find name" errors in the template.
import BottomNav, { Tab } from './BottomNav';

interface StylistDashboardProps {
    onLogout: () => void;
    client?: Client;
    existingPlan?: GeneratedPlan | null;
    onPlanChange?: (plan: GeneratedPlan | null) => void;
    role?: UserRole;
    initialStep?: Step;
}

const StylistDashboard: React.FC<StylistDashboardProps> = ({ onLogout, role: propRole, existingPlan: propPlan, client: propClient, initialStep }) => {
  const [activeTab, setActiveTab] = useState<string>(initialStep ? 'plans' : 'dashboard');
  const [_step, _setStep] = useState<Step | 'idle'>('idle');
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [isViewingReports, setIsViewingReports] = useState(false);
  
  const stepRef = useRef(_step);
  stepRef.current = _step;

  const setStep = (newStep: Step | 'idle') => {
    if (wizardCompleted && stepRef.current === 'summary' && newStep !== 'summary') {
        return;
    }
    _setStep(newStep);
  };
  
  const { services: availableServices, clients: globalClients, branding, stylists } = useSettings();
  const { user } = useAuth();
  const { savePlan, getPlanForClient, getClientHistory, plans } = usePlans();

  const [activeClient, setActiveClient] = useState<Client | null>(propClient || null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [planDetails, setPlanDetails] = useState<PlanDetails>({});
  
  const [clientSearch, setClientSearch] = useState('');
  const [viewingHistory, setViewingHistory] = useState(false);
  const [selectedHistoryPlan, setSelectedHistoryPlan] = useState<GeneratedPlan | null>(null);
  
  const currentPlan = selectedHistoryPlan || propPlan || (activeClient ? getPlanForClient(activeClient.id) : null);

  useEffect(() => {
      if (initialStep) {
          setStep(initialStep);
          setActiveTab('plans');
      }
  }, [initialStep]);

  const selectedServices = useMemo(() => {
    return availableServices.filter(service => selectedServiceIds.includes(service.id));
  }, [selectedServiceIds, availableServices]);

  const filteredClients = useMemo(() => {
      return globalClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clientSearch, globalClients]);

  const loggedInStylist = useMemo(() => {
      if (user?.role !== 'stylist') return null;
      const stylistId = user.stylistData?.id || user.id;
      return stylists.find(stylist => stylist.id === stylistId) || null;
  }, [stylists, user]);

  const canViewAllPlans = !!loggedInStylist?.permissions.viewAllSalonPlans;

  const visiblePlans = useMemo(() => {
      if (!user) return [];
      if (canViewAllPlans) return plans;
      return plans.filter(p => p.stylistId === user.id);
  }, [plans, user, canViewAllPlans]);

  const myStats = useMemo(() => {
      const myPipeline = visiblePlans.reduce((sum, p) => sum + p.totalCost, 0);
      const myActivePlansCount = visiblePlans.filter(p => p.status === 'active').length;
      const myClientsCount = new Set(visiblePlans.map(p => p.client.id)).size;
      return { myPipeline, myActivePlansCount, myClientsCount };
  }, [visiblePlans]);

  const myPipelineGrowthData = useMemo(() => {
    const sortedPlans = [...visiblePlans].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
    let lastKnownValue = 0;
    return lastSixMonths.map(month => {
        if(dataMap.has(month)) lastKnownValue = dataMap.get(month)!;
        return { name: month, value: lastKnownValue };
    });
  }, [visiblePlans]);

  const resetWizard = () => {
    setSelectedServiceIds([]);
    setPlanDetails({});
    setViewingHistory(false);
    setSelectedHistoryPlan(null);
    setWizardCompleted(false);
    setStep('idle');
  };

  const generatePlan = async (details: PlanDetails) => {
    if (!user || !user.id || !activeClient) return;
    const planEndDate = new Date();
    planEndDate.setFullYear(planEndDate.getFullYear() + 1);
    const appointments: PlanAppointment[] = [];
    let totalCost = 0;
    const finalSelectedServices = availableServices.filter(s => details[s.id]?.firstDate && details[s.id]?.frequency);
    finalSelectedServices.forEach(service => {
        const detail = details[service.id];
        if (!detail || !detail.firstDate || !detail.frequency) return;
        let currentDate = new Date(detail.firstDate.getTime());
        while (currentDate <= planEndDate) {
            // FIX: Replaced 's.cost' with 'service.cost' to reference the correct variable within the forEach loop's scope, resolving a "Cannot find name 's'" error.
            appointments.push({ date: new Date(currentDate.getTime()), services: [{ ...service, cost: service.cost }] });
            totalCost += service.cost;
            currentDate.setDate(currentDate.getDate() + detail.frequency * 7);
        }
    });
    const merged: { [key: string]: PlanAppointment } = {};
    appointments.forEach(a => {
        const k = a.date.toISOString().split('T')[0];
        if (merged[k]) merged[k].services.push(...a.services);
        else merged[k] = a;
    });
    const mergedList = Object.values(merged).sort((a, b) => a.date.getTime() - b.date.getTime());
    const squareStylistId = user.stylistData?.id || user.id.toString();
    const newPlan: GeneratedPlan = {
        id: `plan_${Date.now()}`, status: 'draft', membershipStatus: 'none', createdAt: new Date().toISOString(),
        stylistId: squareStylistId, stylistName: user.name || 'Stylist', client: activeClient,
        appointments: mergedList, totalYearlyAppointments: mergedList.length,
        averageAppointmentCost: mergedList.length ? totalCost / mergedList.length : 0,
        averageMonthlySpend: totalCost / 12, totalCost
    };
    const saved = await savePlan(newPlan);
    setSelectedHistoryPlan(saved);
    setStep('summary');
    setWizardCompleted(true);
    if (onPlanChange) {
      onPlanChange(saved);
    }
  };

  const renderHome = () => {
    const safeAccentColor = ensureAccessibleColor(branding.accentColor, '#F8F9FA', '#1E3A8A');
    return (
        <div className="p-6 overflow-y-auto h-full pb-24 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter" style={{ color: safeAccentColor }}>Welcome, {user?.name?.split(' ')[0]}</h1>
                    <p className="text-gray-500 font-black text-sm uppercase tracking-widest mt-1">Stylist Dashboard</p>
                </div>
                <img
                    src="https://cdn.builder.io/api/v1/image/assets%2F8d6a989189ff4d9e8633804d5d0dbd86%2F786cde548aac4b0cbd77b44f1bb4c94e"
                    alt="Favicon"
                    className="w-16 h-16 object-cover"
                />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="col-span-3 bg-gray-950 text-white p-8 rounded-[32px] shadow-lg border-4 border-gray-900 hover:shadow-xl transition-shadow">
                    <p className="text-sm font-black uppercase text-gray-400 mb-2 tracking-widest">{canViewAllPlans ? 'Salon Pipeline' : 'My Pipeline'}</p>
                    <p className="text-6xl font-black" style={{ color: branding.secondaryColor }}>${myStats.myPipeline.toLocaleString()}</p>
                </div>
                <div className="bg-white col-span-2 p-6 rounded-3xl border-4 border-gray-100 shadow-sm hover:shadow-md hover:border-brand-accent transition-all">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{canViewAllPlans ? 'Salon Plans' : 'Active Plans'}</p>
                    <p className="text-5xl font-black text-brand-primary">{myStats.myActivePlansCount}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border-4 border-gray-100 shadow-sm hover:shadow-md hover:border-brand-accent transition-all">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{canViewAllPlans ? 'Salon Clients' : 'My Clients'}</p>
                    <p className="text-5xl font-black text-brand-primary">{myStats.myClientsCount}</p>
                </div>
            </div>
            <div className="bg-white p-7 rounded-3xl border-4 border-gray-100 shadow-sm hover:shadow-md transition-shadow mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">{canViewAllPlans ? 'Salon Pipeline Growth' : 'My Pipeline Growth'}</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={myPipelineGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <Area type="monotone" dataKey="value" stroke="var(--color-brand-secondary)" fill="var(--color-brand-secondary)" fillOpacity={0.1} strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="my-8 space-y-3">
                <button onClick={() => { setActiveTab('plans'); setStep('select-client'); }} className="w-full bg-brand-accent text-white font-black py-5 px-6 rounded-[263px] shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all border-4 border-gray-950 overflow-hidden">
                    <PlusIcon className="w-6 h-6" />
                    <span>New Roadmap</span>
                </button>
            </div>
        </div>
    );
  }

  const renderContent = () => {
      if (propRole !== 'admin' && activeTab === 'dashboard' && isViewingReports) {
          return <StylistReports user={user!} onBack={() => setIsViewingReports(false)} />;
      }
      switch (activeTab) {
          case 'dashboard': return renderHome();
          case 'calendar': return (
              <div className="p-6 flex flex-col items-center justify-center h-full text-center min-h-[60vh] bg-gradient-to-b from-gray-50 to-white">
                  <CalendarIcon className="w-20 h-20 mb-6 text-brand-accent"/>
                  <h1 className="text-4xl font-black mb-3 tracking-tighter">Salon Schedule</h1>
                  <p className="text-gray-500 font-bold mb-8 px-8 text-lg">Synchronized with Square calendar.</p>
                  <button className="bg-gray-950 text-white px-12 py-5 rounded-2xl font-black border-4 border-gray-950 shadow-lg hover:shadow-xl transition-shadow">LAUNCH POS</button>
              </div>
          );
          case 'clients': return (
              <div className="p-6 flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
                  <h1 className="text-4xl font-black mb-6 tracking-tighter text-brand-accent">Client Directory</h1>
                  <div className="flex-grow overflow-y-auto space-y-3 px-1">
                    {filteredClients.map(c => (
                        <div key={c.id} className="w-full flex items-center p-4 bg-white border-4 border-gray-100 rounded-[24px] shadow-sm">
                            <img src={c.avatarUrl} className="w-14 h-14 rounded-2xl mr-4 border-2 border-gray-50"/>
                            <div className="flex-grow">
                                <span className="font-black text-gray-950 block text-lg leading-tight">{c.name}</span>
                                {c.externalId && <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">Square Linked</span>}
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          );
          case 'team': return <AdminDashboard role="admin" />;
          case 'settings':
            if (propRole === 'admin') {
              return <AdminAccountSettings user={user} onLogout={onLogout} subtitle="System Controller" />;
            }
            return <StylistAccountSettings user={user} onLogout={onLogout} subtitle="Stylist Account" />;
          case 'plans':
              if (_step === 'select-client') return <SelectClientStep clients={globalClients} onSelect={(c) => { setActiveClient(c); setStep('select-services'); }} onBack={() => { setStep('idle'); setActiveTab('dashboard'); }} />;
              if (_step === 'select-services') return <SelectServicesStep availableServices={availableServices} onNext={(ids) => { setSelectedServiceIds(ids); setStep('set-dates'); }} onBack={() => setStep('idle')} />;
              if (_step === 'set-dates') return <SetDatesStep client={activeClient!} selectedServices={selectedServices} onNext={(d) => { setPlanDetails(d); setStep('set-frequency'); }} planDetails={planDetails} onBack={() => setStep('select-services')} />;
              if (_step === 'set-frequency') return <SetFrequencyStep selectedServices={selectedServices} onNext={(d) => { setStep('loading'); setTimeout(() => generatePlan(d), 1500); }} planDetails={planDetails} onBack={() => setStep('set-dates')} />;
              if (_step === 'loading') return <LoadingStep />;
              if (_step === 'summary' && currentPlan) {
                const handleClosePlan = () => {
                  if (onPlanChange) onPlanChange(null);
                };
                return <PlanSummaryStep plan={currentPlan} role={propRole || 'stylist'} onEditPlan={handleClosePlan} />;
              }
              return renderHome();
          default: return renderHome();
      }
  };

  return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex flex-col pb-20 overflow-hidden">
            {renderContent()}
        </div>
        {/* FIX: Cast 'tab' to 'string' in comparison to resolve TypeScript error as 'plans' is an internal state not in the Tab union. */}
        <BottomNav activeTab={activeTab} onChange={(tab: Tab) => {
            setActiveTab(tab);
            if ((tab as string) !== 'plans') {
                setActiveClient(null);
                resetWizard();
            }
        }} />
      </div>
  )
};

export default StylistDashboard;

import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import { usePlans } from '../contexts/PlanContext';
import { useSettings } from '../contexts/SettingsContext';
import { ChevronLeftIcon } from './icons';

interface ReportsPageProps {
  user: User;
  onBack?: () => void; // Optional for deep integration
}

type ReportScope = 'salon' | 'self' | string; // 'salon', 'self', or a stylist ID

const ReportsPage: React.FC<ReportsPageProps> = ({ user, onBack }) => {
  const [scope, setScope] = useState<ReportScope>(user.role === 'admin' ? 'salon' : 'self');
  const [activeReport, setActiveReport] = useState<string>('overview');
  
  const { plans } = usePlans();
  const { stylists } = useSettings();

  const isAdmin = user.role === 'admin';

  const scopeOptions = useMemo(() => {
      if (!isAdmin) return [];
      const options = [{ id: 'salon', name: 'Entire Salon' }];
      stylists.forEach(s => options.push({ id: s.id, name: s.name }));
      return options;
  }, [isAdmin, stylists]);

  const filteredPlans = useMemo(() => {
    if (scope === 'salon') return plans;
    const targetStylistId = scope === 'self' ? user.id : scope;
    return plans.filter(p => p.stylistId === targetStylistId);
  }, [plans, scope, user.id]);

  const reportData = useMemo(() => {
    const totalRevenue = filteredPlans.reduce((sum, p) => sum + p.totalCost, 0);
    const activePlans = filteredPlans.filter(p => p.status === 'active').length;
    const draftPlans = filteredPlans.filter(p => p.status === 'draft').length;
    const uniqueClients = new Set(filteredPlans.map(p => p.client.id)).size;
    
    return {
        totalRevenue,
        activePlans,
        draftPlans,
        uniqueClients,
        totalPlans: filteredPlans.length,
        avgRevenuePerPlan: filteredPlans.length > 0 ? totalRevenue / filteredPlans.length : 0,
    };
  }, [filteredPlans]);

  const renderOverview = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 bg-gray-950 text-white p-6 rounded-[32px] shadow-2xl border-4 border-gray-900">
        <p className="text-sm font-black uppercase text-gray-400 mb-1 tracking-widest">Total Roadmap Revenue</p>
        <p className="text-5xl font-black text-brand-secondary">${reportData.totalRevenue.toLocaleString()}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Active Roadmaps</p>
        <p className="text-4xl font-black text-gray-950">{reportData.activePlans}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Draft Roadmaps</p>
        <p className="text-4xl font-black text-gray-950">{reportData.draftPlans}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Clients w/ Plans</p>
        <p className="text-4xl font-black text-gray-950">{reportData.uniqueClients}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Avg. Plan Value</p>
        <p className="text-4xl font-black text-gray-950">${reportData.avgRevenuePerPlan.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 pb-24 h-full overflow-y-auto bg-brand-bg">
        <div className="flex items-center mb-6">
            {onBack && (
                <button onClick={onBack} className="mr-4 p-2 bg-white rounded-full shadow-sm border border-gray-200">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
            )}
            <h1 className="text-3xl font-black text-brand-accent tracking-tighter">
                {isAdmin ? 'Salon Reports' : 'My Reports'}
            </h1>
        </div>

        {isAdmin && (
            <div className="mb-6">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Report Scope</label>
                <select 
                    value={scope} 
                    onChange={e => setScope(e.target.value)}
                    className="w-full p-4 bg-white border-4 border-gray-100 rounded-2xl font-black text-gray-950 shadow-sm outline-none"
                >
                    {scopeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
            </div>
        )}
        
        {/* Placeholder for report selection */}
        <div className="border-t-2 border-gray-100 pt-6">
            {renderOverview()}
        </div>

        <div className="mt-8 text-center p-4 bg-gray-100 rounded-2xl">
            <p className="text-xs font-bold text-gray-500">More detailed reports coming soon.</p>
        </div>
    </div>
  );
};

export default ReportsPage;
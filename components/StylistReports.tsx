import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import { usePlans } from '../contexts/PlanContext';
import { ChevronLeftIcon } from './icons';

interface StylistReportsProps {
  user: User;
  onBack: () => void;
}

const StylistReports: React.FC<StylistReportsProps> = ({ user, onBack }) => {
  const { plans } = usePlans();

  const myPlans = useMemo(() => {
    return plans.filter(p => p.stylistId === user.id);
  }, [plans, user.id]);

  const reportData = useMemo(() => {
    const totalRevenue = myPlans.reduce((sum, p) => sum + p.totalCost, 0);
    const activePlans = myPlans.filter(p => p.status === 'active').length;
    const draftPlans = myPlans.filter(p => p.status === 'draft').length;
    const uniqueClients = new Set(myPlans.map(p => p.client.id)).size;
    
    return {
        totalRevenue,
        activePlans,
        draftPlans,
        uniqueClients,
        totalPlans: myPlans.length,
        avgRevenuePerPlan: myPlans.length > 0 ? totalRevenue / myPlans.length : 0,
    };
  }, [myPlans]);

  const renderOverview = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 bg-gray-950 text-white p-6 rounded-[32px] shadow-2xl border-4 border-gray-900">
        <p className="text-sm font-black uppercase text-gray-400 mb-1 tracking-widest">My Roadmap Revenue</p>
        <p className="text-5xl font-black text-brand-secondary">${reportData.totalRevenue.toLocaleString()}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">My Active Plans</p>
        <p className="text-4xl font-black text-gray-950">{reportData.activePlans}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">My Draft Plans</p>
        <p className="text-4xl font-black text-gray-950">{reportData.draftPlans}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">My Clients w/ Plans</p>
        <p className="text-4xl font-black text-gray-950">{reportData.uniqueClients}</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-sm">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">My Avg. Plan Value</p>
        <p className="text-4xl font-black text-gray-950">${reportData.avgRevenuePerPlan.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 pb-24 h-full overflow-y-auto bg-brand-bg">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="mr-4 p-2 bg-white rounded-full shadow-sm border border-gray-200">
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-black text-brand-accent tracking-tighter">
                My Reports
            </h1>
        </div>

        <div className="border-t-2 border-gray-100 pt-6">
            {renderOverview()}
        </div>
        
        <div className="mt-8 text-center p-4 bg-gray-100 rounded-2xl">
            <p className="text-xs font-bold text-gray-500">More detailed reports coming soon.</p>
        </div>
    </div>
  );
};

export default StylistReports;
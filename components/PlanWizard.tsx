import React, { useEffect, useMemo, useState } from 'react';
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

interface PlanWizardProps {
  client?: Client;
  existingPlan?: GeneratedPlan | null;
  onPlanChange?: (plan: GeneratedPlan | null) => void;
  role: UserRole;
  initialStep?: Step;
}

const PlanWizard: React.FC<PlanWizardProps> = ({
  role,
  existingPlan: propPlan,
  client: propClient,
  initialStep,
  onPlanChange,
}) => {
  const [step, setStep] = useState<Step>(initialStep ?? 'select-client');
  const { services: availableServices, clients: globalClients } = useSettings();
  const { user } = useAuth();
  const { savePlan, getPlanForClient } = usePlans();

  const [activeClient, setActiveClient] = useState<Client | null>(propClient || null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [planDetails, setPlanDetails] = useState<PlanDetails>({});

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep);
    }
  }, [initialStep]);

  useEffect(() => {
    setActiveClient(propClient || null);
  }, [propClient]);

  const selectedServices = useMemo<Service[]>(() => {
    return availableServices.filter(service => selectedServiceIds.includes(service.id));
  }, [selectedServiceIds, availableServices]);

  const currentPlan = propPlan || (activeClient ? getPlanForClient(activeClient.id) : null);

  const resetWizard = () => {
    setSelectedServiceIds([]);
    setPlanDetails({});
    setStep('select-client');
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
      stylistId: squareStylistId, stylistName: user.name || 'Admin', client: activeClient,
      appointments: mergedList, totalYearlyAppointments: mergedList.length,
      averageAppointmentCost: mergedList.length ? totalCost / mergedList.length : 0,
      averageMonthlySpend: totalCost / 12, totalCost
    };
    const saved = await savePlan(newPlan);
    setStep('summary');
    if (onPlanChange) {
      onPlanChange(saved);
    }
  };

  const handleExitWizard = () => {
    if (onPlanChange) {
      onPlanChange(null);
    } else {
      resetWizard();
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'select-client':
        return (
          <SelectClientStep
            clients={globalClients}
            onSelect={(c) => { setActiveClient(c); setStep('select-services'); }}
            onBack={handleExitWizard}
          />
        );
      case 'select-services':
        return (
          <SelectServicesStep
            availableServices={availableServices}
            onNext={(ids) => { setSelectedServiceIds(ids); setStep('set-dates'); }}
            onBack={() => setStep('select-client')}
          />
        );
      case 'set-dates':
        return (
          <SetDatesStep
            client={activeClient!}
            selectedServices={selectedServices}
            onNext={(d) => { setPlanDetails(d); setStep('set-frequency'); }}
            planDetails={planDetails}
            onBack={() => setStep('select-services')}
          />
        );
      case 'set-frequency':
        return (
          <SetFrequencyStep
            selectedServices={selectedServices}
            onNext={(d) => { setStep('loading'); setTimeout(() => generatePlan(d), 1500); }}
            planDetails={planDetails}
            onBack={() => setStep('set-dates')}
          />
        );
      case 'loading':
        return <LoadingStep />;
      case 'summary':
        if (currentPlan) {
          return <PlanSummaryStep plan={currentPlan} role={role} onEditPlan={handleExitWizard} />;
        }
        return (
          <SelectClientStep
            clients={globalClients}
            onSelect={(c) => { setActiveClient(c); setStep('select-services'); }}
            onBack={handleExitWizard}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {renderContent()}
    </div>
  );
};

export default PlanWizard;

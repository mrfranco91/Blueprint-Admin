
import React, { useState, useEffect } from 'react';
import type { Service, PlanDetails, Client } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ChevronLeftIcon } from './icons';

interface SetDatesStepProps {
  selectedServices: Service[];
  planDetails: PlanDetails;
  client: Client;
  onNext: (details: PlanDetails) => void;
  onBack: () => void;
}

type SelectionMode = 'today' | 'next' | 'last' | 'offset' | 'custom';

const SetDatesStep: React.FC<SetDatesStepProps> = ({ selectedServices, planDetails, client, onNext, onBack }) => {
  const [localDetails, setLocalDetails] = useState<PlanDetails>(planDetails);
  const [selections, setSelections] = useState<{ [key: string]: SelectionMode | null }>({});
  const [offsets, setOffsets] = useState<{ [key: string]: number }>({});
  const { branding } = useSettings();

  useEffect(() => {
    setLocalDetails(planDetails);
  }, [planDetails]);

  const handleDateChange = (serviceId: string, date: Date | null, mode: SelectionMode | null) => {
    let finalDate: Date | null = null;
    if (date) {
      const newDate = new Date(date);
      const timezoneOffset = newDate.getTimezoneOffset() * 60000;
      finalDate = new Date(newDate.getTime() + timezoneOffset);
    }

    setLocalDetails(prev => ({ ...prev, [serviceId]: { ...prev[serviceId], firstDate: finalDate } }));
    setSelections(prev => ({ ...prev, [serviceId]: mode }));
  };

  const handleOffsetChange = (serviceId: string, weeks: number) => {
    const offsetVal = Math.max(0, weeks);
    setOffsets(prev => ({ ...prev, [serviceId]: offsetVal }));
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + offsetVal * 7);
    handleDateChange(serviceId, newDate, 'offset');
  }

  const isNextDisabled = selectedServices.some(service => !localDetails[service.id]?.firstDate);

  const getButtonClass = (isSelected: boolean, isDisabled: boolean) => {
    let base = "p-3 bp-container-list transition-all ";
    if (isDisabled) return base + "cursor-not-allowed bg-muted text-muted-foreground border border";
    if (isSelected) return base + "shadow-md bg-secondary text-secondary-foreground border-secondary";
    return base + "bg-card shadow-sm text-muted-foreground border border";
  };


  return (
    <div className="flex flex-col h-full">
      <div className="pt-3 pl-3 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>
      </div>
      <div className="text-center px-4 pb-4">
        <div className="relative w-full h-2 mb-4 rounded-full bg-muted"><div className="absolute top-0 left-0 h-2 bg-secondary bp-container-compact w-1/3"></div></div>
        <h1 className="text-2xl font-bold text-foreground">First Service Date</h1>
      </div>

      <div className="flex-grow overflow-y-auto px-4 pt-4 pb-nav space-y-6">
        {selectedServices.map(service => (
          <div key={service.id} className="p-4 bp-container-tall border border shadow-sm bg-muted">
            <h3 className="font-bold text-lg mb-3 text-foreground">{service.name}</h3>

            <div className="grid grid-cols-2 gap-3 text-sm font-bold">
              <button
                onClick={() => handleDateChange(service.id, new Date(), 'today')}
                className={getButtonClass(selections[service.id] === 'today', false)}
              >
                Today
              </button>
              <button
                onClick={() => handleDateChange(service.id, client.nextAppointmentDate || null, 'next')}
                disabled={!client.nextAppointmentDate}
                className={getButtonClass(selections[service.id] === 'next', !client.nextAppointmentDate)}
              >
                Next Scheduled
              </button>
              <button
                onClick={() => handleDateChange(service.id, client.lastAppointmentDate || null, 'last')}
                disabled={!client.lastAppointmentDate}
                className={`col-span-2 ${getButtonClass(selections[service.id] === 'last', !client.lastAppointmentDate)}`}
              >
                Last Appointment
              </button>
            </div>

            <div className="mt-3 flex items-center space-x-2 text-sm">
              <div
                className={`p-2 bp-container-compact flex-grow flex items-center justify-center border transition-all ${selections[service.id] === 'offset' ? 'shadow-md bg-secondary text-secondary-foreground border-secondary' : 'bg-card shadow-sm border text-muted-foreground'}`}
              >
                <label htmlFor={`offset-${service.id}`} className="font-bold mr-2">In</label>
                <input
                  type="number"
                  id={`offset-${service.id}`}
                  value={offsets[service.id] || ''}
                  onChange={e => handleOffsetChange(service.id, parseInt(e.target.value, 10) || 0)}
                  className="w-16 p-2 border border bp-container-compact text-center font-bold text-foreground"
                  placeholder="0"
                />
                <span className="ml-2 font-bold">weeks</span>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor={`date-${service.id}`} className="block font-bold mb-1 text-xs uppercase text-muted-foreground">Or Select Date:</label>
              <input
                type="date"
                id={`date-${service.id}`}
                onChange={e => handleDateChange(service.id, new Date(e.target.value), 'custom')}
                className={`w-full p-3 border bp-container-compact font-medium shadow-sm text-foreground ${selections[service.id] === 'custom' ? 'border-secondary' : ''}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 mt-auto bg-card border-t border">
        <button onClick={() => onNext(localDetails)} disabled={isNextDisabled} className="w-full font-bold py-4 px-4 bp-container-compact shadow-lg transition-transform transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground">Next Step</button>
      </div>
    </div>
  );
};

export default SetDatesStep;

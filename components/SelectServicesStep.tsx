import React, { useState, useMemo } from 'react';
import type { Service } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, CheckCircleIcon } from './icons';

interface SelectServicesStepProps {
  availableServices: Service[];
  onNext: (selectedIds: string[]) => void;
  onBack: () => void;
}

const SelectServicesStep: React.FC<SelectServicesStepProps> = ({ availableServices, onNext, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { linkingConfig } = useSettings();
  const { user } = useAuth();

  // All services are authorized for all stylists per business logic.
  const authorizedServices = availableServices;

  const categories = useMemo(() => ['All', ...Array.from(new Set(authorizedServices.map(s => s.category)))], [authorizedServices]);

  const filteredServices = useMemo(() => {
    return authorizedServices.filter(service => {
      const matchesCategory = !activeCategory || activeCategory === 'All' || service.category === activeCategory;
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [authorizedServices, searchTerm, activeCategory]);

  const servicesByCategory = useMemo(() => {
    return filteredServices.reduce((acc, service) => {
        (acc[service.category] = acc[service.category] || []).push(service);
        return acc;
    }, {} as {[key: string]: Service[]});
  }, [filteredServices]);

  const linkingSuggestion = useMemo(() => {
      if (!linkingConfig.enabled) return null;
      
      const selectedList = authorizedServices.filter(s => selectedIds.has(s.id));
      
      // Check if any selected service matches a category trigger OR a specific service ID trigger
      const hasTrigger = selectedList.some(s => 
          (linkingConfig.triggerCategory !== 'None' && s.category === linkingConfig.triggerCategory) ||
          (linkingConfig.triggerServiceIds?.includes(s.id))
      );
      
      const hasExclusion = selectedList.some(s => s.id === linkingConfig.exclusionServiceId);
      const alreadyHasLinked = selectedList.some(s => s.id === linkingConfig.linkedServiceId);

      if (hasTrigger && !hasExclusion && !alreadyHasLinked) {
          const linkedService = availableServices.find(s => s.id === linkingConfig.linkedServiceId);
          return linkedService || null;
      }
      return null;
  }, [selectedIds, linkingConfig, authorizedServices, availableServices]);

  const toggleService = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
    } else {
        newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleNext = () => onNext(Array.from(selectedIds));
  
  const formatDuration = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 flex-shrink-0 bg-white z-10 border-b-4 border-gray-900">
        <h1 className="text-2xl font-black text-gray-900 text-center tracking-tighter mb-4">Service Selection</h1>
        <div className="relative">
            <input 
                type="text" 
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 bg-gray-100 border-4 border-gray-100 rounded-2xl font-black text-gray-950 shadow-inner outline-none focus:bg-white focus:border-brand-accent transition-all"
            />
        </div>
        <div className="flex space-x-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 text-xs font-black rounded-full whitespace-nowrap transition-all uppercase tracking-widest ${activeCategory === cat || (cat === 'All' && !activeCategory) ? 'bg-brand-accent text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                    {cat}
                </button>
            ))}
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto px-4 pb-48 pt-4">
        {linkingSuggestion && (
            <div className="mb-6 bg-brand-secondary text-white p-5 rounded-[32px] border-b-4 border-black/20 shadow-xl animate-bounce-in flex items-center justify-between">
                <div className="pr-4 text-white">
                    <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Finish Suggestion</p>
                    <p className="text-sm font-black leading-tight">Add a <span className="underline">{linkingSuggestion.name}</span> to this plan?</p>
                </div>
                <button 
                    onClick={() => toggleService(linkingSuggestion.id)}
                    className="bg-white text-brand-secondary p-3 rounded-2xl shadow-lg active:scale-90 transition-all"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>
        )}

        {Object.entries(servicesByCategory).map(([category, services]) => (
            <div key={category} className="mb-8">
                <h2 className="font-black text-gray-400 text-xs uppercase tracking-widest mb-4 flex items-center">
                    <span className="flex-grow h-px bg-gray-100 mr-3"></span>
                    {category}
                    <span className="flex-grow h-px bg-gray-100 ml-3"></span>
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    {(services as Service[]).map((service: Service) => {
                        const isSelected = selectedIds.has(service.id);
                        return (
                            <button 
                                key={service.id} 
                                onClick={() => toggleService(service.id)} 
                                className={`p-5 rounded-[32px] shadow-sm transition-all duration-300 text-left flex flex-col justify-between h-36 border-4 relative overflow-hidden ${ isSelected ? 'bg-brand-accent text-white border-black/20 scale-95 shadow-inner' : 'bg-white text-gray-950 border-gray-50'}`}
                            >
                                {isSelected && <div className="absolute top-2 right-2"><CheckCircleIcon className="w-6 h-6 text-brand-secondary" /></div>}
                                <span className="font-black text-base leading-tight tracking-tight pr-4">{service.name}</span>
                                <div className="text-xs font-black opacity-60 uppercase tracking-widest">
                                    <span className="block">${service.cost}</span>
                                    <span className="block mt-0.5">{formatDuration(service.duration)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-5 bg-white border-t-8 border-gray-950 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] z-40 pb-10">
        <button 
            onClick={handleNext} 
            disabled={selectedIds.size === 0} 
            className="w-full bg-brand-primary text-white font-black py-5 px-4 rounded-[32px] shadow-2xl active:scale-95 transition-all disabled:bg-gray-400 disabled:shadow-none mb-4 text-xl border-b-8 border-black/20"
        >
          CONFIRM ({selectedIds.size})
        </button>
        <button onClick={onBack} className="w-full text-gray-950 font-black py-2 uppercase text-xs tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity">
          Return to Client
        </button>
      </div>
    </div>
  );
};

export default SelectServicesStep;
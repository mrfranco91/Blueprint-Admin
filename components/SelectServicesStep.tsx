import React, { useState, useMemo } from 'react';
import type { Service } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, CheckCircleIcon, ChevronLeftIcon } from './icons';

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
        }, {} as { [key: string]: Service[] });
    }, [filteredServices]);

    const linkingSuggestion = useMemo(() => {
        if (!linkingConfig.enabled) return null;

        const selectedList = authorizedServices.filter(s => selectedIds.has(s.id));

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
            <div className="p-4 flex-shrink-0 bg-card z-10 border-b-4 border-primary relative">
                <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeftIcon className="w-4 h-4" />
                    Back
                </button>
                <h1 className="bp-page-title text-center mb-4">Service Selection</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search menu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 border-4 border bp-container-compact font-medium shadow-inner outline-none bg-muted text-foreground focus:bg-card focus:border-sky transition-all"
                    />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 text-xs font-bold bp-container-compact whitespace-nowrap transition-all uppercase tracking-widest ${activeCategory === cat || (cat === 'All' && !activeCategory) ? 'bg-accent text-accent-foreground shadow-lg' : 'border border bg-muted text-muted-foreground'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto px-4 pt-4 pb-nav">
                {linkingSuggestion && (
                    <div className="mb-6 bg-secondary text-secondary-foreground p-5 bp-container-list border-b-4 border-black/20 shadow-xl animate-bounce-in flex items-center justify-between">
                        <div className="pr-4">
                            <p className="bp-overline mb-1">Finish Suggestion</p>
                            <p className="text-sm font-semibold leading-tight">Add a <span className="underline">{linkingSuggestion.name}</span> to this plan?</p>
                        </div>
                        <button
                            onClick={() => toggleService(linkingSuggestion.id)}
                            className="bg-card text-secondary p-3 bp-container-tall shadow-lg active:scale-90 transition-all"
                        >
                            <PlusIcon className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {Object.entries(servicesByCategory).map(([category, services]) => (
                    <div key={category} className="mb-8">
                        <h2 className="bp-overline mb-4 flex items-center">
                            <span className="flex-grow h-px mr-3 bg-muted" />
                            {category}
                            <span className="flex-grow h-px ml-3 bg-muted" />
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {(services as Service[]).map((service: Service) => {
                                const isSelected = selectedIds.has(service.id);
                                return (
                                    <button
                                        key={service.id}
                                        onClick={() => toggleService(service.id)}
                                        className={`p-5 bp-container-tall shadow-sm transition-all duration-300 text-left flex flex-col justify-between h-36 border-4 relative ${isSelected ? 'bg-accent text-accent-foreground border-black/20 scale-95 shadow-inner' : 'bg-card border text-foreground'}`}
                                    >
                                        {isSelected && <div className="absolute top-2 right-2"><CheckCircleIcon className="w-6 h-6 text-secondary" /></div>}
                                        <span className="font-bold text-base leading-tight tracking-tight pr-4">{service.name}</span>
                                        <div className="text-xs font-semibold opacity-60 uppercase tracking-widest">
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

            <div className="sticky bottom-0 p-5 bg-card border-t-8 border-primary z-40 pb-6 flex-shrink-0 shadow-lg">
                <button
                    onClick={handleNext}
                    disabled={selectedIds.size === 0}
                    className="w-full bg-primary text-primary-foreground font-bold py-5 px-4 bp-container-compact shadow-2xl active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none text-xl border-b-8 border-black/20"
                >
                    CONFIRM ({selectedIds.size})
                </button>
            </div>
        </div>
    );
};

export default SelectServicesStep;

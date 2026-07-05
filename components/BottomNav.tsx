import React from 'react';
import { HomeIcon, DocumentTextIcon, SettingsIcon, BarChart2Icon } from './icons';

export type Tab = 'dashboard' | 'plans' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: Tab) => void;
  hiddenTabs?: Tab[];
}

const NAV_ITEMS: { key: Tab; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Home', icon: HomeIcon },
  { key: 'plans', label: 'Plans', icon: DocumentTextIcon },
  { key: 'reports', label: 'Reports', icon: BarChart2Icon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomNav({ activeTab, onChange, hiddenTabs = [] }: BottomNavProps) {
  const visibleItems = NAV_ITEMS.filter(item => !hiddenTabs.includes(item.key));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bp-bottomnav">
      <div className="flex justify-around max-w-md mx-auto p-2 pb-6 pt-3">
        {visibleItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center justify-center w-full p-1 rounded-lg transition-all ${isActive ? 'text-white font-bold' : 'text-white/60 font-medium'}`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-7 w-7 mb-1 ${isActive ? 'stroke-[3]' : 'stroke-[2.5]'}`} />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

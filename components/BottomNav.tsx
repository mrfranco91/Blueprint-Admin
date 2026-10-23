import React from 'react';
import { HomeIcon, DocumentTextIcon, SettingsIcon } from './icons';

export type Tab = 'dashboard' | 'plans' | 'settings';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: Tab) => void;
  hiddenTabs?: Tab[];
}

const NAV_ITEMS: { key: Tab; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Home', icon: HomeIcon },
  { key: 'plans', label: 'Plans', icon: DocumentTextIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomNav({ activeTab, onChange, hiddenTabs = [] }: BottomNavProps) {
  const visibleItems = NAV_ITEMS.filter(item => !hiddenTabs.includes(item.key));

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 z-50 bp-bottomnav">
      <div className="flex justify-around max-w-md mx-auto p-2 pb-6 pt-3">
        {visibleItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center justify-center w-full min-h-12 p-1 rounded-lg transition-colors ${isActive ? 'font-bold' : 'font-medium'}`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-7 w-7 mb-1 ${isActive ? 'stroke-[3]' : 'stroke-[2.5]'}`} />
              <span className="text-xs font-bold uppercase tracking-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

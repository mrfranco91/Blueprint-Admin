import React, { useMemo } from 'react';
import { ChevronLeftIcon } from './icons';
import {
  DASHBOARD_WIDGETS,
  WIDGET_CATEGORIES,
  DEFAULT_PINNED_ADMIN,
  DEFAULT_PINNED_STYLIST,
  type DashboardWidget,
} from '../utils/reportMetrics';

interface DashboardCustomizationProps {
  role: 'admin' | 'stylist';
  userId: string | number;
  pinnedReports: { [userId: string]: string[] };
  onUpdatePinned: (ids: string[]) => void;
  onBack: () => void;
}

export default function DashboardCustomization({
  role,
  userId,
  pinnedReports,
  onUpdatePinned,
  onBack,
}: DashboardCustomizationProps) {
  const defaults = role === 'admin' ? DEFAULT_PINNED_ADMIN : DEFAULT_PINNED_STYLIST;
  const pinned = pinnedReports[String(userId)] ?? defaults;

  const availableWidgets = useMemo(
    () => DASHBOARD_WIDGETS.filter(w => w.roles.includes(role)),
    [role]
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, DashboardWidget[]>();
    for (const cat of WIDGET_CATEGORIES) {
      const widgets = availableWidgets.filter(w => w.category === cat.id);
      if (widgets.length > 0) map.set(cat.id, widgets);
    }
    return map;
  }, [availableWidgets]);

  const toggle = (id: string) => {
    const next = pinned.includes(id)
      ? pinned.filter(p => p !== id)
      : [...pinned, id];
    onUpdatePinned(next);
  };

  const resetToDefaults = () => onUpdatePinned(defaults);

  const categoryLabel = (id: string) =>
    WIDGET_CATEGORIES.find(c => c.id === id)?.label ?? id;

  const CATEGORY_ACCENT: Record<string, string> = {
    adoption: 'bg-blue-100 text-blue-700',
    booking: 'bg-purple-100 text-purple-700',
    revenue: 'bg-green-100 text-green-700',
    services: 'bg-amber-100 text-amber-700',
    ltv: 'bg-pink-100 text-pink-700',
    team: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="bp-page">
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-sm font-semibold hover:opacity-80 transition-colors bp-back"
      >
        <ChevronLeftIcon className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="flex items-start justify-between mb-2">
        <h2 className="bp-page-subtitle">Dashboard</h2>
        <button
          onClick={resetToDefaults}
          className="bp-caption text-primary font-semibold hover:opacity-70 transition-opacity pt-1"
        >
          Reset defaults
        </button>
      </div>
      <p className="bp-caption text-muted-foreground mb-6">
        Choose which metrics appear as quick-stat cards on your Home screen.
        Full analytics are always available in the Reports tab.
      </p>

      <div className="space-y-6">
        {Array.from(byCategory.entries()).map(([catId, widgets]) => (
          <div key={catId}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`bp-caption px-2.5 py-1 rounded-full font-semibold ${CATEGORY_ACCENT[catId] ?? 'bg-muted text-muted-foreground'}`}>
                {categoryLabel(catId)}
              </span>
            </div>
            <div className="space-y-2">
              {widgets.map(widget => {
                const active = pinned.includes(widget.id);
                return (
                  <button
                    key={widget.id}
                    onClick={() => toggle(widget.id)}
                    className={`w-full flex items-center justify-between p-4 bp-container-list transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-card text-foreground shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="text-left flex-1 mr-3">
                      <p className={`font-semibold text-sm ${active ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {widget.title}
                      </p>
                      <p className={`bp-caption mt-0.5 ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {widget.description}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      active
                        ? 'border-primary-foreground bg-primary-foreground/20'
                        : 'border-border'
                    }`}>
                      {active && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pinned.length > 0 && (
        <div className="mt-6 p-4 bg-muted/50 bp-container-list text-center">
          <p className="bp-caption text-muted-foreground">
            <span className="font-semibold text-foreground">{pinned.length}</span> widget{pinned.length !== 1 ? 's' : ''} selected for your home dashboard
          </p>
        </div>
      )}
    </div>
  );
}

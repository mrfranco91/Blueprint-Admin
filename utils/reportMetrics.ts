import type { GeneratedPlan } from '../types';

interface BookingRecord {
  id: string;
  client_id: string;
  stylist_id: string;
  start_time: string;
  services: { variation_id: string; name: string }[];
  source: string;
  status: string;
}

export interface StylistStat {
  stylistId: string;
  stylistName: string;
  planCount: number;
  activePlans: number;
  totalRevenue: number;
  clientCount: number;
  conversionRate: number;
}

export interface ServiceMixItem {
  name: string;
  category: string;
  count: number;
  revenue: number;
}

export interface ClientValueItem {
  clientId: string;
  clientName: string;
  projectedValue: number;
  hasActivePlan: boolean;
}

export interface MonthlyRevenuePoint {
  month: string;
  confirmed: number;
  projected: number;
}

export interface ReportMetrics {
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  totalClients: number;
  clientsWithPlan: number;
  clientsWithPlanPct: number;
  stylistPlanStats: StylistStat[];
  planCreationTrend: { month: string; count: number; cumulative: number }[];
  planBookingConversionRate: number;
  bookingsFromPlan: number;
  bookingsTotal: number;
  totalConfirmedRevenue: number;
  totalProjectedRevenue: number;
  revenueStabilityScore: number;
  monthlyRevenue: MonthlyRevenuePoint[];
  projectedNext3: number;
  projectedNext6: number;
  projectedNext12: number;
  serviceMix: ServiceMixItem[];
  highMaintenanceClients: number;
  lowMaintenanceClients: number;
  clientValues: ClientValueItem[];
  avgClientValue: number;
  totalProjectedLTV: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  category: 'adoption' | 'booking' | 'revenue' | 'services' | 'ltv' | 'team';
  roles: ('admin' | 'stylist')[];
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'clients-with-plan', title: 'Plan Coverage', description: '% of clients with a roadmap', category: 'adoption', roles: ['admin', 'stylist'] },
  { id: 'active-plans', title: 'Active Plans', description: 'Total active roadmaps in progress', category: 'adoption', roles: ['admin', 'stylist'] },
  { id: 'draft-plans', title: 'Draft Plans', description: 'Plans not yet activated', category: 'adoption', roles: ['admin', 'stylist'] },
  { id: 'booking-conversion', title: 'Booking Conversion', description: 'Active plans that drove a booking', category: 'booking', roles: ['admin', 'stylist'] },
  { id: 'bookings-total', title: 'Total Bookings', description: 'All bookings on record', category: 'booking', roles: ['admin', 'stylist'] },
  { id: 'projected-3m', title: 'Next 3 Months', description: 'Projected revenue — next 90 days', category: 'revenue', roles: ['admin', 'stylist'] },
  { id: 'projected-6m', title: 'Next 6 Months', description: 'Projected revenue — next 180 days', category: 'revenue', roles: ['admin', 'stylist'] },
  { id: 'projected-12m', title: '12-Month Pipeline', description: 'Full year revenue projection', category: 'revenue', roles: ['admin', 'stylist'] },
  { id: 'revenue-stability', title: 'Revenue Stability', description: 'Confirmed vs total projected revenue ratio', category: 'revenue', roles: ['admin', 'stylist'] },
  { id: 'service-mix-top', title: 'Top Service', description: 'Most planned service in roadmaps', category: 'services', roles: ['admin', 'stylist'] },
  { id: 'maintenance-ratio', title: 'High-Maintenance Clients', description: 'Clients with color / complex services', category: 'services', roles: ['admin', 'stylist'] },
  { id: 'avg-client-value', title: 'Avg Client Value', description: 'Average projected lifetime value per client', category: 'ltv', roles: ['admin', 'stylist'] },
  { id: 'total-ltv', title: 'Total Projected LTV', description: 'Sum of all client projected values', category: 'ltv', roles: ['admin', 'stylist'] },
  { id: 'plans-per-stylist', title: 'Plans Per Stylist', description: 'Plan creation rate by team member', category: 'team', roles: ['admin'] },
  { id: 'top-stylist-revenue', title: 'Top Stylist Pipeline', description: 'Highest revenue pipeline by stylist', category: 'team', roles: ['admin'] },
];

export const WIDGET_CATEGORIES: { id: string; label: string }[] = [
  { id: 'adoption', label: 'Plan Adoption' },
  { id: 'booking', label: 'Booking Behavior' },
  { id: 'revenue', label: 'Revenue Predictability' },
  { id: 'services', label: 'Service Strategy' },
  { id: 'ltv', label: 'Client Value (LTV)' },
  { id: 'team', label: 'Team Performance' },
];

export const DEFAULT_PINNED_ADMIN = ['clients-with-plan', 'projected-12m', 'revenue-stability', 'booking-conversion'];
export const DEFAULT_PINNED_STYLIST = ['active-plans', 'projected-12m', 'booking-conversion', 'avg-client-value'];

export function computeReportMetrics(
  plans: GeneratedPlan[],
  bookings: BookingRecord[],
  totalClientCount: number
): ReportMetrics {
  const now = new Date();
  const nowTime = now.getTime();
  const activePlans = plans.filter(p => p.status === 'active');
  const draftPlans = plans.filter(p => p.status === 'draft');

  const clientIdsWithPlan = new Set(plans.map(p => p.client?.id).filter(Boolean));
  const clientsWithPlan = clientIdsWithPlan.size;
  const clientsWithPlanPct = totalClientCount > 0
    ? Math.round((clientsWithPlan / totalClientCount) * 100) : 0;

  const stylistMap = new Map<string, { stylistId: string; stylistName: string; plans: GeneratedPlan[]; clientIds: Set<string> }>();
  for (const plan of plans) {
    const key = plan.stylistId || 'unknown';
    if (!stylistMap.has(key)) {
      stylistMap.set(key, { stylistId: key, stylistName: plan.stylistName || 'Unknown', plans: [], clientIds: new Set() });
    }
    const e = stylistMap.get(key)!;
    e.plans.push(plan);
    if (plan.client?.id) e.clientIds.add(plan.client.id);
  }

  const clientsWithBookings = new Set(bookings.map(b => b.client_id));
  const stylistPlanStats: StylistStat[] = Array.from(stylistMap.values()).map(s => {
    const active = s.plans.filter(p => p.status === 'active').length;
    const revenue = s.plans.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const converted = s.plans.filter(p => p.status === 'active' && p.client?.id && clientsWithBookings.has(p.client.id)).length;
    return {
      stylistId: s.stylistId,
      stylistName: s.stylistName,
      planCount: s.plans.length,
      activePlans: active,
      totalRevenue: revenue,
      clientCount: s.clientIds.size,
      conversionRate: active > 0 ? Math.round((converted / active) * 100) : 0,
    };
  });

  const monthMap = new Map<string, number>();
  const trendMonths: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    trendMonths.push(k);
    monthMap.set(k, 0);
  }
  for (const plan of plans) {
    const k = new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (monthMap.has(k)) monthMap.set(k, (monthMap.get(k) || 0) + 1);
  }
  let cum = 0;
  const planCreationTrend = trendMonths.map(month => {
    const count = monthMap.get(month) || 0;
    cum += count;
    return { month, count, cumulative: cum };
  });

  const plansConverted = activePlans.filter(p => p.client?.id && clientsWithBookings.has(p.client.id));
  const planBookingConversionRate = activePlans.length > 0
    ? Math.round((plansConverted.length / activePlans.length) * 100) : 0;
  const bookingsFromPlan = bookings.filter(b => b.source === 'plan' || b.source === 'blueprint').length;

  const totalConfirmedRevenue = activePlans.reduce((s, p) => s + (p.totalCost || 0), 0);
  const totalProjectedRevenue = plans.reduce((s, p) => s + (p.totalCost || 0), 0);
  const revenueStabilityScore = totalProjectedRevenue > 0
    ? Math.min(100, Math.round((totalConfirmedRevenue / totalProjectedRevenue) * 100)) : 0;

  const monthlyRevenue: MonthlyRevenuePoint[] = [];
  for (let i = -5; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    let confirmed = 0;
    let projected = 0;
    for (const plan of plans) {
      for (const appt of plan.appointments) {
        const ad = new Date(appt.date);
        if (ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear()) {
          const val = plan.averageAppointmentCost || 0;
          if (plan.status === 'active') confirmed += val;
          else projected += val;
        }
      }
    }
    monthlyRevenue.push({ month, confirmed, projected });
  }

  const projectRevInDays = (days: number) =>
    plans.reduce((sum, plan) =>
      sum + plan.appointments
        .filter(a => { const t = new Date(a.date).getTime(); return t > nowTime && t <= nowTime + days * 86400000; })
        .reduce((s) => s + (plan.averageAppointmentCost || 0), 0), 0);

  const projectedNext3 = projectRevInDays(90);
  const projectedNext6 = projectRevInDays(180);
  const projectedNext12 = projectRevInDays(365);

  const svcMap = new Map<string, ServiceMixItem>();
  for (const plan of plans) {
    for (const appt of plan.appointments) {
      for (const svc of appt.services) {
        const k = svc.name;
        if (!svcMap.has(k)) svcMap.set(k, { name: svc.name, category: svc.category || '', count: 0, revenue: 0 });
        const e = svcMap.get(k)!;
        e.count++;
        e.revenue += (svc as any).cost || 0;
      }
    }
  }
  const serviceMix = Array.from(svcMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  const clientMainMap = new Map<string, boolean>();
  for (const plan of plans) {
    const cid = plan.client?.id;
    if (!cid) continue;
    const isHighMaint = plan.appointments.some(a =>
      a.services.some(s => s.category === 'Color' || s.name.toLowerCase().includes('highlight') || s.name.toLowerCase().includes('color') || s.name.toLowerCase().includes('tone'))
    );
    if (isHighMaint) clientMainMap.set(cid, true);
    else if (!clientMainMap.has(cid)) clientMainMap.set(cid, false);
  }
  const highMaintenanceClients = Array.from(clientMainMap.values()).filter(Boolean).length;
  const lowMaintenanceClients = clientMainMap.size - highMaintenanceClients;

  const clientValMap = new Map<string, ClientValueItem>();
  for (const plan of plans) {
    const cid = plan.client?.id;
    if (!cid) continue;
    if (!clientValMap.has(cid)) clientValMap.set(cid, { clientId: cid, clientName: plan.client?.name || 'Unknown', projectedValue: 0, hasActivePlan: false });
    const e = clientValMap.get(cid)!;
    e.projectedValue += plan.totalCost || 0;
    if (plan.status === 'active') e.hasActivePlan = true;
  }
  const clientValues = Array.from(clientValMap.values()).sort((a, b) => b.projectedValue - a.projectedValue);
  const avgClientValue = clientValues.length > 0
    ? Math.round(clientValues.reduce((s, c) => s + c.projectedValue, 0) / clientValues.length) : 0;
  const totalProjectedLTV = clientValues.reduce((s, c) => s + c.projectedValue, 0);

  return {
    totalPlans: plans.length,
    activePlans: activePlans.length,
    draftPlans: draftPlans.length,
    totalClients: totalClientCount,
    clientsWithPlan,
    clientsWithPlanPct,
    stylistPlanStats,
    planCreationTrend,
    planBookingConversionRate,
    bookingsFromPlan,
    bookingsTotal: bookings.length,
    totalConfirmedRevenue,
    totalProjectedRevenue,
    revenueStabilityScore,
    monthlyRevenue,
    projectedNext3,
    projectedNext6,
    projectedNext12,
    serviceMix,
    highMaintenanceClients,
    lowMaintenanceClients,
    clientValues,
    avgClientValue,
    totalProjectedLTV,
  };
}

export function getWidgetValue(widgetId: string, metrics: ReportMetrics): { value: string; sub?: string } {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  const pct = (n: number) => `${n}%`;

  switch (widgetId) {
    case 'clients-with-plan':
      return { value: pct(metrics.clientsWithPlanPct), sub: `${metrics.clientsWithPlan} of ${metrics.totalClients} clients` };
    case 'active-plans':
      return { value: String(metrics.activePlans), sub: 'active roadmaps' };
    case 'draft-plans':
      return { value: String(metrics.draftPlans), sub: 'pending activation' };
    case 'booking-conversion':
      return { value: pct(metrics.planBookingConversionRate), sub: 'plans → bookings' };
    case 'bookings-total':
      return { value: String(metrics.bookingsTotal), sub: 'total bookings' };
    case 'projected-3m':
      return { value: fmt(metrics.projectedNext3), sub: 'next 90 days' };
    case 'projected-6m':
      return { value: fmt(metrics.projectedNext6), sub: 'next 180 days' };
    case 'projected-12m':
      return { value: fmt(metrics.projectedNext12), sub: '12-month projection' };
    case 'revenue-stability':
      return { value: pct(metrics.revenueStabilityScore), sub: `${fmt(metrics.totalConfirmedRevenue)} confirmed` };
    case 'service-mix-top':
      return {
        value: metrics.serviceMix[0]?.name || '—',
        sub: metrics.serviceMix[0] ? `${metrics.serviceMix[0].count} times planned` : 'no data',
      };
    case 'maintenance-ratio':
      return {
        value: String(metrics.highMaintenanceClients),
        sub: `high-maint. of ${metrics.highMaintenanceClients + metrics.lowMaintenanceClients} total`,
      };
    case 'avg-client-value':
      return { value: fmt(metrics.avgClientValue), sub: 'per client (projected)' };
    case 'total-ltv':
      return { value: fmt(metrics.totalProjectedLTV), sub: 'total projected LTV' };
    case 'plans-per-stylist': {
      const top = metrics.stylistPlanStats.sort((a, b) => b.planCount - a.planCount)[0];
      return { value: top ? String(top.planCount) : '0', sub: top ? `${top.stylistName} leads` : 'no data' };
    }
    case 'top-stylist-revenue': {
      const top = metrics.stylistPlanStats.sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
      return { value: top ? fmt(top.totalRevenue) : '$0', sub: top ? top.stylistName : 'no data' };
    }
    default:
      return { value: '—' };
  }
}

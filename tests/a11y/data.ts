import type { Client, GeneratedPlan } from '../../types';

const clients: Client[] = Array.from({ length: 80 }, (_, i) => ({
  id: `fixture-client-${i}`, name: `Example Client ${i + 1}`,
  email: `client${i}@example.invalid`, avatarUrl: '', historicalData: [],
}));
const plans: GeneratedPlan[] = Array.from({ length: 27 }, (_, i) => ({
  id: `fixture-plan-${i}`, status: 'active', membershipStatus: 'none',
  createdAt: '2026-10-01T12:00:00Z', stylistId: 'fixture-stylist',
  stylistName: 'Example Stylist', client: clients[i], appointments: [],
  totalYearlyAppointments: 0, averageAppointmentCost: 0,
  averageMonthlySpend: 0, totalCost: i === 0 ? 7370 : 3500,
}));

const noop = () => {};
export const useAuth = () => ({
  user: { id: 'fixture-admin', name: 'Example Admin', role: 'admin', email: 'admin@example.invalid' },
  updateUser: noop, logout: noop,
});
export const usePlans = () => ({
  plans: new URLSearchParams(location.search).has('empty') ? [] : plans,
  bookings: [], getStats: () => ({ activePlansCount: new URLSearchParams(location.search).has('empty') ? 0 : 27, totalRevenue: 98370 }),
});
export const useSettings = () => ({
  clients: new URLSearchParams(location.search).has('empty') ? [] : clients,
  branding: { salonName: 'Example Salon', primaryColor: '#0B3559', accentColor: '#5890A6', font: 'Comfortaa' },
  updateBranding: noop, textSize: 'M', updateTextSize: noop,
  pinnedReports: { 'fixture-admin': ['active-plans', 'clients-with-plan', 'projected-3m'] },
  updatePinnedReports: noop, saveAll: async () => {},
});

import type { Service, MembershipTier, StylistLevel } from '../types';

export const STYLIST_LEVELS: StylistLevel[] = [
    {
        id: 'lvl_1',
        name: 'Junior Stylist',
        color: 'bg-blue-100 text-blue-800',
        order: 1,
        defaultPermissions: {
            canBookAppointments: true,
            canOfferDiscounts: false,
            requiresDiscountApproval: true,
            viewGlobalReports: false,
            viewClientContact: true,
            viewAllSalonPlans: false,
            can_book_own_schedule: true,
            can_book_peer_schedules: false,
        }
    },
    {
        id: 'lvl_2',
        name: 'Senior Stylist',
        color: 'bg-purple-100 text-purple-800',
        order: 2,
        defaultPermissions: {
            canBookAppointments: true,
            canOfferDiscounts: true,
            requiresDiscountApproval: false,
            viewGlobalReports: false,
            viewClientContact: true,
            viewAllSalonPlans: false,
            can_book_own_schedule: true,
            can_book_peer_schedules: false,
        }
    },
    {
        id: 'lvl_3',
        name: 'Master Stylist',
        color: 'bg-amber-100 text-amber-800',
        order: 3,
        defaultPermissions: {
            canBookAppointments: true,
            canOfferDiscounts: true,
            requiresDiscountApproval: false,
            viewGlobalReports: true,
            viewClientContact: true,
            viewAllSalonPlans: true,
            can_book_own_schedule: true,
            can_book_peer_schedules: true,
        }
    },
];

export const ALL_SERVICES: Service[] = [
  { id: 's1', name: 'Haircut', category: 'Styling', cost: 100, duration: 60, tierPrices: { 'lvl_1': 80, 'lvl_2': 100, 'lvl_3': 120 } },
  { id: 's2', name: 'Root Touch Up', category: 'Color', cost: 120, duration: 90, tierPrices: { 'lvl_1': 100, 'lvl_2': 120, 'lvl_3': 140 } },
  { id: 's3', name: 'Partial Highlight', category: 'Color', cost: 180, duration: 120, tierPrices: { 'lvl_1': 150, 'lvl_2': 180, 'lvl_3': 210 } },
  { id: 's4', name: 'Full Highlight', category: 'Color', cost: 250, duration: 180, tierPrices: { 'lvl_1': 200, 'lvl_2': 250, 'lvl_3': 300 } },
  { id: 's5', name: 'Keratin', category: 'Treatment', cost: 300, duration: 150 },
  { id: 's6', name: 'Add Tone', category: 'Color', cost: 50, duration: 30 },
  { id: 's7', name: 'Moisture', category: 'Treatment', cost: 40, duration: 30 },
  { id: 's8', name: 'Repair', category: 'Treatment', cost: 45, duration: 30 },
  { id: 's9', name: 'Clarify', category: 'Treatment', cost: 35, duration: 20 },
  { id: 's10', name: 'Extensions', category: 'Styling', cost: 500, duration: 240 },
];

export const MEMBERSHIP_TIERS: MembershipTier[] = [
    { id: 't1', name: 'Silver Member', minSpend: 0, perks: ['Access to Booking App', 'Birthday Discount'], color: '#9CA3AF' },
    { id: 't2', name: 'Gold Member', minSpend: 150, perks: ['10% Off Retail', 'Priority Holiday Booking', 'Free Bang Trims'], color: '#FBBF24' },
    { id: 't3', name: 'Platinum Member', minSpend: 300, perks: ['20% Off Retail', '1 Free Treatment / Month', 'Complimentary Blowouts'], color: '#E5E7EB' },
];

export const TODAY_APPOINTMENTS = [
    { id: 'a1', time: '09:00 AM', clientName: 'Emma Thompson', service: 'Full Highlight', status: 'completed' },
    { id: 'a2', time: '12:30 PM', clientName: 'Sophia Martinez', service: 'Haircut', status: 'in-progress' },
    { id: 'a3', time: '02:00 PM', clientName: 'Ava Johnson', service: 'Keratin Treatment', status: 'upcoming' },
    { id: 'a4', time: '04:30 PM', clientName: 'Olivia Wilson', service: 'Consultation', status: 'upcoming' },
];

export const SERVICE_COLORS: { [key: string]: string } = {
    'Haircut': '#8884d8',
    'Full Highlight': '#82ca9d',
    'Keratin': '#ffc658',
    'Moisture': '#ff8042',
    'Clarify': '#00C49F',
    'Root Touch Up': '#0088FE',
    'Partial Highlight': '#FFBB28',
    'Add Tone': '#FF8042',
    'Repair': '#A4DE6C',
    'Extensions': '#d0ed57'
};

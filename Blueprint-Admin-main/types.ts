export interface Service {
  id: string;
  version?: number;
  name: string;
  category: string;
  cost: number;
  duration: number; // in minutes
  tierPrices?: Record<string, number>; 
}

export interface BrandingSettings {
    salonName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    font: string;
    logoUrl?: string;
}

export interface MembershipConfig {
    enabled: boolean;
    tiers: MembershipTier[];
}

export interface ServiceLinkingConfig {
    enabled: boolean;
    triggerCategory: string; 
    triggerServiceIds: string[]; // Specific services that trigger the rule
    exclusionServiceId: string; // e.g. 'Haircut'
    linkedServiceId: string; // e.g. 'Blowdry'
}

export interface HistoricalData {
    month: string;
    cost: number;
}

export interface Client {
  id: string;
  externalId?: string; // ID from Square or other POS
  name: string;
  email?: string; // Contact email
  phone?: string; // Contact phone
  avatarUrl: string;
  historicalData: HistoricalData[];
  nextAppointmentDate?: Date;
  lastAppointmentDate?: Date;
  membershipTierId?: string;
  // FIX: Added optional source property to resolve TypeScript error in SelectClientStep.tsx where source is used to indicate origin
  source?: string;
}

export type Step = 'select-client' | 'select-services' | 'set-dates' | 'set-frequency' | 'loading' | 'summary';

// FIX: Add 'client' to UserRole to resolve type errors in PlanSummaryStep and PlanContext.
export type UserRole = 'admin' | 'stylist' | 'client';

export type PlanStatus = 'draft' | 'active' | 'paused' | 'cancelled'; 

// FIX: Added 'none' and 'offered' to MembershipStatus to align with its usage in the application.
export type MembershipStatus = 'active' | 'paused' | 'cancelled' | 'inactive' | 'none' | 'offered';

export type AppTextSize = 'S' | 'M' | 'L';

export interface PlanDetails {
    [serviceId: string]: {
        firstDate: Date | null;
        frequency: number | null; // in weeks
    };
}

export interface PlanAppointment {
    date: Date;
    services: Service[];
}

export interface GeneratedPlan {
    id: string;
    status: PlanStatus; 
    membershipStatus: MembershipStatus;
    membershipOfferSentAt?: string | null;
    membershipOfferAcceptedAt?: string | null;
    createdAt: string;
    stylistId: string;
    stylistName: string;
    client: Client;
    appointments: PlanAppointment[];
    totalYearlyAppointments: number;
    averageAppointmentCost: number;
    averageMonthlySpend: number;
    totalCost: number;
}

export interface StylistLevel {
    id: string;
    name: string;
    color: string;
    order: number;
}

export interface Stylist {
    id: string;
    name: string;
    role: string;
    email: string;
    levelId: string;
    permissions: {
        canBookAppointments: boolean;
        canOfferDiscounts: boolean;
        requiresDiscountApproval: boolean;
        viewGlobalReports: boolean;
        viewClientContact: boolean;
        viewAllSalonPlans: boolean;
        can_book_own_schedule: boolean;
        can_book_peer_schedules: boolean;
    };
}

export interface MembershipTier {
    id: string;
    name: string;
    minSpend: number;
    perks: string[];
    color: string;
}

export interface User {
    id: string | number;
    name: string;
    role: UserRole;
    email?: string;
    avatarUrl?: string;
    stylistData?: Stylist;
    clientData?: Client;
    isMock?: boolean;
    isEnterprise?: boolean;
}

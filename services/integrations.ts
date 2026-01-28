
import type { Service, Stylist } from '../types';
import { ALL_SERVICES } from '../data/mockData';

// This interface defines what standard data we expect from ANY booking provider
// (Vagaro, MindBody, Phorest, etc.)
export interface IntegrationProvider {
    name: string;
    syncServices: () => Promise<Service[]>;
    syncTeam: () => Promise<Stylist[]>;
}

// Mock Data representing what Vagaro might return
const EXTERNAL_NEW_SERVICES: Service[] = [
    { 
        id: 'ext_1', 
        name: 'Scalp Detox Treatment', 
        category: 'Treatment', 
        cost: 85, 
        duration: 45,
        tierPrices: { junior: 75, senior: 85, master: 95 }
    },
    { 
        id: 'ext_2', 
        name: 'Balayage Refresh', 
        category: 'Color', 
        cost: 160, 
        duration: 120,
        tierPrices: { junior: 140, senior: 160, master: 180 }
    }
];

const EXTERNAL_NEW_STYLIST: Stylist = {
    // FIX: Changed id from number to string to match the 'Stylist' type.
    id: '99',
    name: 'Chloe Admin (Imported)',
    role: 'Salon Manager',
    levelId: 'lvl_3',
    email: 'chloe@luxesalon.com',
    // FIX: Updated permissions to match the Stylist interface definition in types.ts
    permissions: { 
        canBookAppointments: true, 
        canOfferDiscounts: true, 
        requiresDiscountApproval: false, 
        viewGlobalReports: true,
        // FIX: Added missing property 'viewClientContact' to satisfy the Stylist interface.
        viewClientContact: true,
        // FIX: Added missing property 'viewAllSalonPlans' to satisfy the Stylist interface.
        viewAllSalonPlans: true
    }
};

// The Service Implementation
export const BookingIntegrationService = {
    
    // Simulate connecting to an API
    syncData: async (): Promise<{ newServices: Service[], newStylists: Stylist[] }> => {
        return new Promise((resolve) => {
            console.log("Initiating secure handshake with Booking Provider...");
            
            setTimeout(() => {
                // In a real app, this would be:
                // const response = await fetch('https://api.vagaro.com/v1/services', { headers: { 'Authorization': API_KEY }});
                
                resolve({
                    newServices: EXTERNAL_NEW_SERVICES,
                    newStylists: [EXTERNAL_NEW_STYLIST]
                });
            }, 2500); // Simulate network latency
        });
    }
};
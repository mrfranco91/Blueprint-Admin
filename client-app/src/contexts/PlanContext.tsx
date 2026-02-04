import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { GeneratedPlan, PlanAppointment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface BookingRecord {
    id: string;
    client_id: string;
    stylist_id: string;
    start_time: string;
    end_time?: string;
    status: string;
    services: { variation_id: string; name: string }[];
    source: string;
}

interface PlanContextType {
    plans: GeneratedPlan[];
    bookings: BookingRecord[];
    savePlan: (plan: GeneratedPlan) => Promise<GeneratedPlan>; // Returns the confirmed plan
    saveBooking: (booking: Omit<BookingRecord, 'id'> & { id?: string }) => Promise<{ data: any, error: any }>;
    getPlanForClient: (clientId: string) => GeneratedPlan | null; // Gets latest
    getClientHistory: (clientId: string) => GeneratedPlan[]; // Gets all
    getClientBookings: (clientId: string) => BookingRecord[];
    getStats: () => { totalRevenue: number, activePlansCount: number };
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [plans, setPlans] = useState<GeneratedPlan[]>([]);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) {
                console.error("Supabase client not available.");
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                console.log('User info:', user);
                console.log('User role:', user?.role);
                console.log('Supabase available?', !!supabase);

                let plansQuery = supabase.from('plans').select('*');
                let bookingsQuery = supabase.from('bookings').select('*');

                if (user?.role === 'client' && user.id) {
                    console.log('Filtering for client:', user.id);
                    plansQuery = plansQuery.eq('client_id', user.id);
                    bookingsQuery = bookingsQuery.eq('client_id', user.id);
                } else {
                    console.log('Admin user - fetching all plans');
                }

                console.log('About to execute query...');
                const [pRes, bRes] = await Promise.all([plansQuery, bookingsQuery]);

                console.log('Query response:', { hasError: !!pRes.error, dataLength: pRes.data?.length, pRes });

                if (pRes.error) {
                    console.error('DETAILED ERROR:', JSON.stringify(pRes.error, null, 2));
                }

                if (pRes.error) {
                    console.error("Error fetching plans:", pRes.error.message || pRes.error);
                    setPlans([]);
                } else if (pRes.data) {
                    console.log('Raw plans data from DB:', pRes.data);

                    // Fallback: if scoped query returns 0 results, fetch all plans (ignore user filter)
                    let planData = pRes.data;
                    if ((planData?.length ?? 0) === 0 && user?.role === 'admin') {
                        console.log('Admin query returned 0, trying fallback (no user filter)');
                        const fallbackRes = await supabase.from('plans').select('*');
                        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
                            console.log('Fallback query returned:', { count: fallbackRes.data.length });
                            planData = fallbackRes.data;
                        }
                    }

                    const formattedPlans = planData
                        .map((dbPlan: any) => {
                            const blob = dbPlan.plan_data;
                            console.log('Processing plan:', dbPlan.id, 'blob:', blob);

                            // Be more flexible - accept plans even without client data
                            if (!blob) {
                                console.warn('Skipping plan with no plan_data:', dbPlan.id);
                                return null;
                            }

                            // Reconstruct plan prioritizing the data blob but ensuring ID consistency
                            const plan = {
                                ...blob,
                                id: dbPlan.id,
                                client: blob.client || { name: 'Unknown Client' },
                                status: blob.status || 'draft',
                                totalCost: blob.totalCost || 0,
                                createdAt: blob.createdAt || dbPlan.created_at,
                                appointments: (blob.appointments || []).map((a: any) => ({
                                    ...a,
                                    date: new Date(a.date)
                                }))
                            };

                            // Ensure all services have required fields
                            plan.appointments = plan.appointments.map((appt: any) => ({
                                ...appt,
                                services: (appt.services || []).map((s: any) => ({
                                    ...s,
                                    name: s.name || s.variation_id || 'Unknown Service'
                                }))
                            }));

                            return plan;
                        })
                        .filter((p): p is GeneratedPlan => p !== null);

                    console.log('Formatted plans to display:', formattedPlans);
                    setPlans(formattedPlans);
                }

                if (bRes.error) {
                    const isMissingTable = bRes.error.code === '42P01' || bRes.error.message?.includes('schema cache');
                    if (isMissingTable) {
                        console.warn("Bookings table not found in Supabase.");
                        setBookings([]);
                    } else {
                        console.error("Error fetching bookings:", bRes.error.message || JSON.stringify(bRes.error));
                    }
                } else if (bRes.data) {
                    setBookings(bRes.data);
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    console.warn('PlanProvider fetch aborted during auth initialization (safe to ignore)');
                } else {
                    console.error("Fatal error during PlanProvider data fetch:", err.message || err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const savePlan = async (newPlan: GeneratedPlan): Promise<GeneratedPlan> => {
        console.log('savePlan called with:', newPlan);

        if (!supabase) {
            console.error('Supabase client not available in savePlan');
            throw new Error("Supabase client not available.");
        }

        // --- UUID ASSERTION GUARD (MANDATORY) ---
        if (!newPlan.client.id || !UUID_REGEX.test(newPlan.client.id)) {
            const errorMessage = `CRITICAL INVARIANT VIOLATION: Attempted to save a plan with an invalid or missing client_id ('${newPlan.client.id}'). This must be a valid UUID. Operation aborted.`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        const isNewPlan = newPlan.id.startsWith('plan_');

        const { id: _, ...planDataForBlob } = newPlan;

        const payloadBase = {
            client_id: newPlan.client.id,
            plan_data: {
                ...planDataForBlob,
                status: newPlan.status,
                membershipStatus: newPlan.membershipStatus,
                updatedAt: new Date().toISOString()
            }
        };

        const payload = isNewPlan ? payloadBase : { ...payloadBase, id: newPlan.id };

        console.log('savePlan payload:', payload);

        const { data, error } = await supabase
            .from('plans')
            // FIX: Cast payload to `any` to resolve Supabase type inference issue.
            .upsert(payload as any, { onConflict: 'id' })
            .select();

        if (error) {
            console.error("Supabase Persistence Error:", error.message);
            throw new Error(`Plan Save Failed: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error("Plan Save Failed: No data returned from server.");
        }

        const dbRow = data[0];

        // After a successful DB write, we must not throw an error.
        // We will try to normalize the data for the UI, but if it fails,
        // we'll log a warning and return the raw data, which the UI can handle.
        try {
            // FIX: Cast `dbRow` to `any` to resolve Supabase type inference issues for `plan_data` and `id`.
            const blob = (dbRow as any).plan_data;
            if (!blob || typeof blob !== 'object' || !blob.client) {
                throw new Error("plan_data from DB is missing or not an object.");
            }

            const formattedPlan: GeneratedPlan = {
                ...blob,
                id: (dbRow as any).id,
                appointments: (blob.appointments || []).map((a: any) => ({
                    ...a,
                    date: new Date(a.date)
                }))
            };

            setPlans(prev => {
                const existingIndex = prev.findIndex(p => p.id === formattedPlan.id);
                if (existingIndex > -1) {
                    const updated = [...prev];
                    updated[existingIndex] = formattedPlan;
                    return updated;
                }
                return [...prev, formattedPlan];
            });

            return formattedPlan;
        } catch (e: any) {
            console.warn(
                "CRITICAL: Plan was saved to DB, but failed to parse for UI update. " +
                // FIX: Cast `dbRow` to `any` to resolve Supabase type inference issue.
                `Plan ID: ${(dbRow as any).id}. Error: ${e.message}. ` +
                "The app will proceed, but this plan may not display correctly until app refresh."
            );
            // Per instructions, return the raw database row on failure.
            // The calling component is designed to handle this.
            // Casting to `any` to bypass strict return type for this fallback.
            return dbRow as any;
        }
    };

    const saveBooking = async (booking: Omit<BookingRecord, 'id'> & { id?: string }) => {
        if (!supabase) return { data: null, error: new Error("No database connection") };
        // FIX: Cast payload to `any` to resolve Supabase type inference issue.
        const { data, error } = await supabase.from('bookings').upsert(booking as any).select().single();
        if (!error && data) {
            setBookings(prev => {
                const index = prev.findIndex(b => b.id === (data as any).id);
                if (index > -1) {
                    const next = [...prev];
                    next[index] = data as BookingRecord;
                    return next;
                }
                return [...prev, data as BookingRecord];
            });
        }
        return { data, error };
    };

    const getPlanForClient = (clientId: string) => {
        const clientPlans = plans.filter(p => p.client.id === clientId);
        if (clientPlans.length === 0) return null;
        return clientPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    };
    
    const getClientHistory = (clientId: string) => {
        return plans
            .filter(p => p.client.id === clientId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    const getClientBookings = (clientId: string) => {
        return bookings.filter(b => b.client_id === clientId);
    };
    
    const getStats = () => {
        const approvedPlans = plans.filter(p => p.status === 'active');
        const totalRevenue = approvedPlans.reduce((sum, p) => sum + p.totalCost, 0);
        return {
            totalRevenue,
            activePlansCount: approvedPlans.length
        };
    };

    return (
        <PlanContext.Provider value={{ plans, bookings, savePlan, saveBooking, getPlanForClient, getClientHistory, getClientBookings, getStats }}>
            {children}
        </PlanContext.Provider>
    );
};

export const usePlans = () => {
    const context = useContext(PlanContext);
    if (!context) {
        throw new Error("usePlans must be used within a PlanProvider");
    }
    return context;
};

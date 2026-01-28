import { Service, Stylist, Client, PlanAppointment } from '../types';
import { supabase } from '../lib/supabase';

// Square API Types (Simplified)
interface SquareLocation {
    id: string;
    name: string;
    business_name: string;
    timezone: string;
    status: string;
}

// Support both OAuth and manual token-based authentication
export const isSquareTokenMissing = false;

async function squareApiFetch<T>(path: string, options: { method?: string, body?: any } = {}): Promise<T> {
    const { method = 'GET', body } = options;

    // Get the current Supabase session to pass auth to the proxy
    const { data: { session } } = await supabase.auth.getSession();

    // Route all Square API calls through the server proxy to avoid CORS issues
    const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Square-Version': '2025-10-16',
    };

    // If we have a Supabase session, use it; otherwise the proxy will fall back to stored token
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`/api/square/proxy?path=${encodeURIComponent(path)}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        data = { error: { detail: text } };
    }

    if (!response.ok) {
        const err = data.errors?.[0];
        const fieldInfo = err?.field ? ` (Field: ${err.field})` : '';
        const errorMessage = err?.detail || 'Unknown error';
        console.error('[SQUARE API ERROR] Full response:', JSON.stringify(data, null, 2));
        throw new Error(`Square API Error (${response.status}): ${errorMessage}${fieldInfo}`);
    }
    return data as T;
}


export const SquareIntegrationService = {
  formatDate(date: Date, timezone?: string) {
    if (!date || isNaN(date.getTime())) {
        return new Date().toISOString();
    }

    // Square Bookings API requires RFC 3339 format with milliseconds: YYYY-MM-DDTHH:mm:ss.sssZ
    return date.toISOString();
  },
  
  fetchLocation: async (): Promise<SquareLocation> => {
      const data: any = await squareApiFetch('/v2/locations');
      console.log('[LOCATION] Full locations response:', JSON.stringify(data, null, 2));
      const activeLocation = data.locations?.find((loc: any) => loc.status === 'ACTIVE');
      console.log('[LOCATION] Active location selected:', JSON.stringify(activeLocation, null, 2));
      if (!activeLocation) throw new Error("No active location found.");
      return activeLocation;
  },

  fetchBusinessDetails: async (): Promise<string> => {
      const loc = await SquareIntegrationService.fetchLocation();
      return loc.business_name || loc.name;
  },

  fetchMerchantDetails: async (merchantId: string): Promise<{ business_name: string }> => {
      const data: any = await squareApiFetch(`/v2/merchants/${merchantId}`);
      const merchant = data.merchant;
      if (!merchant) throw new Error("Could not retrieve merchant details.");
      return { business_name: merchant.business_name || 'Admin' };
  },

  fetchCatalog: async (): Promise<Service[]> => {
    let cursor: string | undefined = undefined;
    const allObjects: any[] = [];
    let pageCount = 0;

    // Fetch all pages of the catalog
    do {
        const path = `/v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        console.log('[CATALOG] Fetching page', pageCount + 1, 'cursor:', cursor ? cursor.substring(0, 20) + '...' : 'none');
        const data: any = await squareApiFetch(path);

        if (data.objects) {
            console.log('[CATALOG] Page', pageCount + 1, 'returned', data.objects.length, 'objects');
            allObjects.push(...data.objects);
        }
        cursor = data.cursor;
        pageCount++;
        console.log('[CATALOG] Next cursor:', cursor ? 'exists' : 'none (end of pages)');
    } while (cursor);

    console.log('[CATALOG] Total objects fetched across', pageCount, 'pages:', allObjects.length);

    const items = allObjects.filter((o: any) => o.type === 'ITEM');
    const variations = allObjects.filter((o: any) => o.type === 'ITEM_VARIATION');
    const categories = allObjects.filter((o: any) => o.type === 'CATEGORY');

    console.log('[CATALOG] Breakdown - Items:', items.length, 'Variations:', variations.length);
    console.log('[CATALOG] All items:', items.map(i => ({ id: i.id, name: i.item_data?.name })));
    console.log('[CATALOG] All variations:', variations.map(v => ({ id: v.id, itemId: v.item_variation_data?.item_id, name: v.item_variation_data?.name })));

    const services: Service[] = [];

    variations.forEach((variation: any) => {
        const item = items.find((i: any) => i.id === variation.item_variation_data.item_id);
        if (item) {
            const categoryObj = categories.find((c: any) => c.id === item.item_data.category_id);
            const priceMoney = variation.item_variation_data.price_money;
            const durationMs = variation.item_variation_data.service_duration;

            const serviceName = `${item.item_data.name}${variation.item_variation_data.name !== 'Regular' ? ` - ${variation.item_variation_data.name}` : ''}`.trim();

            services.push({
                id: variation.id,
                version: variation.version,
                name: serviceName,
                category: categoryObj?.category_data?.name || 'Uncategorized',
                cost: priceMoney ? Number(priceMoney.amount) / 100 : 0,
                duration: durationMs ? durationMs / 1000 / 60 : 0,
            });
        }
    });

    console.log('[CATALOG] Available services (total):', services.length, services.map(s => ({ name: s.name, id: s.id })));
    return services;
  },

  fetchTeam: async (): Promise<Stylist[]> => {
      try {
          const data: any = await squareApiFetch('/v2/team-members/search', { method: 'POST', body: { query: { filter: {} }, limit: 100 } });
          const members = data.team_members || [];

          console.log('[TEAM] Raw response:', JSON.stringify(data, null, 2));

          if (members.length === 0) {
              console.warn('[TEAM] No team members found in Square');
              return [];
          }

          console.log('[TEAM] Fetched team members:', members.map((m: any) => ({ id: m.id, name: `${m.given_name} ${m.family_name}` })));

          return members.map((member: any) => ({
              id: member.id,
              name: `${member.given_name} ${member.family_name}`,
              role: member.is_owner ? 'Owner' : 'Team Member',
              email: member.email_address,
              levelId: 'lvl_2',
              permissions: {
                  canBookAppointments: true,
                  canOfferDiscounts: false,
                  requiresDiscountApproval: true,
                  viewGlobalReports: false,
                  viewClientContact: true,
                  viewAllSalonPlans: false,
                  can_book_own_schedule: true,
                  can_book_peer_schedules: false,
              }
          }));
      } catch (err) {
          console.error('Failed to load Square team members:', err);
          return [];
      }
  },

  fetchCustomers: async (): Promise<Partial<Client>[]> => {
      let cursor: string | undefined = undefined;
      const allCustomers: any[] = [];

      do {
          const path = `/v2/customers/list${cursor ? `?cursor=${cursor}` : ''}`;
          const data: any = await squareApiFetch(path);
          
          if (data.customers) {
              allCustomers.push(...data.customers);
          }
          cursor = data.cursor;
      } while(cursor);
      
      return allCustomers.map((c: any) => ({
        id: c.id,
        externalId: c.id,
        name: `${c.given_name || ''} ${c.family_name || ''}`.trim() || c.email_address || 'Unnamed Client',
        email: c.email_address,
        phone: c.phone_number,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${c.given_name || ''} ${c.family_name || ''}`.trim() || c.email_address || 'UC')}&background=random`,
      }));
  },

  searchCustomer: async (name: string): Promise<string | null> => {
      const body: any = {
          query: {
              sort: {
                  field: "CREATED_AT",
                  order: "DESC"
              }
          },
          limit: 100
      };

      const data: any = await squareApiFetch('/v2/customers/search', {
          method: 'POST',
          body: body
      });

      // Search through returned customers for name match
      const customers = data.customers || [];
      const searchName = name.toLowerCase();

      const customer = customers.find((c: any) => {
          const fullName = `${c.given_name || ''} ${c.family_name || ''}`.toLowerCase().trim();
          return fullName === searchName || fullName.includes(searchName);
      });

      return customer ? customer.id : null;
  },

  findAvailableSlots: async (params: {
      locationId: string,
      startAt: string,
      teamMemberId: string,
      serviceVariationId: string
  }): Promise<string[]> => {
      const startDate = new Date(params.startAt);
      if (isNaN(startDate.getTime())) throw new Error("Invalid start time passed to Square.");

      const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));

      // Ensure both timestamps have milliseconds in ISO format
      const startAtFormatted = startDate.toISOString();
      const endAtFormatted = endDate.toISOString();

      const body = {
          query: {
              filter: {
                  booking_id: "",
                  location_id: params.locationId,
                  start_at_range: {
                      end_at: endAtFormatted,
                      start_at: startAtFormatted
                  },
                  segment_filters: [
                      {
                          service_variation_id: params.serviceVariationId
                      }
                  ]
              }
          }
      };

      const data: any = await squareApiFetch('/v2/bookings/availability/search', { method: 'POST', body });
      const slots = (data.availabilities || [])
          .map((a: any) => a.start_at);

      return slots;
  },

  fetchAllBookings: async (locationId: string): Promise<any[]> => {
    let cursor: string | undefined = undefined;
    const allBookings: any[] = [];
    
    do {
        const path = `/v2/bookings?location_id=${locationId}${cursor ? `&cursor=${cursor}` : ''}`;
        const data: any = await squareApiFetch(path);
        if (data.bookings) {
            allBookings.push(...data.bookings);
        }
        cursor = data.cursor;
    } while (cursor);

    return allBookings;
  },

  createAppointment: async (bookingDetails: {
      locationId: string;
      startAt: string; 
      customerId: string;
      teamMemberId: string;
      services: Service[];
  }): Promise<any> => {
      const { locationId, startAt, customerId, teamMemberId, services } = bookingDetails;
      
      if (!locationId) throw new Error("Location ID is required for booking.");
      if (!customerId) throw new Error("Customer ID is required for booking.");

      let resolvedTeamMemberId = teamMemberId;
      const isInvalidTeamMemberId = !teamMemberId || teamMemberId.startsWith('TM-') || teamMemberId === 'admin';

      if (isInvalidTeamMemberId) {
          const teamMembers = await SquareIntegrationService.fetchTeam();
          if (!teamMembers || teamMembers.length === 0) {
              throw new Error("No bookable team members found in Square to assign this appointment to.");
          }
          resolvedTeamMemberId = teamMembers[0].id;
      }
      
      const serviceVersionMap = new Map<string, number>();
      services.forEach(s => {
          if (s.id && s.version) {
              serviceVersionMap.set(s.id, s.version);
          }
      });

      const body = {
          booking: {
              location_id: locationId,
              start_at: startAt,
              customer_id: customerId,
              appointment_segments: services.map(service => ({
                  team_member_id: resolvedTeamMemberId,
                  service_variation_id: service.id,
                  service_variation_version: serviceVersionMap.get(service.id) || undefined
              }))
          }
      };

      return await squareApiFetch('/v2/bookings', { method: 'POST', body });
  },
};

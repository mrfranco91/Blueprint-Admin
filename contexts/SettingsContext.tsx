import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

import type {
  Service,
  StylistLevel,
  Stylist,
  Client,
  ServiceLinkingConfig,
  BrandingSettings,
  MembershipConfig,
  AppTextSize,
} from '../types';

import { ALL_SERVICES, STYLIST_LEVELS } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { canCustomizeBranding } from '../utils/isEnterpriseAccount';

// Blueprint default branding - uses Blueprint Design System v1.0.0 palette
export const BLUEPRINT_DEFAULT_BRANDING: BrandingSettings = {
  salonName: 'Blueprint',
  primaryColor: '#0B3559', /* Blueprint Navy */
  secondaryColor: '#42708C', /* Blueprint Steel */
  accentColor: '#5890A6', /* Blueprint Sky */
  font: 'Comfortaa',
  logoUrl: 'https://cdn.builder.io/api/v1/image/assets%2F8d6a989189ff4d9e8633804d5d0dbd86%2Fa72b6d70b1bc42b2991e3c072f2b3588?format=webp&width=800&height=1200',
};

type IntegrationProvider = 'square' | 'vagaro' | 'mindbody';
type IntegrationEnvironment = 'sandbox' | 'production';

export interface IntegrationSettings {
  provider: IntegrationProvider;
  environment: IntegrationEnvironment;
}

interface SettingsContextType {
  services: Service[];
  levels: StylistLevel[];
  stylists: Stylist[];
  clients: Client[];

  membershipConfig: MembershipConfig;
  branding: BrandingSettings;
  integration: IntegrationSettings;
  linkingConfig: ServiceLinkingConfig;
  textSize: AppTextSize;
  pushAlertsEnabled: boolean;
  pinnedReports: { [userId: string]: string[] };

  loadingTeam: boolean;
  teamError: string | null;
  needsSquareConnect: boolean;

  updateServices: (services: Service[]) => void;
  updateLevels: (levels: StylistLevel[]) => void;
  updateStylists: (stylists: Stylist[]) => void;
  updateClients: (clients: Client[]) => void;

  updateMembershipConfig: React.Dispatch<React.SetStateAction<MembershipConfig>>;
  updateBranding: (branding: BrandingSettings) => void;
  updateIntegration: (integration: IntegrationSettings) => void;
  updateLinkingConfig: (config: ServiceLinkingConfig) => void;

  updateTextSize: (size: AppTextSize) => void;
  updatePushAlertsEnabled: (enabled: boolean) => void;
  updatePinnedReports: (userId: string | number, reportIds: string[]) => void;

  cancellationPolicy: string;
  updateCancellationPolicy: (policy: string) => void;

  createClient: (clientData: { name: string; email: string }) => Promise<Client>;
  resolveClientByExternalId: (
    externalId: string,
    clientDetails: { name: string; email?: string; phone?: string; avatarUrl?: string }
  ) => Promise<Client>;

  saveAll: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Core settings state (single instance)
  const [services, setServices] = useState<Service[]>(() => ALL_SERVICES);
  const [levels, setLevels] = useState<StylistLevel[]>(() => STYLIST_LEVELS);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const fallbackPermissions = useMemo(
    () => ({
      canBookAppointments: true,
      canOfferDiscounts: false,
      requiresDiscountApproval: true,
      viewGlobalReports: false,
      viewClientContact: true,
      viewAllSalonPlans: false,
      can_book_own_schedule: true,
      can_book_peer_schedules: false,
    }),
    []
  );

  const resolveLevelDefaults = (levelId: string | null | undefined) => {
    const level = levels.find((item) => item.id === levelId);
    return level?.defaultPermissions || fallbackPermissions;
  };

  const [membershipConfig, setMembershipConfig] = useState<MembershipConfig>({
    enabled: true,
    tiers: [],
  });

  const [branding, setBranding] = useState<BrandingSettings>(BLUEPRINT_DEFAULT_BRANDING);

  const [integration, setIntegration] = useState<IntegrationSettings>({
    provider: 'square',
    environment: 'production',
  });

  const [linkingConfig, setLinkingConfig] = useState<ServiceLinkingConfig>({
    enabled: true,
    triggerCategory: 'Color',
    triggerServiceIds: [],
    exclusionServiceId: '',
    linkedServiceId: '',
  });

  const [textSize, setTextSize] = useState<AppTextSize>('M');
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(false);
  const [pinnedReports, setPinnedReports] = useState<{ [userId: string]: string[] }>({});

  const [cancellationPolicy, setCancellationPolicy] = useState('');

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [needsSquareConnect, setNeedsSquareConnect] = useState<boolean>(false);

  // Load data once per auth session; no loops, no state that triggers re-subscribe.
  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    let isLoading = false;
    let lastLoadedUserId: string | null = null;

    const loadForUser = async (passedUser?: any) => {
      console.log('[Settings] loadForUser ENTRY', {
        passedUserId: passedUser?.id || 'none',
        passedRole: passedUser?.user_metadata?.role || 'none',
        isLoading,
        lastLoadedUserId,
      });

      // Prevent duplicate runs for the same user
      if (passedUser?.id && passedUser.id === lastLoadedUserId) {
        console.log('[Settings] loadForUser skipped (already loaded for user:', passedUser.id, ')');
        return;
      }
      if (isLoading) {
        console.log('[Settings] loadForUser skipped (already loading)');
        return;
      }
      isLoading = true;
      console.log('[Settings] loadForUser proceeding, passedUser:', passedUser?.id || 'none');

      let user = passedUser;

      // If no user passed directly, try to get from session
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) { isLoading = false; return; }
        user = sessionData?.session?.user;
      }

      if (!user) {
        console.log('[Settings] No authenticated user, skipping data load');
        setNeedsSquareConnect(false);
        isLoading = false;  // FIX: was missing — caused isLoading to stay true forever
        return;
      }

      console.log('[Settings] Authenticated user:', user.id, user.email, 'metadata:', JSON.stringify(user.user_metadata));

      // --- Check Square Connection Status (informational only) ---
      const { data: merchantSettings, error: msError } = await supabase
        .from('merchant_settings')
        .select('square_access_token')
        .eq('supabase_user_id', user.id)
        .maybeSingle();

      console.log('[Settings] merchant_settings query:', {
        found: !!merchantSettings,
        hasToken: !!merchantSettings?.square_access_token,
        error: msError?.message || null,
      });

      // Load membership tiers from the dedicated membership_tiers table
      try {
        const { data: salonRow } = await supabase
          .from('salons')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (salonRow?.id) {
          const { data: tiers, error: tiersError } = await supabase
            .from('membership_tiers')
            .select('*')
            .eq('salon_id', salonRow.id)
            .order('position', { ascending: true });

          if (tiersError) {
            console.warn('[Settings] Failed to load membership_tiers:', tiersError.message);
          } else if (tiers && tiers.length > 0) {
            console.log('[Settings] Loaded', tiers.length, 'membership tiers from Supabase');
            setMembershipConfig({
              enabled: true,
              tiers: tiers.map((t: any) => ({
                id: t.id,
                name: t.name,
                minSpend: Number(t.min_spend) || 0,
                perks: Array.isArray(t.perks) ? t.perks : [],
                color: t.color || '#6AA4BC',
              })),
            });
          }
        }
      } catch (e) {
        console.warn('[Settings] Failed to load membership tiers:', e);
      }

      if (cancelled) { isLoading = false; return; }

      const hasSquareFromDb = !!merchantSettings?.square_access_token;
      const hasSquareFromMeta = !!user.user_metadata?.merchant_id;

      if (msError && !hasSquareFromMeta) {
        setNeedsSquareConnect(true);
      } else if (!hasSquareFromDb && !hasSquareFromMeta) {
        setNeedsSquareConnect(true);
      } else {
        setNeedsSquareConnect(false);
      }

      // ---- Determine data loading strategy based on role ----
      const isStylist = user.user_metadata?.role === 'stylist';
      const isClient = user.user_metadata?.role === 'client';
      console.log('[Settings] BRANCH DECISION', { isStylist, isClient, metadataRole: user.user_metadata?.role, userId: user.id });

      if (isStylist || isClient) {
        // ═══════════════════════════════════════════════════════════
        // STYLIST/CLIENT PATH: Read from Supabase (admin already synced data)
        // No Square API calls — just read what the admin imported.
        // ═══════════════════════════════════════════════════════════
        console.log('[Settings] STYLIST/CLIENT path — reading admin data from Supabase');
        setLoadingTeam(true);

        try {
          const dataRes = await fetch('/api/stylist-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
          });
          const dataJson = await dataRes.json();
          console.log('[Settings] /api/stylist-data response:', dataRes.status, {
            services: dataJson.services?.length ?? 0,
            clients: dataJson.clients?.length ?? 0,
            team: dataJson.team?.length ?? 0,
            adminUserId: dataJson.adminUserId,
          });

          if (cancelled) return;

          if (!dataRes.ok) {
            console.error('[Settings] ⚠️ stylist-data failed:', dataJson.message);
          } else {
            // Services
            if (dataJson.services?.length > 0) {
              console.log('[Settings] ✅ Loaded', dataJson.services.length, 'services from admin Supabase data');
              setServices(dataJson.services.map((row: any) => ({
                id: row.metadata?.square_variation_id || row.metadata?.square_item_id || row.id,
                name: row.name || 'Unnamed Service',
                variationName: row.metadata?.variation_name,
                cost: row.cost != null ? Number(row.cost) : (row.metadata?.price_cents != null ? row.metadata.price_cents / 100 : 0),
                duration: row.duration || 60,
                category: row.category || '',
              })));
            }

            // Clients
            if (dataJson.clients?.length > 0) {
              console.log('[Settings] ✅ Loaded', dataJson.clients.length, 'clients from admin Supabase data');
              const adminId = dataJson.adminUserId;
              setClients(dataJson.clients.map((row: any) => ({
                id: row.id,
                externalId: row.external_id,
                name: row.name || 'Client',
                email: row.email,
                phone: row.phone,
                avatarUrl: row.avatar_url,
                historicalData: [],
                source: 'square',
                hasAccount: !!row.supabase_user_id && row.supabase_user_id !== adminId,
              })));
            }

            // Team
            if (dataJson.team?.length > 0) {
              console.log('[Settings] ✅ Loaded', dataJson.team.length, 'team members from admin Supabase data');
              setStylists(dataJson.team.map((row: any) => {
                const levelId = row.level_id || levels[0]?.id || 'lvl_1';
                const permissionOverrides = row.permission_overrides || row.permissions || {};
                const levelDefaults = resolveLevelDefaults(levelId);
                const permissions = { ...levelDefaults, ...permissionOverrides };
                return {
                  id: row.square_team_member_id,
                  name: row.name,
                  role: row.role || 'Team Member',
                  email: row.email,
                  levelId,
                  permissions,
                  permissionOverrides,
                };
              }));
            }
          }
        } catch (e: any) {
          if (!cancelled) console.error('[Settings] ⚠️ stylist-data fetch failed:', e);
        } finally {
          if (!cancelled) {
            setLoadingTeam(false);
            isLoading = false;
            if (user?.id) lastLoadedUserId = user.id;
          }
          console.log('[Settings] STYLIST loadForUser completed for user:', user?.id);
        }
        return; // Done — skip the admin/Square path below
      }

      // ═══════════════════════════════════════════════════════════
      // ADMIN PATH: Sync fresh data from Square API into Supabase
      // ═══════════════════════════════════════════════════════════
      console.log('[Settings] ADMIN path — syncing from Square API', {
        userId: user.id,
        role: user.user_metadata?.role,
        merchantId: user.user_metadata?.merchant_id,
        hasSquareFromDb,
        hasSquareFromMeta,
      });

      // Guard: skip sync if user.id is not yet resolved (prevents 401s from premature calls)
      if (!user.id) {
        console.warn('[Settings] ADMIN path skipped — user.id is falsy');
        isLoading = false;
        return;
      }

      // ---- Services ----
      console.log('[Settings] Fetching services via /api/square/sync', { userId: user.id, hasUserId: !!user.id });
      try {
        const svcRes = await fetch('/api/square/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({ action: 'services' }),
        });
        const svcJson = await svcRes.json();
        console.log('[Settings] /api/square/sync?action=services response:', svcRes.status, {
          count: svcJson.services?.length ?? 0,
          message: svcJson.message || null,
        });

        if (cancelled) return;

        if (svcRes.ok && svcJson.services && svcJson.services.length > 0) {
          console.log('[Settings] ✅ Loaded', svcJson.services.length, 'services from server');
          const mapped: Service[] = svcJson.services.map((row: any) => ({
            id: row.metadata?.square_variation_id || row.metadata?.square_item_id || row.id,
            name: row.name || 'Unnamed Service',
            variationName: row.metadata?.variation_name,
            cost: row.cost != null ? Number(row.cost) : (row.metadata?.price_cents != null ? row.metadata.price_cents / 100 : 0),
            duration: row.duration || 60,
            category: row.category || '',
          }));
          setServices(mapped);
        } else {
          console.warn('[Settings] ⚠️ No services from server:', svcJson.message || `inserted=${svcJson.inserted}`);
        }
      } catch (e) {
        if (!cancelled) console.warn('[Settings] ⚠️ /api/square/sync?action=services failed:', e);
      }

      if (cancelled) return;

      // ---- Clients ----
      console.log('[Settings] Fetching clients via /api/square/sync', { userId: user.id });
      try {
        const syncRes = await fetch('/api/square/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({ action: 'clients' }),
        });
        const syncJson = await syncRes.json();
        console.log('[Settings] /api/square/sync?action=clients response:', syncRes.status, {
          count: syncJson.clients?.length ?? 0,
          inserted: syncJson.inserted ?? null,
          message: syncJson.message || null,
        });

        if (cancelled) return;

        console.log('[Settings] CLIENTS CHECK', { ok: syncRes.ok, hasClients: !!syncJson.clients, count: syncJson.clients?.length ?? 0, cancelled });
        if (syncRes.ok && syncJson.clients && syncJson.clients.length > 0) {
          console.log('[Settings] ✅ Loaded', syncJson.clients.length, 'clients from server — calling setClients');
          const mappedClients = syncJson.clients.map((row: any) => ({
            id: row.id,
            externalId: row.external_id,
            name: row.name || 'Client',
            email: row.email,
            phone: row.phone,
            avatarUrl: row.avatar_url,
            historicalData: [],
            source: 'square',
            hasAccount: !!row.supabase_user_id && row.supabase_user_id !== user.id,
          }));
          console.log('[Settings] setClients called with', mappedClients.length, 'clients, first 3 names:', mappedClients.slice(0,3).map(c => c.name));
          setClients(mappedClients);
        } else {
          console.warn('[Settings] ⚠️ No clients from server:', syncJson.message || `inserted=${syncJson.inserted}`);
        }
      } catch (e) {
        if (!cancelled) console.warn('[Settings] ⚠️ /api/square/sync?action=clients failed:', e);
      }

      if (cancelled) return;

      // ---- Team ----
      setLoadingTeam(true);
      setTeamError(null);
      console.log('[Settings] Syncing team via /api/square/sync...');
      try {
        const teamRes = await fetch('/api/square/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({ action: 'team' }),
        });
        const teamJson = await teamRes.json();
        console.log('[Settings] /api/square/sync?action=team response:', teamRes.status, 'count:', teamJson.team?.length ?? 0);

        if (cancelled) return;

        if (teamRes.ok && teamJson.team && teamJson.team.length > 0) {
          console.log('[Settings] ✅ Loaded', teamJson.team.length, 'team members from sync');
          setStylists(teamJson.team.map((row: any) => {
            const levelId = row.level_id || levels[0]?.id || 'lvl_1';
            const permissionOverrides = row.permission_overrides || row.permissions || {};
            const levelDefaults = resolveLevelDefaults(levelId);
            const permissions = { ...levelDefaults, ...permissionOverrides };
            return {
              id: row.square_team_member_id,
              name: row.name,
              role: row.role || 'Team Member',
              email: row.email,
              levelId,
              permissions,
              permissionOverrides,
            };
          }));
        } else {
          console.warn('[Settings] ⚠️ No team from sync:', teamJson.message || `inserted=${teamJson.inserted}`);
          // Fallback: try Supabase directly
          const { data } = await supabase
            .from('square_team_members')
            .select('*')
            .eq('supabase_user_id', user.id);
          if (data && data.length > 0) {
            console.log('[Settings] Loaded', data.length, 'team members from Supabase fallback');
            setStylists(data.map((row: any) => {
              const levelId = row.level_id || levels[0]?.id || 'lvl_1';
              const permissionOverrides = row.permission_overrides || row.permissions || {};
              const levelDefaults = resolveLevelDefaults(levelId);
              const permissions = { ...levelDefaults, ...permissionOverrides };
              return {
                id: row.square_team_member_id,
                name: row.name,
                role: row.role || 'Team Member',
                email: row.email,
                levelId,
                permissions,
                permissionOverrides,
              };
            }));
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.warn('[Settings] ⚠️ Failed to sync team:', e);
          setTeamError(e?.message || 'Failed to load team');
        }
      } finally {
        if (!cancelled) setLoadingTeam(false);
        isLoading = false;
        if (user?.id) lastLoadedUserId = user.id;
        console.log('[Settings] ADMIN loadForUser completed for user:', user?.id);
      }
    };

    // Run once immediately
    void loadForUser();

    // Subscribe once to auth changes
    // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
    const { data } = (supabase.auth as any).onAuthStateChange((event: string, session: any) => {
      console.log('[Settings] onAuthStateChange:', event, 'user:', session?.user?.id || 'none');
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Pass the user directly from the session — avoids needing getSession()/getUser() network calls
        void loadForUser(session?.user);
      }
      if (event === 'SIGNED_OUT') {
        // Clear user-scoped data
        setClients([]);
        setStylists([]);
        setLoadingTeam(false);
        setTeamError(null);
        setNeedsSquareConnect(false);
      }
    });

    return () => {
      cancelled = true;
      data?.subscription?.unsubscribe();
    };
  }, []);

  // Apply text size to html root so all rem units scale
  useEffect(() => {
    const sizes: Record<string, string> = { S: '13px', M: '16px', L: '20px' };
    document.documentElement.style.fontSize = sizes[textSize] || '16px';
  }, [textSize]);

  // Normalize existing membership config data on mount
  useEffect(() => {
    if (membershipConfig.tiers.length > 0) {
      const hasInvalidMinSpend = membershipConfig.tiers.some(tier => typeof tier.minSpend !== 'number' || isNaN(Number(tier.minSpend)));
      if (hasInvalidMinSpend) {
        console.log('[Settings] Normalizing membership config minSpend values');
        updateMembershipConfig(prev => ({
          ...prev,
          tiers: prev.tiers.map(tier => ({
            ...tier,
            minSpend: Number(tier.minSpend) || 0
          }))
        }));
      }
    }
  }, []); // Run only once on mount

  // Updaters
  const updateServices = (v: Service[]) => setServices(v);
  const updateLevels = (v: StylistLevel[]) => setLevels(v);
  const updateStylists = (v: Stylist[]) => setStylists(v);
  const updateClients = (v: Client[]) => setClients(v);

  const updateMembershipConfig = React.useCallback<React.Dispatch<React.SetStateAction<MembershipConfig>>>(
    (config) => {
      setMembershipConfig((prev) => {
        const newConfig = typeof config === 'function' ? config(prev) : config;
        // Ensure all minSpend values are numbers
        const normalizedConfig = {
          ...newConfig,
          tiers: newConfig.tiers.map(tier => ({
            ...tier,
            minSpend: Number(tier.minSpend) || 0
          }))
        };
        return normalizedConfig;
      });
    },
    []
  );

  const updateBranding = (v: BrandingSettings) => setBranding(v);
  const updateIntegration = (v: IntegrationSettings) => setIntegration(v);
  const updateLinkingConfig = (v: ServiceLinkingConfig) => setLinkingConfig(v);

  const updateTextSize = (size: AppTextSize) => setTextSize(size);
  const updatePushAlertsEnabled = (enabled: boolean) => setPushAlertsEnabled(enabled);

  const updatePinnedReports = (userId: string | number, reportIds: string[]) => {
    setPinnedReports((prev) => ({ ...prev, [String(userId)]: reportIds }));
  };

  // Minimal createClient (manual clients only). Keeps API surface intact.
  const createClient = async (clientData: { name: string; email: string }) => {
    if (!supabase) throw new Error('Supabase not initialized');

    // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
    const { data: userResp, error: userErr } = await (supabase.auth as any).getUser();
    const user = userResp?.user;
    if (userErr || !user) throw new Error('Not authenticated');

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clientData.name
    )}&background=random`;

    const { data, error } = await supabase
      .from('clients')
      .insert(
        {
          supabase_user_id: user.id,
          name: clientData.name,
          email: clientData.email,
          avatar_url: avatarUrl,
          source: 'manual',
        } as any
      )
      .select()
      .single();

    if (error || !data) throw error || new Error('Failed to create client');

    const row = data as any;
    const newClient: Client = {
      id: row.id,
      externalId: row.external_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      historicalData: [],
      source: row.source || 'manual',
    };

    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  // Minimal resolver that ensures a client exists in DB (used by downstream flows)
  const resolveClientByExternalId = async (
    externalId: string,
    clientDetails: { name: string; email?: string; phone?: string; avatarUrl?: string }
  ): Promise<Client> => {
    if (!supabase) throw new Error('Supabase not initialized');

    // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
    const { data: userResp, error: userErr } = await (supabase.auth as any).getUser();
    const user = userResp?.user;
    if (userErr || !user) throw new Error('Not authenticated');

    const local = clients.find((c) => c.externalId === externalId);
    if (local) return local;

    const { data: existing, error: findErr } = await supabase
      .from('clients')
      .select('*')
      .eq('supabase_user_id', user.id)
      .eq('external_id', externalId)
      .maybeSingle();

    if (findErr) console.error('[Settings] resolveClient find error:', findErr);

    if (existing) {
      const row = existing as any;
      const client: Client = {
        id: row.id,
        externalId: row.external_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        historicalData: [],
        source: row.source || 'square',
      };
      setClients((prev) => [...prev.filter((c) => c.id !== client.id), client]);
      return client;
    }

    const avatarUrl =
      clientDetails.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        clientDetails.name
      )}&background=random`;

    const { data, error } = await supabase
      .from('clients')
      .insert(
        {
          supabase_user_id: user.id,
          external_id: externalId,
          name: clientDetails.name,
          email: clientDetails.email || null,
          phone: clientDetails.phone || null,
          avatar_url: avatarUrl,
          source: 'square',
        } as any
      )
      .select()
      .single();

    if (error || !data) throw error || new Error('Failed to create client');

    const row = data as any;
    const newClient: Client = {
      id: row.id,
      externalId: row.external_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      historicalData: [],
      source: row.source || 'square',
    };

    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  // Keep settings save non-blocking for now; persistence will be implemented once app is stable.
  const saveAll = async () => {
    try {
      localStorage.setItem('admin_services', JSON.stringify(services));
      localStorage.setItem('admin_levels', JSON.stringify(levels));
      localStorage.setItem('admin_membership_config', JSON.stringify(membershipConfig));
      localStorage.setItem('admin_integration', JSON.stringify(integration));
      localStorage.setItem('admin_branding', JSON.stringify(branding));
      localStorage.setItem('admin_linking_config', JSON.stringify(linkingConfig));
      localStorage.setItem('admin_text_size', String(textSize));
      localStorage.setItem('admin_push_alerts_enabled', String(pushAlertsEnabled));
      localStorage.setItem('admin_pinned_reports', JSON.stringify(pinnedReports));

      // Persist membership tiers to the dedicated membership_tiers table in Supabase
      if (supabase) {
        try {
          const { data: userData } = await (supabase.auth as any).getUser();
          const userId = userData?.user?.id;
          if (userId) {
            // Resolve salon_id for this admin
            const { data: salonRow } = await supabase
              .from('salons')
              .select('id')
              .eq('owner_user_id', userId)
              .maybeSingle();

            if (salonRow?.id) {
              const salonId = salonRow.id;

              // Delete existing tiers for this salon, then re-insert
              const { error: deleteErr } = await supabase
                .from('membership_tiers')
                .delete()
                .eq('salon_id', salonId);

              if (deleteErr) {
                console.error('[Settings] Failed to clear old membership_tiers:', deleteErr.message);
              } else if (membershipConfig.tiers.length > 0) {
                const rows = membershipConfig.tiers.map((tier, index) => ({
                  salon_id: salonId,
                  name: tier.name,
                  min_spend: tier.minSpend,
                  perks: tier.perks,
                  color: tier.color,
                  position: index,
                  enabled: true,
                }));

                const { error: insertErr } = await supabase
                  .from('membership_tiers')
                  .insert(rows);

                if (insertErr) {
                  console.error('[Settings] Failed to insert membership_tiers:', insertErr.message);
                } else {
                  console.log('[Settings] Persisted', rows.length, 'membership tiers to Supabase');
                }
              } else {
                console.log('[Settings] Cleared membership tiers (none configured)');
              }
            }
          }
        } catch (e) {
          console.error('[Settings] Failed to persist membership tiers to Supabase:', e);
        }
      }
    } catch (e) {
      console.error('[Settings] Failed to save locally:', e);
    }
  };

  const value = useMemo<SettingsContextType>(
    () => {
      console.log('[Settings] CONTEXT VALUE updated — clients:', clients.length, 'services:', services.length, 'stylists:', stylists.length);
      return {
      services,
      levels,
      stylists,
      clients,
      membershipConfig,
      branding,
      integration,
      linkingConfig,
      textSize,
      pushAlertsEnabled,
      pinnedReports,
      loadingTeam,
      teamError,
      needsSquareConnect,
      updateServices,
      updateLevels,
      updateStylists,
      updateClients,
      updateMembershipConfig,
      updateBranding,
      updateIntegration,
      updateLinkingConfig,
      updateTextSize,
      updatePushAlertsEnabled,
      updatePinnedReports,
      cancellationPolicy,
      updateCancellationPolicy: setCancellationPolicy,
      createClient,
      resolveClientByExternalId,
      saveAll,
    };},
    [
      services,
      levels,
      stylists,
      clients,
      membershipConfig,
      branding,
      integration,
      linkingConfig,
      textSize,
      pushAlertsEnabled,
      pinnedReports,
      cancellationPolicy,
      loadingTeam,
      teamError,
      needsSquareConnect,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

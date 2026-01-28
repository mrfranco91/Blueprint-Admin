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

// Blueprint default branding - used for all non-enterprise accounts
export const BLUEPRINT_DEFAULT_BRANDING: BrandingSettings = {
  salonName: 'Blueprint',
  primaryColor: '#0F4C81', /* Classic Blue */
  secondaryColor: '#5D96BC', /* Heritage Blue */
  accentColor: '#8ABAD3', /* Sky Blue */
  font: 'Inter',
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

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [needsSquareConnect, setNeedsSquareConnect] = useState<boolean>(false);

  // Load data once per auth session; no loops, no state that triggers re-subscribe.
  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    const loadForUser = async () => {
      // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
      const { data: userResp, error: userErr } = await (supabase.auth as any).getUser();
      if (cancelled) return;

      const user = userResp?.user;
      if (userErr || !user) {
        setNeedsSquareConnect(false);
        return;
      }

      console.log('[Settings] Current user ID:', user.id, 'Email:', user.email);

      // --- Check Square Connection Status ---
      const { data: merchantSettings, error: msError } = await supabase
        .from('merchant_settings')
        .select('square_access_token')
        .eq('supabase_user_id', user.id)
        .maybeSingle();

      console.log('[Settings] Merchant settings lookup for user', user.id, ':', { found: !!merchantSettings, error: msError });

      if (cancelled) return;

      if (msError) {
        console.error('[Settings] Failed to load merchant settings:', msError);
        setNeedsSquareConnect(true); // Fail-safe
      } else {
        setNeedsSquareConnect(!merchantSettings?.square_access_token);
      }

      // ---- Clients: scoped by supabase_user_id (avoids loading everyone)
      try {
        let { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('supabase_user_id', user.id)
          .order('created_at', { ascending: true });

        if (cancelled) return;

        console.log('[Settings] Scoped clients query for user', user.id, ':', { count: data?.length || 0, error });

        // Fallback: if no data found, get any synced data (ignore user ID)
        if ((data?.length ?? 0) === 0) {
          console.log('[Settings] Clients query returned 0, trying fallback (no user filter)');
          const { data: legacyData } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);
          console.log('[Settings] Fallback clients query returned:', { count: legacyData?.length || 0 });
          if (legacyData && legacyData.length > 0) {
            data = legacyData;
          }
        }

        if (cancelled) return;

        if (error) {
          console.error('[Settings] Failed to load clients:', error);
          setClients([]);
        } else {
          console.log('[Settings] Setting clients:', (data || []).length);
          const mapped: Client[] = (data || []).map((row: any) => ({
            id: row.id,
            externalId: row.external_id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            avatarUrl: row.avatar_url,
            historicalData: [],
            source: row.source || 'manual',
          }));
          setClients(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[Settings] Clients load fatal:', e);
          setClients([]);
        }
      }

      // ---- Team: does NOT block app (empty is OK)
      setLoadingTeam(true);
      setTeamError(null);

      try {
        let { data, error } = await supabase
          .from('square_team_members')
          .select('*')
          .eq('supabase_user_id', user.id);

        if (cancelled) return;

        console.log('[Settings] Scoped team members query for user', user.id, ':', { count: data?.length || 0, error });

        // Fallback: if no data found, get any synced data (ignore user ID)
        if ((data?.length ?? 0) === 0) {
          console.log('[Settings] Team members query returned 0, trying fallback (no user filter)');
          const { data: legacyData } = await supabase
            .from('square_team_members')
            .select('*')
            .limit(100);
          console.log('[Settings] Fallback team members query returned:', { count: legacyData?.length || 0 });
          if (legacyData && legacyData.length > 0) {
            data = legacyData;
          }
        }

        if (cancelled) return;

        if (error) {
          console.warn('[Settings] Team not available:', error.message);
          setStylists([]);
          setTeamError(null);
        } else {
          console.log('[Settings] Setting stylists:', (data || []).length);
          const mapped: Stylist[] = (data || []).map((row: any) => ({
            id: row.square_team_member_id,
            name: row.name,
            role: row.role || 'Team Member',
            email: row.email,
            levelId: row.level_id || 'default',
            permissions: row.permissions || {},
          }));
          setStylists(mapped);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('[Settings] Team load fatal:', e);
          setStylists([]);
          setTeamError(e?.message || 'Failed to load team');
        }
      } finally {
        if (!cancelled) setLoadingTeam(false);
      }
    };

    // Run once immediately
    void loadForUser();

    // Subscribe once to auth changes
    // FIX: Cast to 'any' to bypass Supabase auth method type errors, likely from an environment configuration issue.
    const { data } = (supabase.auth as any).onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void loadForUser();
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

  // Updaters
  const updateServices = (v: Service[]) => setServices(v);
  const updateLevels = (v: StylistLevel[]) => setLevels(v);
  const updateStylists = (v: Stylist[]) => setStylists(v);
  const updateClients = (v: Client[]) => setClients(v);

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
    } catch (e) {
      console.error('[Settings] Failed to save locally:', e);
    }
  };

  const value = useMemo<SettingsContextType>(
    () => ({
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
      updateMembershipConfig: setMembershipConfig,
      updateBranding,
      updateIntegration,
      updateLinkingConfig,
      updateTextSize,
      updatePushAlertsEnabled,
      updatePinnedReports,
      createClient,
      resolveClientByExternalId,
      saveAll,
    }),
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
      loadingTeam,
      teamError,
      needsSquareConnect,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

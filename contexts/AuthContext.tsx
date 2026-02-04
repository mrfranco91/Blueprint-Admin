import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, specificId?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  authInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrateFromSession = (session: any) => {
      if (!active) return;

      const authUser = session?.user;

      if (!authUser) {
        setUser(null);
        setAuthInitialized(true);
        return;
      }

      // AUTHENTICATED: do not clear user due to missing metadata
      const businessName = authUser.user_metadata?.business_name;
      const fallbackSquareEmail = authUser.user_metadata?.merchant_id
        ? `${authUser.user_metadata.merchant_id}@square-oauth.blueprint`
        : undefined;
      const resolvedEmail = authUser.email || fallbackSquareEmail;
      // Force 'admin' role if not explicitly 'stylist', OR if it's a square-oauth user
      const isSquareOAuthUser = resolvedEmail?.includes('@square-oauth.blueprint') || !!authUser.user_metadata?.merchant_id;

      // FIX: The logic was flawed. We want to force admin if it IS a square user, unless they are explicitly a stylist.
      // But actually, Square OAuth users are ALWAYS admins in this system.
      // The previous logic: (isSquareOAuthUser || role === 'stylist') === 'stylist' ? 'stylist' : 'admin'
      // If isSquareOAuthUser is true, then (true || ...) is true. So it returned 'stylist' if isSquareOAuthUser was true!
      // THAT WAS THE BUG. It was forcing Square users to be STYLISTS.

      let role: UserRole = 'admin';
      const metadataRole = authUser.user_metadata?.role as UserRole | undefined;
      const metadataStylistId = authUser.user_metadata?.stylist_id;

      if (isSquareOAuthUser) {
          role = 'admin';
      } else if (metadataRole === 'stylist' && !metadataStylistId) {
          role = 'admin';
      } else {
          role = metadataRole || 'admin';
      }

      console.log('[[AUTH DEBUG]] Hydrating user:', { id: authUser.id, role, metadata: authUser.user_metadata, isSquareOAuthUser });

      const stylistName = authUser.user_metadata?.stylist_name || authUser.user_metadata?.name;
      const stylistId = authUser.user_metadata?.stylist_id;
      const stylistLevelId = authUser.user_metadata?.level_id;
      const stylistPermissions = authUser.user_metadata?.permissions;

      const resolvedName = role === 'stylist'
        ? stylistName || authUser.email?.split('@')[0] || 'Stylist'
        : businessName || 'Admin';

      const stylistData = role === 'stylist' && stylistId
        ? {
            id: stylistId,
            name: stylistName || authUser.email || 'Stylist',
            role: 'Stylist',
            email: authUser.email || '',
            levelId: stylistLevelId || 'lvl_1',
            permissions: stylistPermissions || {
              canBookAppointments: true,
              canOfferDiscounts: false,
              requiresDiscountApproval: true,
              viewGlobalReports: false,
              viewClientContact: true,
              viewAllSalonPlans: false,
              can_book_own_schedule: true,
              can_book_peer_schedules: false,
            },
          }
        : undefined;

      setUser({
        id: authUser.id,
        name: resolvedName,
        role,
        email: resolvedEmail,
        stylistData,
        isMock: false,
      });

      setAuthInitialized(true);
    };

    const resolveSessionUser = async (session: any) => {
      if (!session || !supabase) {
        return session;
      }

      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          return session;
        }
        return { ...session, user: data.user };
      } catch (error) {
        console.error('[AuthContext] Failed to fetch user profile:', error);
        return session;
      }
    };

    if (!supabase) {
      setAuthInitialized(true);
      return;
    }

    // IMPORTANT: hydrate existing session immediately on mount
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
        setAuthInitialized(true);
        return;
      }

      if (data.session) {
        console.log('[AuthContext] Session found, user ID:', data.session.user.id);
        // Real Supabase session exists - clear any mock user
        localStorage.removeItem('mock_admin_user');
        resolveSessionUser(data.session).then((resolvedSession) => {
          hydrateFromSession(resolvedSession);
        });
      } else {
        console.log('[AuthContext] No session found, checking for mock user');
        // No real session - check for mock admin session in localStorage
        const savedMockUser = localStorage.getItem('mock_admin_user');
        if (savedMockUser) {
          try {
            const user = JSON.parse(savedMockUser);
            if (active) {
              setUser(user);
              setAuthInitialized(true);
            }
          } catch (e) {
            console.error('Failed to restore mock user session:', e);
            setAuthInitialized(true);
          }
        } else {
          console.log('[AuthContext] No session or mock user found');
          setAuthInitialized(true);
        }
      }
    }).catch(err => {
      console.error('[AuthContext] Fatal error during session hydration:', err);
      setAuthInitialized(true);
    });

    // Listen for any future auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', { event, hasSession: !!session });
      if (session) {
        // Real session active - clear mock user
        localStorage.removeItem('mock_admin_user');
      }
      resolveSessionUser(session).then((resolvedSession) => {
        hydrateFromSession(resolvedSession);
      });
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Keep existing signature; do not refactor callers.
  // (Used only for any existing non-Square demo flows.)
  const login = async (role: UserRole, specificId?: string) => {
    if (role === 'admin') {
      const adminUser = {
        id: specificId || 'admin',
        name: 'Admin',
        role: 'admin',
        isMock: true,
      };
      setUser(adminUser);
      // Persist mock admin session to localStorage
      localStorage.setItem('mock_admin_user', JSON.stringify(adminUser));
      setAuthInitialized(true);
      return;
    }

    // No-op for non-admin in this context (do not redesign auth here)
    setAuthInitialized(true);
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear mock admin session from localStorage
    localStorage.removeItem('mock_admin_user');
    setUser(null);
    setAuthInitialized(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        authInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

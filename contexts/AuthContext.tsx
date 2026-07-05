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
  updateUser: (updates: Partial<User>) => void;
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
      const isSquareOAuthUser = authUser.email?.includes('@square-oauth.blueprint');
      const metadataRole = authUser.user_metadata?.role;
      const role: UserRole = isSquareOAuthUser
        ? 'admin'
        : metadataRole === 'stylist'
          ? 'stylist'
          : metadataRole === 'client'
            ? 'client'
            : metadataRole === 'owner'
              ? 'admin'
              : 'admin';
      const resolvedName = role === 'client'
        ? authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Client'
        : role === 'stylist'
          ? authUser.user_metadata?.stylist_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Stylist'
          : authUser.user_metadata?.business_name || authUser.email?.split('@')[0] || 'Admin';

      console.log('[AuthContext] Setting user with role:', {
        userId: authUser.id,
        email: authUser.email,
        rawMetadataRole: authUser.user_metadata?.role,
        resolvedRole: role,
        isSquareOAuthUser: authUser.email?.includes('@square-oauth.blueprint'),
      });

      const userObj: User = {
        id: authUser.id,
        name: resolvedName,
        role,
        email: authUser.email,
        avatarUrl: authUser.user_metadata?.avatar_url || undefined,
        isMock: false,
      };

      if (role === 'stylist') {
        userObj.stylistData = {
          id: authUser.user_metadata?.stylist_id || authUser.id,
          name: resolvedName,
          email: authUser.email || '',
          role: 'Stylist',
          levelId: authUser.user_metadata?.level_id || 'lvl_1',
          permissions: authUser.user_metadata?.permissions || {},
        };
      }

      setUser(userObj);

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
        const user = data.user;

        const shouldCheckMerchant =
          !user.user_metadata?.merchant_id &&
          user.user_metadata?.role !== 'admin' &&
          user.user_metadata?.role !== 'owner' &&
          !user.email?.includes('@square-oauth.blueprint') &&
          !!session.access_token;

        if (shouldCheckMerchant) {
          try {
            const response = await fetch('/api/square/status?action=has-merchant', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });

            if (response.ok) {
              const result = await response.json();
              if (result?.hasMerchant) {
                return {
                  ...session,
                  user: {
                    ...user,
                    user_metadata: {
                      ...user.user_metadata,
                      role: 'admin',
                      merchant_id: user.user_metadata?.merchant_id || 'square-merchant',
                    },
                  },
                };
              }
            }
          } catch (merchantError) {
            console.warn('[AuthContext] Failed to confirm merchant settings:', merchantError);
          }
        }

        return { ...session, user };
      } catch (error) {
        console.error('[AuthContext] Failed to fetch user profile:', error);
        return session;
      }
    };

    // Helper: fall back to mock admin when no real session
    const fallbackToMockOrBypass = () => {
      const savedMockUser = localStorage.getItem('mock_admin_user');
      if (savedMockUser) {
        try {
          const user = JSON.parse(savedMockUser);
          if (active) {
            setUser(user);
            setAuthInitialized(true);
          }
          return;
        } catch (e) {
          console.error('Failed to restore mock user session:', e);
        }
      }


      if (active) setAuthInitialized(true);
    };


    if (!supabase) {
      console.log('[AuthContext] No Supabase client');
      fallbackToMockOrBypass();
      return;
    }

    // IMPORTANT: hydrate existing session immediately on mount
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
        fallbackToMockOrBypass();
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
        console.log('[AuthContext] No session found');
        fallbackToMockOrBypass();
      }
    }).catch(err => {
      console.error('[AuthContext] Fatal error during session hydration:', err);
      fallbackToMockOrBypass();
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
      const adminUser: User = {
        id: specificId || 'admin',
        name: 'Admin',
        role: 'admin' as UserRole,
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

  const updateUser = async (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);

    // Persist avatar to Supabase auth metadata if it changed
    // IMPORTANT: Only persist actual URLs, never base64 data URIs — base64 bloats the JWT
    // and causes QuotaExceededError when Supabase tries to save the session to localStorage
    if (updates.avatarUrl && supabase && !updates.avatarUrl.startsWith('data:')) {
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: updates.avatarUrl }
        });
      } catch (e) {
        console.warn('[AuthContext] Failed to persist avatar to Supabase:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
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

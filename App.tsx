import React, { useEffect, useState } from 'react';
import type { UserRole } from './types';
import { SpeedInsights } from '@vercel/speed-insights/react';

import AdminDashboard from './components/AdminDashboardV2';
import LoginScreen from './components/LoginScreen';
import MissingCredentialsScreen from './components/MissingCredentialsScreen';
import DesignSystemShowcase from './components/DesignSystemShowcase';
import SetPasswordScreen from './components/SetPasswordScreen';
import StylistDashboard from './components/StylistDashboard';
import JoinScreen from './components/JoinScreen';

import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlanProvider } from './contexts/PlanContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { useSettings } from './contexts/SettingsContext';

/* ----------------------------- */
/* App Content (Auth-aware UI)   */
/* ----------------------------- */
const AppContent: React.FC = () => {
  const { user, authInitialized } = useAuth();
  const { needsSquareConnect } = useSettings();
  const [forceAdmin, setForceAdmin] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  // Detect invite/recovery token in URL hash or search params
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      setNeedsPasswordSetup(true);
      return;
    }

    // Handle /auth/confirm?token_hash=...&type=invite from email template
    if (tokenHash && (type === 'invite' || type === 'recovery' || type === 'magiclink')) {
      (async () => {
        const { supabase } = await import('./lib/supabase');
        if (!supabase) return;
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === 'invite' ? 'invite' : type === 'recovery' ? 'recovery' : 'magiclink',
        });
        if (!error) {
          // Clear the URL params so they don't persist
          window.history.replaceState({}, '', '/');
          setNeedsPasswordSetup(true);
        } else {
          console.error('[Auth] Token verification failed:', error.message);
        }
      })();
    }
  }, []);

  // Show /join screen for stylist PIN-based onboarding
  const isJoinPage = window.location.pathname === '/join';
  if (isJoinPage) {
    return <JoinScreen onComplete={() => { window.location.href = '/'; }} />;
  }

  // Show design system showcase for styling review
  const showDesignSystem = window.location.search.includes('design-system');
  if (showDesignSystem) {
    return <DesignSystemShowcase />;
  }

  // DEBUG: Log user role when it changes
  useEffect(() => {
    if (user) {
      console.log('[AppContent] User authenticated:', {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    if (!authInitialized || !user || user.role !== 'stylist') {
      setForceAdmin(false);
      return () => {
        active = false;
      };
    }

    (async () => {
      const { supabase } = await import('./lib/supabase');
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/square/has-merchant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      if (active) {
        setForceAdmin(!!result?.hasMerchant);
      }
    })();

    return () => {
      active = false;
    };
  }, [authInitialized, user?.id, user?.role]);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin h-10 w-10 border-4 border-muted-foreground/30 border-t-primary rounded-full" />
      </div>
    );
  }

  if (needsPasswordSetup && user) {
    return (
      <SetPasswordScreen
        onComplete={() => {
          setNeedsPasswordSetup(false);
          window.location.hash = '';
        }}
      />
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (needsSquareConnect && user.role !== 'stylist') {
    return <MissingCredentialsScreen />;
  }

  const isSquareOAuthUser = user.email?.includes('@square-oauth.blueprint');

  if (isSquareOAuthUser) {
    return <AdminDashboard role="admin" />;
  }

  if (forceAdmin) {
    return <AdminDashboard role="admin" />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard role="admin" />;
    case 'stylist':
      return <StylistDashboard />;
    default:
      return <LoginScreen />;
  }
};


/* ----------------------------- */
/* Root App Wrapper              */
/* Build test: v0 testing-build  */
/* ----------------------------- */

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <PlanProvider>
            <AppContent />
            <SpeedInsights />
          </PlanProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;

import React from 'react';
import { useEffect } from 'react';
import type { UserRole } from './types';
import { SpeedInsights } from '@vercel/speed-insights/react';

import StylistDashboard from './components/StylistDashboard';
import AdminDashboard from './components/AdminDashboardV2';
import LoginScreen from './components/LoginScreen';
import MissingCredentialsScreen from './components/MissingCredentialsScreen';

import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlanProvider } from './contexts/PlanContext';

import { useSettings } from './contexts/SettingsContext';

import './styles/accessibility.css';

/* ----------------------------- */
/* App Content (Auth-aware UI)   */
/* ----------------------------- */
const AppContent: React.FC = () => {
  const { user, login, logout, authInitialized } = useAuth();
  const { needsSquareConnect } = useSettings();
  const bypassLogin = (import.meta as any).env.VITE_BYPASS_LOGIN === '1';

  useEffect(() => {
    if (!bypassLogin || !authInitialized || user) {
      return;
    }

    login('admin');
  }, [authInitialized, bypassLogin, login, user]);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (bypassLogin) {
    if (!user) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-transparent rounded-full" />
        </div>
      );
    }

    return <AdminDashboard role="admin" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (needsSquareConnect) {
    return <MissingCredentialsScreen />;
  }

  const isSquareOAuthUser = user.email?.includes('@square-oauth.blueprint');

  if (isSquareOAuthUser) {
    return <AdminDashboard role="admin" />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard role="admin" />;
    case 'stylist':
      return <StylistDashboard onLogout={logout} role="stylist" />;
    default:
      return <LoginScreen />;
  }
};


/* ----------------------------- */
/* Root App Wrapper              */
/* ----------------------------- */

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <PlanProvider>
          <AppContent />
          <SpeedInsights />
        </PlanProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

export default App;

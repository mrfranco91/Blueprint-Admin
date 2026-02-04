import React, { useEffect } from 'react';
import type { UserRole } from './types';
import { SpeedInsights } from '@vercel/speed-insights/react';

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

  if (forceAdmin) {
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

import React from 'react';
import ClientDashboard from './components/ClientDashboard';
import ClientLoginScreen from './components/ClientLoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { PlanProvider } from './contexts/PlanContext';

import './styles/accessibility.css';

const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-transparent rounded-full" />
  </div>
);

const WrongAppNotice: React.FC<{ stylistAppUrl: string | null }> = ({ stylistAppUrl }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white px-6">
    <div className="bg-white border-4 border-gray-100 rounded-3xl shadow-lg p-8 max-w-lg text-center">
      <h1 className="text-3xl font-black text-gray-950 mb-4 tracking-tight">This is the client app</h1>
      <p className="text-gray-600 font-semibold mb-6">
        Your account is set up for professionals. Use the stylist app to manage clients and plans.
      </p>
      {stylistAppUrl ? (
        <a
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gray-950 text-white font-black shadow-lg hover:shadow-xl transition-shadow"
          href={stylistAppUrl}
        >
          Go to stylist app
        </a>
      ) : (
        <p className="text-sm text-gray-500 font-semibold">
          Ask your admin for the stylist app link.
        </p>
      )}
    </div>
  </div>
);

const ClientAppContent: React.FC = () => {
  const { user, authInitialized } = useAuth();
  const stylistAppUrl = (import.meta as any).env.VITE_STYLIST_APP_URL || null;

  if (!authInitialized) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ClientLoginScreen />;
  }

  if (user.role !== 'client') {
    return <WrongAppNotice stylistAppUrl={stylistAppUrl} />;
  }

  return <ClientDashboard />;
};

const App: React.FC = () => (
  <SettingsProvider>
    <AuthProvider>
      <PlanProvider>
        <ClientAppContent />
      </PlanProvider>
    </AuthProvider>
  </SettingsProvider>
);

export default App;

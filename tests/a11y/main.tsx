import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import AdminDashboardV2 from '../../components/AdminDashboardV2';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Actual production components and CSS; only data hooks are replaced by the
// separate fixture build config. This entry is never in the application build.
createRoot(document.getElementById('root')!).render(
  <ThemeProvider><AdminDashboardV2 role="admin" /></ThemeProvider>,
);

// This file is deprecated - AdminDashboardV2 should be used instead
import AdminDashboardV2 from './AdminDashboardV2';
import { UserRole } from '../types';

export default function AdminDashboard({ role }: { role: UserRole }) {
  // Redirect all imports to the newer version
  return <AdminDashboardV2 role={role} />;
}

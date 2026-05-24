import { useAuth } from '../context/AuthContext';
import StudentDashboardView from './StudentDashboardView';
import StaffDashboardView from './StaffDashboardView';
import SuperAdminDashboardView from './SuperAdminDashboardView';

export default function Dashboard() {
  const { profile } = useAuth();

  if (profile?.role === 'super_admin') {
    return <SuperAdminDashboardView />;
  }

  if (profile?.role === 'student') {
    return <StudentDashboardView />;
  }

  return <StaffDashboardView />;
}

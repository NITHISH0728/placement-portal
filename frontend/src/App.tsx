import { useState } from 'react';
import './index.css';
import LandingPage from './components/LandingPage';
import StudentDashboard from './components/StudentDashboard';
import SuperAdminDashboard from './components/dashboards/SuperAdminDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import StaffDashboard from './components/dashboards/StaffDashboard';
import { type Role } from './data/portalData';

export type Page = 'landing' | 'dashboard';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<Role | ''>('');

  function handleLoginSuccess(email: string, role: Role) {
    setUserEmail(email);
    setUserRole(role);
    setPage('dashboard');
  }

  function handleLogout() {
    setUserEmail('');
    setUserRole('');
    setPage('landing');
  }

  if (page === 'dashboard') {
    if (userRole === 'student') return <StudentDashboard email={userEmail} onLogout={handleLogout} />;
    if (userRole === 'staff') return <StaffDashboard email={userEmail} onLogout={handleLogout} />;
    if (userRole === 'admin') return <AdminDashboard email={userEmail} onLogout={handleLogout} />;
    if (userRole === 'superadmin') return <SuperAdminDashboard email={userEmail} onLogout={handleLogout} />;
  }

  return <LandingPage onLoginSuccess={handleLoginSuccess} />;
}

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './index.css';
import LandingPage from './components/LandingPage';
import StudentDashboard from './components/StudentDashboard';
import SuperAdminDashboard from './components/dashboards/SuperAdminDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import StaffDashboard from './components/dashboards/StaffDashboard';
import { type Role } from './data/portalData';

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('session_email') || '');
  const [userRole, setUserRole] = useState<Role | ''>(() => (localStorage.getItem('session_role') as Role) || '');

  function handleLoginSuccess(email: string, role: Role) {
    localStorage.setItem('session_email', email);
    localStorage.setItem('session_role', role);
    setUserEmail(email);
    setUserRole(role);
    navigate('/dashboard', { replace: true });
  }

  function handleLogout() {
    localStorage.removeItem('session_email');
    localStorage.removeItem('session_role');
    setUserEmail('');
    setUserRole('');
    navigate('/home', { replace: true });
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={
        userEmail ? <Navigate to="/dashboard" replace /> : <LandingPage onLoginSuccess={handleLoginSuccess} />
      } />
      <Route path="/dashboard" element={
        !userEmail ? <Navigate to="/home" replace /> : (
          userRole === 'student' ? <StudentDashboard email={userEmail} onLogout={handleLogout} /> :
          userRole === 'staff' ? <StaffDashboard email={userEmail} onLogout={handleLogout} /> :
          userRole === 'admin' ? <AdminDashboard email={userEmail} onLogout={handleLogout} /> :
          userRole === 'superadmin' ? <SuperAdminDashboard email={userEmail} onLogout={handleLogout} /> :
          <Navigate to="/home" replace />
        )
      } />
      <Route path="*" element={<Navigate to={userEmail ? "/dashboard" : "/home"} replace />} />
    </Routes>
  );
}


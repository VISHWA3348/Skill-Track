import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Certificates from './pages/Certificates';
import Users from './pages/Users';
import Colleges from './pages/Colleges';
import Departments from './pages/Departments';
import AuditLogs from './pages/AuditLogs';
import VerifyCertificate from './pages/VerifyCertificate';
import Reports from './pages/Reports';
import Students from './pages/Students';
import CareerActivityModule from './components/CareerActivityModule';
import Rankings from './pages/Rankings';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import StudentPortfolio from './pages/StudentPortfolio';
import PlacementAlumni from './pages/PlacementAlumni';
import Opportunities from './pages/Opportunities';
import AcademicProfileView from './components/AcademicProfileView';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import ResumePublicView from './pages/ResumePublicView';
import ResumeBuilderView from './components/ResumeBuilderView';
import { useAuth } from './context/AuthContext';

const DashboardRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !profile) return <Navigate to="/login" />;
  
  const rolePath = profile.role.replace('_', '-');
  return <Navigate to={`/dashboard/${rolePath}-dashboard`} replace />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <Toaster position="top-right" richColors />
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify/:certId" element={<VerifyCertificate />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/resume/:id" element={<ResumePublicView />} />
            
            <Route path="/dashboard" element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }>
              <Route index element={<DashboardRedirect />} />
              {/* Role-specific dashboards */}
              <Route path="super-admin-dashboard" element={<AuthGuard allowedRoles={['super_admin']}><Dashboard /></AuthGuard>} />
              <Route path="admin-dashboard" element={<AuthGuard allowedRoles={['admin']}><Dashboard /></AuthGuard>} />
              <Route path="hod-dashboard" element={<AuthGuard allowedRoles={['hod']}><Dashboard /></AuthGuard>} />
              <Route path="staff-dashboard" element={<AuthGuard allowedRoles={['staff']}><Dashboard /></AuthGuard>} />
              <Route path="student-dashboard" element={<AuthGuard allowedRoles={['student']}><Dashboard /></AuthGuard>} />
              
              <Route path="certificates" element={<Certificates />} />
              <Route path="upload-certificate" element={<Certificates />} />
              <Route path="career-activities" element={<CareerActivityModule />} />
              <Route path="add-activity" element={<CareerActivityModule />} />
              <Route path="rankings" element={<Rankings />} />
              
              {/* HOD & Staff */}
              <Route path="students" element={
                <AuthGuard allowedRoles={['super_admin', 'admin', 'hod', 'staff']}>
                  <Students />
                </AuthGuard>
              } />
              
              {/* Super Admin Only */}
              <Route path="colleges" element={
                <AuthGuard allowedRoles={['super_admin']}>
                  <Colleges />
                </AuthGuard>
              } />

              {/* Super Admin Only */}
              <Route path="roles" element={
                <AuthGuard allowedRoles={['super_admin']}>
                  <Roles />
                </AuthGuard>
              } />

              {/* Available to All Users */}
              <Route path="settings" element={
                <AuthGuard allowedRoles={['super_admin', 'admin', 'hod', 'staff', 'student']}>
                  <Settings />
                </AuthGuard>
              } />

              <Route path="opportunities" element={
                <AuthGuard allowedRoles={['super_admin', 'admin', 'hod', 'staff', 'student']}>
                  <Opportunities />
                </AuthGuard>
              } />
              
              {/* Super Admin & Admin */}
              <Route path="users" element={
                <AuthGuard allowedRoles={['super_admin', 'admin', 'hod', 'staff']}>
                  <Users />
                </AuthGuard>
              } />
              
              {/* Super Admin & Admin */}
              <Route path="departments" element={
                <AuthGuard allowedRoles={['super_admin', 'admin']}>
                  <Departments />
                </AuthGuard>
              } />
              
              {/* Super Admin & Admin */}
              <Route path="audit-logs" element={
                <AuthGuard allowedRoles={['super_admin', 'admin']}>
                  <AuditLogs />
                </AuthGuard>
              } />

              <Route path="placement-alumni" element={
                <AuthGuard allowedRoles={['super_admin', 'admin']}>
                  <PlacementAlumni />
                </AuthGuard>
              } />

              {/* Super Admin & Admin */}
              <Route path="reports" element={
                <AuthGuard allowedRoles={['super_admin', 'admin', 'hod']}>
                  <Reports />
                </AuthGuard>
              } />

              <Route path="academic-profile" element={
                <AuthGuard allowedRoles={['student']}>
                  <AcademicProfileView />
                </AuthGuard>
              } />
              <Route path="resume-builder" element={
                <AuthGuard allowedRoles={['student']}>
                  <ResumeBuilderView />
                </AuthGuard>
              } />
              <Route path="student/:id/profile" element={<StudentPortfolio />} />
            </Route>

            <Route path="/unauthorized" element={
              <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-4xl font-bold text-red-500">403 - Unauthorized</h1>
                <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
                <button 
                  onClick={() => window.history.back()}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Go Back
                </button>
              </div>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;

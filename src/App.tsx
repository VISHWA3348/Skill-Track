import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';

// Phase 9: Lazy-load all pages — each becomes its own JS chunk
const Login               = React.lazy(() => import('./pages/Login'));
const Dashboard           = React.lazy(() => import('./pages/Dashboard'));
const Certificates        = React.lazy(() => import('./pages/Certificates'));
const Users               = React.lazy(() => import('./pages/Users'));
const Colleges            = React.lazy(() => import('./pages/Colleges'));
const Departments         = React.lazy(() => import('./pages/Departments'));
const AuditLogs           = React.lazy(() => import('./pages/AuditLogs'));
const VerifyCertificate   = React.lazy(() => import('./pages/VerifyCertificate'));
const Reports             = React.lazy(() => import('./pages/Reports'));
const Students            = React.lazy(() => import('./pages/Students'));
const CareerActivityModule = React.lazy(() => import('./components/CareerActivityModule'));
const Rankings            = React.lazy(() => import('./pages/Rankings'));
const Roles               = React.lazy(() => import('./pages/Roles'));
const Settings            = React.lazy(() => import('./pages/Settings'));
const LandingPage         = React.lazy(() => import('./pages/LandingPage'));
const StudentPortfolio    = React.lazy(() => import('./pages/StudentPortfolio'));
const PlacementAlumni     = React.lazy(() => import('./pages/PlacementAlumni'));
const Opportunities       = React.lazy(() => import('./pages/Opportunities'));
const AcademicProfileView = React.lazy(() => import('./components/AcademicProfileView'));
const Privacy             = React.lazy(() => import('./pages/Privacy'));
const Terms               = React.lazy(() => import('./pages/Terms'));
const Cookies             = React.lazy(() => import('./pages/Cookies'));
const ResumePublicView    = React.lazy(() => import('./pages/ResumePublicView'));
const ResumeBuilderView   = React.lazy(() => import('./components/ResumeBuilderView'));
const AboutSkillTrack     = React.lazy(() => import('./pages/AboutSkillTrack'));
const ContactUs           = React.lazy(() => import('./pages/ContactUs'));
const FeaturesPage        = React.lazy(() => import('./pages/FeaturesPage'));
const SolutionsPage       = React.lazy(() => import('./pages/SolutionsPage'));
const SecurityPage        = React.lazy(() => import('./pages/SecurityPage'));
const HelpCenter          = React.lazy(() => import('./pages/HelpCenter'));
const Documentation       = React.lazy(() => import('./pages/Documentation'));
const ApiDocumentation    = React.lazy(() => import('./pages/ApiDocumentation'));
const Careers             = React.lazy(() => import('./pages/Careers'));
const SystemStatus        = React.lazy(() => import('./pages/SystemStatus'));
const EnterpriseSolutions = React.lazy(() => import('./pages/EnterpriseSolutions'));

// Shared page-level loading spinner
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      <span className="text-sm text-gray-500">Loading…</span>
    </div>
  </div>
);

const DashboardRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading || (user && !profile)) {
    return <PageLoader />;
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify/:certId" element={<VerifyCertificate />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/resume/:id" element={<ResumePublicView />} />
              <Route path="/about" element={<AboutSkillTrack />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/docs" element={<Documentation />} />
              <Route path="/api-docs" element={<ApiDocumentation />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/status" element={<SystemStatus />} />
              <Route path="/enterprise" element={<EnterpriseSolutions />} />
              
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
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;

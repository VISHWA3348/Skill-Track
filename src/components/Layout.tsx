import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../api/localApi';
import NotificationCenter from './NotificationCenter';
import GlobalSearch from './GlobalSearch';
import { 
  LayoutDashboard, 
  FileCheck, 
  Users, 
  Building2, 
  Network, 
  ClipboardList,
  LogOut,
  FileText,
  Activity,
  Trophy,
  Shield,
  Briefcase,
  Settings as SettingsIcon,
  Menu,
  X
} from 'lucide-react';

import { hasRouteAccess } from '../constants/permissions';

const Layout: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const dashboardPath = profile ? `/dashboard/${(profile.role || "student").replace('_', '-')}-dashboard` : '/dashboard';
  
  const navItems = [
    { name: 'Dashboard', path: dashboardPath, icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Certificates', path: '/dashboard/certificates', icon: <FileCheck className="w-5 h-5" /> },
    { name: 'Career Activities', path: '/dashboard/career-activities', icon: <Activity className="w-5 h-5" /> },
    { name: 'Rankings', path: '/dashboard/rankings', icon: <Trophy className="w-5 h-5" /> },
    { name: 'Students', path: '/dashboard/students', icon: <Users className="w-5 h-5" /> },
    { name: 'Users', path: '/dashboard/users', icon: <Users className="w-5 h-5" /> },
    { name: 'Roles', path: '/dashboard/roles', icon: <Shield className="w-5 h-5" /> },
    { name: 'Colleges', path: '/dashboard/colleges', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Departments', path: '/dashboard/departments', icon: <Network className="w-5 h-5" /> },
    { name: 'Reports', path: '/dashboard/reports', icon: <FileText className="w-5 h-5" /> },
    { name: 'Resume Builder', path: '/dashboard/resume-builder', icon: <FileText className="w-5 h-5" /> },
    { name: 'Opportunities', path: '/dashboard/opportunities', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Audit Logs', path: '/dashboard/audit-logs', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ].map(item => ({
    ...item,
    show: profile ? hasRouteAccess(profile?.role || '', item.path) : false
  }));

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[50] w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Skill Track</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{(profile?.role || "").replace('_', ' ')} Portal</p>
          </div>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>
                  {item.icon}
                </div>
                <span className="font-bold text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 text-red-600 hover:bg-red-50 w-full px-4 py-4 rounded-2xl transition-all font-bold group"
          >
            <div className="p-2.5 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm">Sign Out System</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-[30]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-4">
                <button 
                  className="lg:hidden p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h2 className="text-xl lg:text-2xl font-black text-slate-900 truncate">
                  {navItems.find(item => item.path === location.pathname)?.name || 'Overview'}
                </h2>
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="hidden sm:block">
                  <GlobalSearch />
                </div>

                <NotificationCenter />
                <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block" />
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-black text-slate-900 leading-none">{profile?.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{profile?.email}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-100">
                  {profile?.name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl max-w-sm w-full p-8 transform animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">Confirm Logout</h3>
            <p className="text-gray-500 text-center mb-8">
              Are you sure you want to log out of your account? Your current session will be terminated.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-3 border-2 border-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default Layout;

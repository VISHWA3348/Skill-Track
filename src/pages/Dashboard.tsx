import { API_BASE_URL } from '@/config/api';
import React, { useEffect, useState, useCallback, memo, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, GraduationCap, Award, Activity, ShieldCheck, Database, Server, Clock, RefreshCw } from 'lucide-react';
import { db, auth, handleApiError, OperationType } from '../api/localApi';
import { collection, query, orderBy, limit, onSnapshot, where } from '../api/localApi';
import { AuditLog } from '../types';

// Phase 10: Lazy-load heavy dashboard views (user only sees ONE of these)
const StudentDashboardView     = React.lazy(() => import('../components/StudentDashboardView'));
const SuperAdminDashboardView  = React.lazy(() => import('../components/SuperAdminDashboardView'));
const StaffDashboardView       = React.lazy(() => import('../components/StaffDashboardView'));
const HODDashboardView         = React.lazy(() => import('../components/HODDashboardView'));
const CollegeAdminDashboardView = React.lazy(() => import('../components/CollegeAdminDashboardView'));

// Phase 8: AnnouncementBanner extracted OUTSIDE Dashboard component to prevent re-creation on renders
const AnnouncementBanner: React.FC = memo(() => {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/announcements`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          setAnnouncements(result.success ? result.data : result);
        }
      } catch (e) {}
    };
    fetchAnnouncements();
    // Announcements rarely change — refresh every 5 minutes instead of constantly
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {(announcements || []).map((a: any) => (
        <div key={a.id} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheck className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">{a.title}</h3>
                <p className="text-sm text-blue-700 mt-1">{a.message}</p>
              </div>
            </div>
            <span className="text-xs text-blue-400">{new Date(a.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

// Small dashboard spinner for Suspense fallback
const DashboardViewLoader: React.FC = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Phase 8: Removed 5-second polling. Stats are fetched once and refreshed manually.
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.success ? result.data : result;
        setStats(data || {});
        if (data && data.recentLogs) {
          setRecentLogs(data.recentLogs);
        }
        setLastFetched(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 5 minutes (not 5 seconds) — stats change infrequently
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [profile, fetchStats]);

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      document.title = 'Skill Track | Super Admin';
    } else if (profile?.role === 'admin') {
      document.title = 'Skill Track | Admin';
    } else {
      document.title = 'Skill Track | Dashboard';
    }
  }, [profile?.role]);

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">College Admin Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-gray-500 text-sm font-medium">Total Students</h4>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalStudents || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-gray-500 text-sm font-medium">Total HODs</h4>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.totalHODs || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-gray-500 text-sm font-medium">Total Staff</h4>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats?.totalStaff || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-gray-500 text-sm font-medium">Total Users</h4>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{stats?.totalUsers || 0}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-green-500" />
            Certifications Stats
          </h4>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalCertificates || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total certificates uploaded</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-purple-500" />
            Career Activity Stats
          </h4>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalCareerActivities || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total career activities logged</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-lg font-medium mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-400" />
          Recent Activities
        </h4>
        <div className="space-y-4">
          {recentLogs.length > 0 ? recentLogs.map((log) => (
            <div key={log.id} className="flex flex-col pb-3 border-b border-gray-50 last:border-0 last:pb-0">
              <span className="text-sm font-medium text-gray-800">{log.action}</span>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">{log.userId}</span>
                <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )) : (
            <div className="text-sm text-gray-500">No recent activities</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHODDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900">Department Dashboard</h3>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
          Dept: {profile?.departmentId}
        </span>
      </div>

      {loading ? (
        <DashboardViewLoader />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Dept Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.staffApprovedCertificates || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Certs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCertificates || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Activities</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCareerActivities || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-500" />
                  Top Performing Students
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3">Student</th>
                        <th className="pb-3">Roll No</th>
                        <th className="pb-3">Certs</th>
                        <th className="pb-3">Activities</th>
                        <th className="pb-3">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(stats?.topPerformers || []).map((student: any, index: number) => (
                        <tr key={student.uid} className="group">
                          <td className="py-3">
                            <div className="flex items-center">
                              <span className="w-6 text-xs text-gray-400 font-mono">0{index + 1}</span>
                              <span className="font-medium text-gray-900">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-sm text-gray-500">{student.rollNo}</td>
                          <td className="py-3 text-sm text-gray-600 font-semibold">{student.certsCount}</td>
                          <td className="py-3 text-sm text-gray-600 font-semibold">{student.activitiesCount}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
                              {student.score} pts
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!stats?.topPerformers || (stats?.topPerformers || []).length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">No data available yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Pending Tasks</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-700 font-medium mb-1">Certificates for Approval</p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-purple-900">{stats?.staffApprovedCertificates || 0}</span>
                      <a href="/certificates" className="text-xs font-bold text-purple-600 hover:underline">Review Now →</a>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm text-orange-700 font-medium mb-1">Career Activities Pending</p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-orange-900">{stats?.pendingCareerActivities || 0}</span>
                      <span className="text-xs font-bold text-orange-600">Awaiting Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );

  const renderStaffDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900">Staff Dashboard</h3>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
          Dept: {profile?.departmentId}
        </span>
      </div>

      {loading ? (
        <DashboardViewLoader />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Assigned Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.pendingCertificates || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Verified</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCertificates - stats?.pendingCertificates || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-500" />
                Student Performance Summary
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Student</th>
                      <th className="pb-3">Roll No</th>
                      <th className="pb-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(stats?.topPerformers || []).map((student: any) => (
                      <tr key={student.uid}>
                        <td className="py-3 font-medium text-gray-900">{student.name}</td>
                        <td className="py-3 text-sm text-gray-500">{student.rollNo}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
                            {student.score} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Logs</h4>
              <div className="space-y-4">
                {recentLogs.length > 0 ? recentLogs.map((log) => (
                  <div key={log.id} className="flex flex-col pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-gray-800">{log.action}</span>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">{log.userId}</span>
                      <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-gray-500">No recent activities</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStudentDashboard = () => (
    <StudentDashboardView />
  );

  const renderScopeLabels = () => {
    if (!profile) return null;
    
    const items = [];
    if (profile.collegeName || profile.collegeId) {
      items.push(`College: ${profile.collegeName || profile.collegeId}`);
    }
    if (profile.departmentName || profile.departmentId) {
      items.push(`Department: ${profile.departmentName || profile.departmentId}`);
    }
    if (profile.role === 'staff' || profile.role === 'student' || profile.role === 'hod') {
      const year = profile.academicYear || profile.academic_year;
      const sem = profile.semester || profile.currentSemester || profile.current_semester;
      if (year) items.push(`Academic Year: ${year}`);
      if (sem) items.push(`Semester: ${sem}`);
    }

    if (items.length === 0) return null;

    return (
      <div className="mb-4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-slate-500 shadow-sm items-center">
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="h-3 w-px bg-slate-200" />}
            <span>{item}</span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnnouncementBanner />
      {renderScopeLabels()}
      {/* Manual refresh button with last-fetched indicator */}
      <div className="flex justify-end mb-2">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {lastFetched ? `Updated ${lastFetched.toLocaleTimeString()}` : 'Refresh'}
        </button>
      </div>
      <Suspense fallback={<DashboardViewLoader />}>
        {profile?.role === 'super_admin' && <SuperAdminDashboardView />}
        {profile?.role === 'admin' && <CollegeAdminDashboardView />}
        {profile?.role === 'hod' && <HODDashboardView />}
        {profile?.role === 'staff' && <StaffDashboardView />}
        {profile?.role === 'student' && renderStudentDashboard()}
      </Suspense>
    </div>
  );
};

export default Dashboard;

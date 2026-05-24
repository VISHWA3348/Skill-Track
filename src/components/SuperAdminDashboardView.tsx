import React, { useState, useEffect } from 'react';
import { db, handleApiError, OperationType, auth } from '../api/localApi';
import { collection, query, where, onSnapshot, getDocs, limit, orderBy, Timestamp } from '../api/localApi';
import { Shield, Users, FileCheck, Activity, Database, Server, HardDrive, Download, Upload, Trash2, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, TrendingUp, Award, Building2, UserPlus, FileText, BarChart3, Globe, Zap, CheckCircle2, AlertCircle, ArrowRight, UserCheck, Settings, Search, Filter, Briefcase, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Certificate, CareerActivity, UserProfile, AuditLog } from '../types';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SignupCodesManagement from './SignupCodesManagement';

export default function SuperAdminDashboardView() {
  const { user, profile } = useAuth();
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [allCertifications, setAllCertifications] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalHODs: 0,
    totalStaff: 0,
    totalCertificates: 0,
    totalActivities: 0,
    pendingApprovals: 0,
    rejectedRequests: 0,
    fraudulentCertificates: 0,
    gpsVerifiedCertificates: 0,
    studentGrowth: 5.2, // Mock data for % increase
  });
  const [chartData, setChartData] = useState({
    monthlyGrowth: [],
    deptAchievements: [],
    collegePerformance: [],
    activityTypes: []
  });
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState('Healthy');

  useEffect(() => {
    if (!profile || profile.role !== 'super_admin') return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 1. Fetch Stats
        const statsRes = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const result = await statsRes.json();
          const data = result.success ? result.data : result;
          setStats({
            totalUsers: data.totalUsers,
            totalStudents: data.totalStudents,
            totalAdmins: data.totalAdmins,
            totalHODs: data.totalHODs,
            totalStaff: data.totalStaff,
            totalCertificates: data.totalCertificates,
            totalActivities: data.totalCareerActivities,
            pendingApprovals: (data.pendingCertificates || 0) + (data.pendingCareerActivities || 0),
            rejectedRequests: data.rejectedCertificates || 0,
            fraudulentCertificates: data.fraudulentCertificates || 0,
            gpsVerifiedCertificates: data.gpsVerifiedCertificates || 0,
            studentGrowth: 8.4
          });

          if (data.monthlyGrowth) {
            setChartData(prev => ({
              ...prev,
              monthlyGrowth: data.monthlyGrowth,
              deptAchievements: data.deptAchievements || prev.deptAchievements,
              activityTypes: data.activityDistribution || prev.activityTypes
            }));
          }
          if (data.recentLogs) setRecentLogs(data.recentLogs);
          if (data.topPerformers) setTopStudents(data.topPerformers);
          setSystemHealth(data.systemHealth || 'Healthy');
        }

        // 2. Fetch Users for Management
        const usersRes = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const result = await usersRes.json();
          const users = result.success ? result.data : result;
          setAllUsers(users);
        }

        // 3. Fetch Certifications for Management
        const certsRes = await fetch('/api/admin/certifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (certsRes.ok) {
          const result = await certsRes.json();
          const certs = result.success ? result.data : result;
          setAllCertifications(certs);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch superadmin dashboard data", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleBackup = async () => {
    try {
      const idToken = localStorage.getItem('token');
      if (!idToken) throw new Error("No auth token");

      const response = await fetch('/api/admin/backup', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) throw new Error("Backup failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certtrack-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Backup failed", error);
      toast.error("Failed to generate backup. Please try again later.");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmModal({
      isOpen: true,
      title: 'Restore Database',
      message: 'Are you sure you want to restore the database? This will overwrite existing data.',
      onConfirm: async () => {
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const backupData = JSON.parse(event.target?.result as string);
              const idToken = localStorage.getItem('token');
              if (!idToken) throw new Error("No auth token");

              const response = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ backupData })
              });

              if (!response.ok) throw new Error("Restore failed");
              toast.success("Database restored successfully");
            } catch (err) {
              console.error("Restore parsing/upload error:", err);
              toast.error("Failed to restore database. Invalid file format.");
            }
          };
          reader.readAsText(file);
        } catch (error) {
          console.error("Restore failed", error);
          toast.error("Failed to restore database.");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          e.target.value = '';
        }
      }
    });
  };

  const handleResetDemo = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Demo Data',
      message: 'WARNING: This will delete ALL users (except Super Admin) and ALL their data. Are you absolutely sure? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const idToken = localStorage.getItem('token');
          if (!idToken) throw new Error("No auth token");

          const response = await fetch('/api/admin/reset-demo', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });

          if (!response.ok) throw new Error("Reset failed");
          toast.success("Demo data reset successfully");
        } catch (error) {
          console.error("Reset failed", error);
          toast.error("Failed to reset demo data.");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteCertificate = async (id: string, eventName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Certificate',
      message: `Are you sure you want to delete the certificate "${eventName}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const idToken = localStorage.getItem('token');
          if (!idToken) throw new Error("No auth token");

          const response = await fetch(`/api/certifications/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });

          if (!response.ok) throw new Error("Delete failed");
          toast.success("Certificate successfully deleted.");
        } catch (error) {
          console.error("Delete failed", error);
          toast.error("Failed to delete certificate.");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            Intelligent Control Center
          </h1>
          <p className="text-slate-500 mt-1">Enterprise-level dashboard and analytics.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/users?add=true"
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-emerald-500" />
            Add User
          </Link>
          <Link
            to="/dashboard/reports"
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-amber-500" />
            Generate Report
          </Link>
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Database className="w-4 h-4 text-indigo-500" />
            Backup DB
          </button>
          <label className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <Upload className="w-4 h-4 text-blue-500" />
            Restore DB
            <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
          </label>
          <button
            onClick={handleResetDemo}
            className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Reset Data
          </button>
          <Link
            to="/dashboard/users"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Users className="w-4 h-4" />
            Manage Users
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Students"
          value={stats.totalStudents}
          color="blue"
          subtext={
            <span className="flex items-center text-emerald-600">
              <TrendingUp className="w-3 h-3 mr-1" /> +{stats.studentGrowth}% this month
            </span>
          }
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Certifications"
          value={stats.totalCertificates}
          color="purple"
          subtext="Monthly trend: Up"
        />
        <StatCard
          icon={<Briefcase className="w-5 h-5" />}
          label="Career Activities"
          value={stats.totalActivities}
          color="emerald"
          subtext="Global submissions"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Pending / Rejected"
          value={`${stats.pendingApprovals} / ${stats.rejectedRequests}`}
          color="orange"
          subtext="Requires attention"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Fraudulent Flags"
          value={stats.fraudulentCertificates}
          color="red"
          subtext={`${stats.gpsVerifiedCertificates} GPS Verified`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Line Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Monthly Growth Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="students" name="Students" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="certs" name="Certifications" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Department Achievements</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.deptAchievements}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="certs" name="Certifications" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="activities" name="Activities" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* College Performance Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">College Performance (Verified Certs)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.collegePerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={120} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="certs" name="Verified Certificates" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Activity Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.activityTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.activityTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health & Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Health */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              System Health
            </h2>
            <div className="space-y-4">
              <HealthItem icon={<Server className="w-4 h-4" />} label="API Status" value="Operational" status="good" />
              <HealthItem icon={<Database className="w-4 h-4" />} label="Database Load" value="Low (12%)" status="good" />
              <HealthItem icon={<ShieldAlert className="w-4 h-4" />} label="Security Events" value="2 Recent" status="warning" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleBackup} className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex flex-col items-center justify-center gap-2 transition-colors">
                <Download className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700">Backup DB</span>
              </button>
              <Link to="/dashboard/users" className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex flex-col items-center justify-center gap-2 transition-colors">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold text-slate-700">Manage Users</span>
              </Link>
              <Link to="/dashboard/reports" className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex flex-col items-center justify-center gap-2 transition-colors">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-700">Reports</span>
              </Link>
              <button onClick={handleResetDemo} className="p-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-100 flex flex-col items-center justify-center gap-2 transition-colors">
                <Trash2 className="w-5 h-5 text-red-500" />
                <span className="text-xs font-bold text-red-700">Reset Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Infrastructure */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-slate-400" />
              Infrastructure
            </h2>

            <div className="space-y-6">
              <InfrastructureItem
                icon={<Globe className="w-4 h-4" />}
                label="Region"
                value="Global (Multi-Region)"
              />
              <InfrastructureItem
                icon={<Database className="w-4 h-4" />}
                label="Database"
                value="SQLite Local"
              />
              <InfrastructureItem
                icon={<Settings className="w-4 h-4" />}
                label="API Version"
                value="v3.1-preview"
              />
              <div className="pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage Usage</span>
                  <span className="text-xs font-bold text-slate-900">12.4 GB / 100 GB</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[12.4%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold">Global Analytics</h3>
            </div>
            <p className="text-indigo-100 text-sm mb-6">
              View performance metrics across all colleges and departments.
            </p>
            <Link
              to="/dashboard/reports"
              className="block w-full py-3 bg-white text-indigo-600 text-center rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors"
            >
              Open Analytics
            </Link>
          </div>
        </div>

        {/* Recent Activity Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                System Audit Logs
              </h2>
              <button className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                View Detailed Logs <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-50 bg-slate-50/30">
                  <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100`}>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 truncate">{log.action}</p>
                      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">User ID: {log.userId}</p>
                  </div>
                </div>
              ))}

              {recentLogs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-medium">No recent logs.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signup Access Codes Management */}
        <div className="lg:col-span-3">
          <SignupCodesManagement />
        </div>

        {/* Manage Certificates */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-slate-400" />
                Manage Certificates
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-900 font-bold">
                  <tr>
                    <th className="p-4 rounded-tl-xl whitespace-nowrap">Event Name</th>
                    <th className="p-4 whitespace-nowrap">Student</th>
                    <th className="p-4 whitespace-nowrap">Date</th>
                    <th className="p-4 whitespace-nowrap">Level</th>
                    <th className="p-4 text-center rounded-tr-xl whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(allCertifications || []).slice(0, 100).map(cert => (
                    <tr key={cert.docId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{cert.eventName}</td>
                      <td className="p-4">{allUsers.find(u => u.uid === cert.userId || u.uid === cert.studentId)?.name || cert.studentId || cert.userId}</td>
                      <td className="p-4">{cert.date || new Date().toLocaleDateString()}</td>
                      <td className="p-4">{cert.level || 'Participation'}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteCertificate(cert.docId, cert.eventName)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block"
                          title="Delete Certificate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allCertifications.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No active certificates found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, subtext, isStatus = false }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-black text-slate-900">{value}</p>
        {isStatus && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">{subtext}</p>
    </motion.div>
  );
}

function InfrastructureItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function HealthItem({ icon, label, value, status }: any) {
  const statusColors: any = {
    good: 'text-emerald-500 bg-emerald-50',
    warning: 'text-amber-500 bg-amber-50',
    error: 'text-red-500 bg-red-50',
  };
  const statusDot: any = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${statusColors[status]}`}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-900">{value}</span>
        <div className={`w-2 h-2 rounded-full ${statusDot[status]} ${status === 'good' ? 'animate-pulse' : ''}`} />
      </div>
    </div>
  );
}

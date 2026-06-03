import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import {
  Shield, Users, FileCheck, Activity, Database, Clock,
  AlertTriangle, TrendingUp, Award, Building2, UserPlus,
  FileText, BarChart3, Globe, Zap, CheckCircle2, AlertCircle,
  ArrowRight, UserCheck, Settings, Search, Filter, Briefcase,
  ShieldAlert, ShieldCheck, Send, Download, Plus, Trash2, PieChart as PieIcon,
  ChevronRight, Calendar, GraduationCap, MapPin, Mail, Phone,
  ExternalLink, Camera, MapPinOff, Eye, History, User, Check, X,
  Key, Copy, RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';
import AcademicConfigView from './AcademicConfigView';
import CollegeAITrends from './admin/CollegeAITrends';

export default function CollegeAdminDashboardView() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data States
  const [stats, setStats] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [weakStudents, setWeakStudents] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);

  // UI States
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    target_role: 'all',
    target_department: '',
    target_year: ''
  });
  const [newDept, setNewDept] = useState({ name: '', department_id: '' });
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [viewingStudentsCode, setViewingStudentsCode] = useState<{ id: string; code: string; deptName: string } | null>(null);
  const [codeStudents, setCodeStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, analyticsRes, studentsRes, staffRes, deptsRes, weakRes, logsRes, certsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/dashboard-stats`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/college-analytics`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/students`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/staff`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/departments`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/weak-students`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/certifications`, { headers })
      ]);

      if (statsRes.ok) setStats((await statsRes.json()).data);
      if (analyticsRes.ok) setAnalytics((await analyticsRes.json()).data);
      if (studentsRes.ok) setStudents((await studentsRes.json()).data);
      if (staffRes.ok) setStaff((await staffRes.json()).data);
      if (deptsRes.ok) setDepartments((await deptsRes.json()).data);
      if (weakRes.ok) setWeakStudents((await weakRes.json()).data);
      if (logsRes.ok) setRecentLogs((await logsRes.json()).data.recentLogs || []);
      if (certsRes.ok) setCertifications((await certsRes.json()).data);

      setLoading(false);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to sync dashboard data");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/broadcast/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(broadcastData)
      });
      if (res.ok) {
        toast.success("Broadcast sent successfully!");
        setShowBroadcastModal(false);
        setBroadcastData({ title: '', message: '', target_role: 'all', target_department: '', target_year: '' });
      }
    } catch (e) {
      toast.error("Failed to send broadcast");
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/department/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newDept)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedInviteCode(data.inviteCode || null);
        toast.success(`Department added! Invite Code: ${data.inviteCode}`);
        setNewDept({ name: '', department_id: '' });
        fetchData();
      } else {
        toast.error(data.error || 'Failed to add department');
      }
    } catch (e) {
      toast.error('Failed to add department');
    }
  };

  const handleRegenerateCode = async (deptId: string, deptName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/department/${deptId}/regenerate-code`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`New code for ${deptName}: ${data.inviteCode}`);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to regenerate code');
      }
    } catch (e) {
      toast.error('Failed to regenerate invite code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Invite code copied!'));
  };

  const handleViewStudentsForCode = async (inviteCodeId: string, inviteCodeStr: string, deptName: string) => {
    try {
      setViewingStudentsCode({ id: inviteCodeId, code: inviteCodeStr, deptName });
      setLoadingStudents(true);
      setCodeStudents([]);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/invite-codes/${inviteCodeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCodeStudents(data.data.registeredStudents || []);
      } else {
        toast.error(data.error || 'Failed to fetch registered students');
      }
    } catch (e) {
      toast.error('Failed to fetch registered students');
    } finally {
      setLoadingStudents(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Syncing College Intelligence...</p>
    </div>
  );

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {profile?.collegeName || 'College Control Center'}
            </h1>
            <p className="text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Real-time Academic & Management Intelligence
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95"
          >
            <Send className="w-4 h-4" />
            Send Broadcast
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar border-b border-slate-100">
        {[
          { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
          { id: 'students', label: 'Student Management', icon: <Users className="w-4 h-4" /> },
          { id: 'certificates', label: 'Certifications', icon: <Award className="w-4 h-4" /> },
          { id: 'staff', label: 'Staff & HODs', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'departments', label: 'Departments', icon: <Database className="w-4 h-4" /> },
          { id: 'manage_codes', label: 'Manage Codes', icon: <Key className="w-4 h-4" /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'academic_config', label: 'Academic Config', icon: <Settings className="w-4 h-4" /> },
          { id: 'notifications', label: 'Broadcast History', icon: <Mail className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
              ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<Users />}
                label="Total Students"
                value={stats.totalStudents}
                subtext={`Active: ${stats.activeUsers}`}
                color="indigo"
              />
              <StatCard
                icon={<Award />}
                label="Certifications"
                value={stats.totalCertificates}
                subtext={`${stats.approvedCertificates} Approved`}
                color="emerald"
              />
              <StatCard
                icon={<Activity />}
                label="College CGPA"
                value={stats.averageCollegeCGPA}
                subtext="Average Performance"
                color="blue"
              />
              <StatCard
                icon={<Briefcase />}
                label="Placement Ready"
                value={stats.placementReadyStudents}
                subtext="High Potential"
                color="amber"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Analytics Preview */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Certificate Growth</h3>
                  <button onClick={() => setActiveTab('analytics')} className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                    Full Report <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.monthlyCertificates}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#4f46e5"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#fff', stroke: '#4f46e5', strokeWidth: 3 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Monitor */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    At-Risk Students
                  </h3>
                  <div className="space-y-4">
                    {weakStudents.slice(0, 4).map((s) => (
                      <div key={s.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{s.risk_reason}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold">
                          Risk: High
                        </span>
                      </div>
                    ))}
                    <button onClick={() => setActiveTab('students')} className="w-full py-3 text-slate-500 text-xs font-bold hover:text-indigo-600 transition-colors">
                      View All Monitoring Data
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold">System Status</h3>
                  </div>
                  <p className="text-indigo-100 text-sm mb-6">
                    All college systems are operational. Last sync: {new Date().toLocaleTimeString()}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Real-time DB Sync Active
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div
            key="students"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-900">Enterprise Student Records</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Roll No/Name..."
                    className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                  />
                </div>
                <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Dept/Year</th>
                    <th className="px-6 py-4">Academic Score</th>
                    <th className="px-6 py-4">Readiness</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((s) => (
                    <tr key={s.uid} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-500">{s.roll_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-700">{s.department_name}</p>
                        <p className="text-xs text-slate-400">{s.year} Year - {s.section}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900">GPA: {s.cgpa || 'N/A'}</span>
                          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(s.cgpa / 10) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400">Attendance: {s.attendance}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${s.readiness > 75 ? 'bg-emerald-100 text-emerald-600' :
                          s.readiness > 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                          }`}>
                          {s.readiness}% Ready
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link to={`/portfolio/${s.uid}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg inline-block transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'certificates' && (
          <motion.div
            key="certificates"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certifications.map((cert) => (
                <div key={cert.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all group">
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    {cert.fileUrl ? (
                      <img src={cert.fileUrl} alt={cert.eventName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Award className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {cert.fraud_flag ? (
                        <div className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : cert.gps_verified ? (
                        <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{cert.type || 'Event'}</span>
                      <span className="text-xs text-slate-400">{new Date(cert.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-4 line-clamp-1">{cert.eventName}</h4>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{cert.student_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="w-4 h-4" />
                        <span>{cert.department_name}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedProof(cert)}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Verify Proof
                      </button>
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {staff.map((s) => (
              <div key={s.uid} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {s.role === 'hod' ? <Shield className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{s.name}</h4>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{s.role}</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Department</span>
                    <span className="font-bold text-slate-900">{s.department_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Pending Reviews</span>
                    <span className={`font-bold ${s.pending_reviews > 5 ? 'text-red-500' : 'text-slate-900'}`}>{s.pending_reviews}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Last Active: {s.last_login ? new Date(s.last_login).toLocaleDateString() : 'Never'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'departments' && (
          <motion.div
            key="departments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {departments.map((d) => (
              <div key={d.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group">
                <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Building2 className="w-6 h-6 text-indigo-100" />
                    <button
                      onClick={() => handleRegenerateCode(d.id, d.name)}
                      title="Regenerate Invite Code"
                      className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xl font-bold">{d.name}</h4>
                  <p className="text-indigo-100 text-xs mt-1">ID: {d.department_id}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Students</p>
                      <p className="text-lg font-black text-slate-900">{d.student_count}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Staff</p>
                      <p className="text-lg font-black text-slate-900">{d.staff_count}</p>
                    </div>
                  </div>
                  {/* Invite Code Section */}
                  <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Key className="w-3 h-3" /> Invite Code
                    </p>
                    {d.invite_code ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-indigo-700 text-sm tracking-wider">{d.invite_code}</span>
                        <button
                          onClick={() => copyToClipboard(d.invite_code)}
                          title="Copy invite code"
                          className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No active code — click ↻ to generate</p>
                    )}
                  </div>
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">HOD</span>
                      <span className="font-bold text-slate-900">{d.hod_name || 'Not Assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Avg CGPA</span>
                      <span className="font-bold text-emerald-600">{d.avg_cgpa ? d.avg_cgpa.toFixed(2) : '0.00'}</span>
                    </div>
                    {d.invite_code_id && (
                      <button
                        onClick={() => handleViewStudentsForCode(d.invite_code_id, d.invite_code, d.name)}
                        className="w-full mt-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" /> View Registered Students
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => setShowAddDeptModal(true)}
              className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/10 transition-all group"
            >
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                <Building2 className="w-8 h-8" />
              </div>
              <span className="font-bold">Add Department</span>
            </button>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CollegeAITrends />
          </motion.div>
        )}

        {activeTab === 'manage_codes' && (
          <motion.div
            key="manage_codes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Manage Department Invite Codes</h3>
                <p className="text-slate-500 text-sm mt-1">View, copy, and regenerate invite codes for your college's departments.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Invite Code</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{d.name}</td>
                      <td className="px-6 py-4">
                        {d.invite_code ? (
                          <div className="flex items-center gap-2">
                            <code className="bg-indigo-50 px-2 py-1 rounded text-indigo-700 font-mono font-bold text-xs uppercase">
                              {d.invite_code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(d.invite_code)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Copy Invite Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No active code</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleRegenerateCode(d.id, d.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all"
                            title="Regenerate Invite Code"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                          </button>
                          {d.invite_code_id && (
                            <button
                              onClick={() => handleViewStudentsForCode(d.invite_code_id, d.invite_code, d.name)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-all"
                              title="View registered students"
                            >
                              <Users className="w-3.5 h-3.5" /> View Students
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'academic_config' && (
          <motion.div
            key="academic_config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AcademicConfigView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proof Viewer Modal */}
      <AnimatePresence>
        {selectedProof && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedProof.eventName}</h3>
                  <p className="text-sm text-slate-500">Evidence & Verification Data for {selectedProof.student_name}</p>
                </div>
                <button onClick={() => setSelectedProof(null)} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Certificate Evidence</h4>
                      <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                        {selectedProof.fileUrl ? (
                          <img src={selectedProof.fileUrl} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">No Certificate</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Site Proof (GPS Photo)</h4>
                      <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                        {selectedProof.photoUrl || selectedProof.photo_file ? (
                          <img src={selectedProof.photoUrl || selectedProof.photo_file} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 italic text-sm">No GPS Photo Provided</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        Security & Metadata Check
                      </h4>
                      <div className="space-y-4">
                        <VerificationItem
                          label="GPS Location Sync"
                          status={selectedProof.gps_verified ? 'success' : 'warning'}
                          value={selectedProof.gps_verified ? 'Verified on Location' : 'No GPS Data'}
                        />
                        <VerificationItem
                          label="Anti-Tamper Scan"
                          status={selectedProof.fraud_flag ? 'danger' : 'success'}
                          value={selectedProof.fraud_flag ? 'Potential Edit Detected' : 'Passed Scan'}
                        />
                        <VerificationItem
                          label="Academic Linkage"
                          status="success"
                          value="Linked to Profile"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        Approval History
                      </h4>
                      <div className="space-y-4">
                        <HistoryItem
                          role="System"
                          action="Automatic Verification"
                          status="Completed"
                          time={new Date(selectedProof.created_at).toLocaleTimeString()}
                        />
                        <HistoryItem
                          role="Staff"
                          action="Manual Review"
                          status={selectedProof.status === 'verified' ? 'Approved' : 'Pending'}
                          time="--"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        Verify Manually
                      </button>
                      <button className="flex-1 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <X className="w-5 h-5" />
                        Reject Proof
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Send className="w-6 h-6" />
                <h3 className="text-xl font-bold">Compose Broadcast</h3>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} className="text-indigo-100 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSendBroadcast} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End Semester Exam Guidelines"
                  value={broadcastData.title}
                  onChange={e => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Detailed Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete details here..."
                  value={broadcastData.message}
                  onChange={e => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Target Role</label>
                  <select
                    value={broadcastData.target_role}
                    onChange={e => setBroadcastData({ ...broadcastData, target_role: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="all">All Users</option>
                    <option value="student">Students Only</option>
                    <option value="staff">Staff Only</option>
                    <option value="hod">HODs Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Department</label>
                  <select
                    value={broadcastData.target_department}
                    onChange={e => setBroadcastData({ ...broadcastData, target_department: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0"
              >
                Launch Announcement
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Dept Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                <h3 className="text-xl font-bold">New Department</h3>
              </div>
              <button onClick={() => { setShowAddDeptModal(false); setCreatedInviteCode(null); }} className="text-slate-400 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            {createdInviteCode ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Department Created!</h4>
                  <p className="text-slate-500 text-sm mb-6">Share this invite code with students so they can register under this department.</p>
                  <div className="bg-indigo-50 rounded-2xl p-4 flex items-center justify-between gap-3 border border-indigo-100">
                    <div className="text-left">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Department Invite Code</p>
                      <p className="font-mono font-black text-2xl text-indigo-700 tracking-widest">{createdInviteCode}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdInviteCode)}
                      className="p-3 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddDeptModal(false); setCreatedInviteCode(null); }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddDept} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mechanical Engineering"
                    value={newDept.name}
                    onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. MECH"
                    value={newDept.department_id}
                    onChange={e => setNewDept({ ...newDept, department_id: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Key className="w-3 h-3" /> An invite code will be auto-generated after creation.
                </p>
                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all"
                >
                  Create Department
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Registered Students Modal */}
      <AnimatePresence>
        {viewingStudentsCode && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-bold">Students Using Code</h3>
                    <p className="text-indigo-100 text-xs mt-0.5">
                      Code: <span className="font-mono font-bold">{viewingStudentsCode.code}</span> ({viewingStudentsCode.deptName})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingStudentsCode(null)}
                  className="p-1 text-indigo-100 hover:text-white hover:bg-indigo-700/50 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingStudents ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Fetching students list...</p>
                  </div>
                ) : codeStudents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Roll No</th>
                          <th className="px-4 py-3">Registered On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {codeStudents.map((s: any) => (
                          <tr key={s.uid} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                            <td className="px-4 py-3 text-slate-600">{s.email}</td>
                            <td className="px-4 py-3 text-slate-700 font-mono">{s.roll_no || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800">No Registrations Yet</h4>
                    <p className="text-slate-500 text-xs max-w-sm mx-auto">
                      No students have registered using this invite code yet. Share the code to start registration.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setViewingStudentsCode(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: any) {
  const colorStyles: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-2xl ${colorStyles[color]}`}>
          {React.cloneElement(icon, { className: 'w-6 h-6' })}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div>
        <h3 className="text-4xl font-black text-slate-900">{value || 0}</h3>
        <p className="text-xs font-bold text-slate-400 mt-1">{subtext}</p>
      </div>
    </motion.div>
  );
}

function VerificationItem({ label, value, status }: any) {
  const styles: any = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    danger: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${styles[status]}`}>
      <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function HistoryItem({ role, action, status, time }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5" />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-900">{role}</span>
          <span className="text-[10px] text-slate-400 font-medium">{time}</span>
        </div>
        <p className="text-xs text-slate-600">{action} • <span className="font-bold text-indigo-600">{status}</span></p>
      </div>
    </div>
  );
}

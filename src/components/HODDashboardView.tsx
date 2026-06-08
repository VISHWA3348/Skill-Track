import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { 
  Users, Award, ShieldCheck, Activity, TrendingUp, BarChart3, PieChart, 
  Target, ArrowRight, BookOpen, AlertTriangle, UserMinus, Briefcase, 
  Calendar, FileText, Bell, Filter, Download, Plus, Search, MapPin,
  Clock, CheckCircle, XCircle, ChevronRight, LayoutDashboard, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart as RePieChart, Pie, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { toast } from 'sonner';
import HODCertificatesView from './HODCertificatesView';
import HODStudentManagement from './HODStudentManagement';
import DepartmentAIInsights from './hod/DepartmentAIInsights';

export default function HODDashboardView() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [academicStats, setAcademicStats] = useState<any>(null);
  
  // Modals
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [announcement, setAnnouncement] = useState({ title: '', message: '', target_year: '', target_section: '' });
  const [flagData, setFlagData] = useState({ type: '', reason: '', severity: 'medium' });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [statsRes, analyticsRes, studentsRes, staffRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/hod/dashboard-stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/hod/department-analytics`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/hod/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/hod/staff-performance`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok) {
        const result = await statsRes.json();
        setStats(result.data);
      }
      if (analyticsRes.ok) {
        const result = await analyticsRes.json();
        setAnalytics(result.data);
      }
      if (studentsRes.ok) {
        const result = await studentsRes.json();
        setStudents(result.data);
      }
      if (staffRes.ok) {
        const result = await staffRes.json();
        setStaff(result.data);
      }

      // Fetch Academic Overview
      const academicRes = await fetch(`${API_BASE_URL}/api/academic/analytics/overview`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (academicRes.ok) {
        const result = await academicRes.json();
        setAcademicStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching HOD data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleSendAnnouncement = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hod/announcements/send`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(announcement)
      });
      if (res.ok) {
        toast.success("Announcement sent to department");
        setIsAnnounceModalOpen(false);
        setAnnouncement({ title: '', message: '', target_year: '', target_section: '' });
      }
    } catch (e) {
      toast.error("Failed to send announcement");
    }
  };

  const handleFlagStudent = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hod/student-flag`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...flagData, student_id: selectedStudent.uid })
      });
      if (res.ok) {
        toast.success(`Flagged ${selectedStudent.name}`);
        setIsFlagModalOpen(false);
        setSelectedStudent(null);
        fetchData();
      }
    } catch (e) {
      toast.error("Failed to flag student");
    }
  };

  const readinessData = analytics?.readinessDistribution || [];

  const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-all cursor-default group animate-all"
    >
      <div className={`p-4 rounded-2xl ${color} transition-transform group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          {loading ? (
            <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <>
              <p className="text-2xl font-black text-slate-900 truncate">{value || 0}</p>
              {trend && <span className="text-[10px] font-bold text-emerald-500 whitespace-nowrap">{trend}</span>}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">HOD Intelligence Command</h1>
          </div>
          <p className="text-slate-500 font-medium">Strategic oversight for <span className="text-indigo-600 font-bold">{profile?.departmentId}</span> • {profile?.collegeName}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsAnnounceModalOpen(true)}
            className="px-5 py-3 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            Send Announcement
          </button>
          <Link to="/reports" className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Generate Dept Report
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents} color="bg-blue-50 text-blue-600" trend="+12 new" />
        <StatCard icon={Award} label="Total Staff" value={stats.totalStaff} color="bg-purple-50 text-purple-600" />
        <StatCard icon={LayoutDashboard} label="Total Classes" value={stats.totalClasses} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={ShieldCheck} label="Pending Reviews" value={stats.pendingApprovals} color="bg-amber-50 text-amber-600" trend="Action required" />
        <StatCard icon={CheckCircle} label="Approved Certs" value={stats.approvedCertificates} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={XCircle} label="Rejected Certs" value={stats.rejectedCertificates} color="bg-red-50 text-red-600" />
        <StatCard icon={Activity} label="Total Activities" value={stats.totalActivities} color="bg-cyan-50 text-cyan-600" />
        <StatCard icon={BookOpen} label="Avg CGPA" value={stats.averageCGPA} color="bg-violet-50 text-violet-600" trend="+0.2 prev" />
        <StatCard icon={Target} label="Placement Ready" value={stats.placementReadyStudents} color="bg-emerald-50 text-emerald-600" trend="Elite group" />
        <StatCard icon={AlertTriangle} label="With Arrears" value={academicStats?.totalArrears || stats.studentsWithArrears} color="bg-rose-50 text-rose-600" />
        <StatCard icon={TrendingUp} label="Attendance Avg" value={`${academicStats?.attendanceAverage || stats.attendanceAverage || 0}%`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Briefcase} label="Active Opps" value={stats.activeOpportunities} color="bg-slate-50 text-slate-700" />
        <StatCard icon={Activity} label="Dept Pass %" value={`${academicStats?.passPercentage || 0}%`} color="bg-green-50 text-green-600" />
        <StatCard icon={TrendingUp} label="Avg GPA" value={academicStats?.avgCgpa || stats.averageCGPA} color="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
        {['overview', 'analytics', 'certificates', 'students', 'staff', 'opportunities'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Placement Readiness Chart */}
              <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Semester Performance Trend
                  </h3>
                </div>
                <div className="h-[350px]">
                  {loading ? (
                    <div className="w-full h-full bg-slate-50 rounded-3xl animate-pulse flex items-center justify-center text-slate-400 font-bold" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics?.cgpaTrend || []}>
                        <defs>
                          <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                        />
                        <Area type="monotone" dataKey="avg_cgpa" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorCgpa)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Distribution Pie */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-500" />
                  Readiness Mix
                </h3>
                <div className="h-[250px] relative">
                  {loading ? (
                    <div className="w-full h-full rounded-full bg-slate-50 animate-pulse" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={readinessData}
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={10}
                            dataKey="value"
                          >
                            {readinessData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#6366f1' : '#f43f5e'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-900">{analytics?.averageReadiness || 0}%</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Index</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-8 space-y-4">
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-50 rounded-2xl animate-pulse" />
                      <div className="h-10 bg-slate-50 rounded-2xl animate-pulse" />
                    </div>
                  ) : (
                    readinessData.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                          <span className="text-xs font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">{item.value} Students</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Toppers Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Department Toppers
                </h3>
                <button onClick={() => setActiveTab('students')} className="text-xs font-black text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all flex items-center gap-1">
                  Explorer All Students <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Rank</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Score</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Certifications</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Placement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                        </td>
                      </tr>
                    ) : (
                      students.slice(0, 5).sort((a,b) => b.placementScore - a.placementScore).map((student, idx) => (
                        <tr key={student.uid} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                               <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                 #{idx + 1}
                               </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{student.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">{student.roll_no || student.rollNo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900">{(student.placementScore/10).toFixed(2)}</span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600" style={{width: `${student.placementScore}%`}}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-black">{student.certsCount} Verified</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${student.placementScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {student.placementScore > 80 ? 'Elite Ready' : 'Corporate Ready'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
             <DepartmentAIInsights />
          </motion.div>
        )}

        {activeTab === 'certificates' && (
           <motion.div key="certificates" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <HODCertificatesView />
           </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <HODStudentManagement />
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
             <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Department Staff Performance
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reviews</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Speed</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {staff.map(member => (
                        <tr key={member.uid} className="hover:bg-slate-50/50">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                 {member.name.charAt(0)}
                               </div>
                               <span className="font-bold text-slate-900">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-500">{member.assignedClasses}</td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{member.certificatesReviewed} Certs</span>
                              <span className="text-[10px] text-slate-400">{member.activitiesReviewed} Activities</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                               <Clock className="w-4 h-4" /> {member.approvalSpeed}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex items-center justify-end gap-3">
                                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500" style={{width: `${member.performanceScore}%`}}></div>
                                </div>
                                <span className="font-black text-emerald-600 text-sm">{member.performanceScore}%</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isAnnounceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden p-8">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black text-slate-900">Department Announcement</h2>
                 <button onClick={() => setIsAnnounceModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Announcement Title</label>
                   <input 
                    type="text" 
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                    placeholder="e.g. Upcoming Semester Examinations" 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500" 
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Message Content</label>
                   <textarea 
                    rows={4}
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                    placeholder="Enter announcement details..." 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Year (Optional)</label>
                      <select 
                        value={announcement.target_year}
                        onChange={(e) => setAnnouncement({...announcement, target_year: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold"
                      >
                        <option value="">All Years</option>
                        <option value="1st">1st Year</option><option value="2nd">2nd Year</option>
                        <option value="3rd">3rd Year</option><option value="4th">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Section (Optional)</label>
                      <select 
                        value={announcement.target_section}
                        onChange={(e) => setAnnouncement({...announcement, target_section: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold"
                      >
                        <option value="">All Sections</option>
                        <option value="A">Section A</option><option value="B">Section B</option>
                        <option value="C">Section C</option>
                      </select>
                    </div>
                 </div>
                 <button 
                  onClick={handleSendAnnouncement}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                 >
                   Broadcast Announcement
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {isFlagModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden p-8">
               <h2 className="text-2xl font-black text-slate-900 mb-2">Flag Student Activity</h2>
               <p className="text-slate-500 mb-8 font-medium">Issue academic warning for <span className="text-indigo-600 font-bold">{selectedStudent.name}</span></p>
               
               <div className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Flag Type</label>
                   <select 
                    value={flagData.type}
                    onChange={(e) => setFlagData({...flagData, type: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold"
                   >
                     <option value="">Select Reason...</option>
                     <option value="Low CGPA">Low CGPA</option>
                     <option value="Attendance Shortage">Attendance Shortage</option>
                     <option value="Inactive">Inactive Student</option>
                     <option value="Plagiarism">Academic Plagiarism</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Severity Level</label>
                   <div className="flex gap-4">
                     {['low', 'medium', 'high'].map(s => (
                       <button 
                        key={s}
                        onClick={() => setFlagData({...flagData, severity: s})}
                        className={`flex-1 py-3 rounded-xl font-bold capitalize border-2 transition-all ${flagData.severity === s ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                       >
                         {s}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Remarks</label>
                   <textarea 
                    rows={3} 
                    value={flagData.reason}
                    onChange={(e) => setFlagData({...flagData, reason: e.target.value})}
                    placeholder="Add detailed remarks for staff..." 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-medium"
                   />
                 </div>
                 <div className="flex gap-4">
                   <button onClick={() => setIsFlagModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                   <button 
                    onClick={handleFlagStudent}
                    className="flex-2 py-4 px-8 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-100 hover:bg-rose-700"
                   >
                     Apply Flag
                   </button>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

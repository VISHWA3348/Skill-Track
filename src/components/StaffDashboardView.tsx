import React, { useState, useEffect } from 'react';
import { 
  Users, Award, Briefcase, Clock, Search, Filter, CheckCircle2, AlertCircle, 
  ArrowRight, UserCheck, ShieldAlert, TrendingUp, BarChart3, Loader2, Plus, 
  Bell, MessageSquare, Download, Calendar, ExternalLink, Mail, Phone, MapPin, 
  ChevronRight, BookOpen, GraduationCap, Target, Send, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Certificate, CareerActivity, UserProfile } from '../types';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import MarkEntryView from './MarkEntryView';

export default function StaffDashboardView() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>({ cgpaDist: [], certTrends: [] });
  
  // Communication states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<any>(null);
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'info' });
  const [remarkData, setRemarkData] = useState({ type: 'academic', text: '' });
  const [showMarkEntry, setShowMarkEntry] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [statsRes, studentsRes, analyticsRes] = await Promise.all([
        fetch('/api/staff/dashboard-stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/staff/students', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/staff/analytics', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok) {
        const res = await statsRes.json();
        setStats(res.data || {});
      }
      if (studentsRes.ok) {
        const res = await studentsRes.json();
        setStudents(res.data || []);
      }
      if (analyticsRes.ok) {
        const res = await analyticsRes.json();
        setAnalytics(res.data || { cgpaDist: [], certTrends: [] });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // Update every 5m
    return () => clearInterval(interval);
  }, []);

  const fetchStudentDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/staff/student/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const result = await response.json();
        setSelectedStudent(result.data);
        setIsModalOpen(true);
      }
    } catch (e) {
      toast.error("Failed to load student details");
    }
  };

  const handleAddRemark = async () => {
    if (!remarkData.text.trim()) return;
    try {
      const response = await fetch('/api/staff/remarks/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          student_id: selectedStudent.profile.uid,
          remark_type: remarkData.type,
          remark: remarkData.text
        })
      });
      if (response.ok) {
        toast.success("Remark added successfully");
        setRemarkData({ type: 'academic', text: '' });
        fetchStudentDetail(selectedStudent.profile.uid); // Refresh detail
      }
    } catch (e) {
      toast.error("Failed to add remark");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) return;
    try {
      const response = await fetch('/api/staff/notifications/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          student_id: notificationTarget?.uid,
          ...notificationData
        })
      });
      if (response.ok) {
        toast.success("Notification sent");
        setShowNotificationModal(false);
        setNotificationData({ title: '', message: '', type: 'info' });
      }
    } catch (e) {
      toast.error("Failed to send notification");
    }
  };

  const getStatusBadge = (cgpa: number, arrears: number) => {
    if (arrears > 2 || cgpa < 5) return { label: 'Critical', color: 'bg-red-100 text-red-700' };
    if (arrears > 0 || cgpa < 6.5) return { label: 'Weak', color: 'bg-orange-100 text-orange-700' };
    if (cgpa < 7.5) return { label: 'Average', color: 'bg-blue-100 text-blue-700' };
    if (cgpa < 8.5) return { label: 'Good', color: 'bg-indigo-100 text-indigo-700' };
    return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700' };
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-slate-400 font-medium">Synchronizing Academic Intelligence...</p>
    </div>
  );

  if (showMarkEntry) {
    return <MarkEntryView onBack={() => setShowMarkEntry(false)} />;
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
             <MapPin className="w-4 h-4" /> {profile?.collegeName} • {profile?.departmentId}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search by name or roll no..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-72 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
             onClick={() => setShowMarkEntry(true)}
             className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
             <Plus className="w-4 h-4" />
             Record Academics
          </button>
          <button 
             onClick={() => fetchData()}
             className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
             title="Refresh Data"
          >
             <Clock className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Students', value: stats.totalStudents, icon: Users, color: 'blue', detail: 'Total Enrolled' },
          { label: 'Avg CGPA', value: (stats.avgCGPA || 0).toFixed(2), icon: GraduationCap, color: 'indigo', detail: 'Class Average' },
          { label: 'Attendance', value: `${(stats.avgAttendance || 0).toFixed(1)}%`, icon: Calendar, color: 'emerald', detail: 'Monthly Avg' },
          { label: 'Arrears', value: stats.studentsWithArrears, icon: ShieldAlert, color: 'red', detail: 'Risk Students' }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
              <item.icon className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-2.5 bg-${item.color}-50 text-${item.color}-600 rounded-2xl`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
            </div>
            <p className="text-4xl font-black text-slate-900 relative z-10">{item.value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{item.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
               <TrendingUp className="w-6 h-6 text-blue-500" />
               Certification Upload Trends
            </h3>
            <div className="flex gap-2">
               <span className="w-3 h-3 rounded-full bg-blue-500" />
               <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Count</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.certTrends}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '15px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
             <BarChart3 className="w-6 h-6 text-indigo-500" />
             CGPA Distribution
          </h3>
          <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={analytics.cgpaDist} layout="vertical">
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                 <XAxis type="number" hide />
                 <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} width={60} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '15px', border: 'none' }} />
                 <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                   {analytics.cgpaDist.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'][index % 5]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Student Intelligence Table */}
      <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users className="w-7 h-7 text-blue-600" />
              Student Academic Performance
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Full-spectrum visibility into class performance and readiness.</p>
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold border border-slate-100 hover:bg-slate-100 transition-all">
                <Filter className="w-4 h-4" /> Filter By Section
             </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Student Profile</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Academic Standing</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status Badge</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Readiness</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Engagement</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(s => {
                  const status = getStatusBadge(s.cgpa || 0, s.arrears || 0);
                  return (
                    <tr key={s.uid} className="hover:bg-blue-50/30 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-black text-lg shadow-sm border border-white">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-base">{s.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-[10px] font-black text-slate-400 uppercase">{s.roll_no || 'N/A'}</span>
                               <span className="w-1 h-1 rounded-full bg-slate-300" />
                               <span className="text-[10px] font-black text-slate-400 uppercase">{s.class} {s.section}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col items-center gap-2">
                           <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900">{s.cgpa || '0.00'}</span>
                              <span className="text-[10px] font-bold text-slate-400">CGPA</span>
                           </div>
                           <div className="flex items-center gap-4 w-24">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.attendance_percentage || 0}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-slate-700">{s.attendance_percentage || 0}%</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${status.color} border border-white shadow-sm inline-block min-w-[90px]`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col items-center gap-1">
                           <div className="relative w-12 h-12 flex items-center justify-center">
                              <svg className="w-12 h-12 -rotate-90">
                                 <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                 <circle cx="24" cy="24" r="20" fill="none" stroke={s.placement_readiness_score > 70 ? '#10b981' : '#3b82f6'} strokeWidth="4" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * (s.placement_readiness_score || 0)) / 100} strokeLinecap="round" />
                              </svg>
                              <span className="absolute text-[10px] font-black text-slate-800">{s.placement_readiness_score || 0}%</span>
                           </div>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Readiness</p>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                         <div className="flex justify-center gap-4">
                            <div className="text-center">
                               <p className="text-base font-black text-slate-900">{s.certCount || 0}</p>
                               <p className="text-[8px] font-black text-slate-400 uppercase">Certs</p>
                            </div>
                            <div className="text-center">
                               <p className="text-base font-black text-slate-900">{s.activityCount || 0}</p>
                               <p className="text-[8px] font-black text-slate-400 uppercase">Acts</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => { setNotificationTarget(s); setShowNotificationModal(true); }}
                             className="p-2.5 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                             title="Send Notification"
                           >
                             <Bell className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => fetchStudentDetail(s.uid)}
                             className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                           >
                             View Intelligence
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="p-20 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-300" />
               </div>
               <p className="text-slate-400 font-bold">No students found in your department.</p>
            </div>
          )}
        </div>
      </section>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 overflow-hidden relative"
            >
               <button onClick={() => setShowNotificationModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500">
                  <Plus className="rotate-45" />
               </button>
               
               <div className="mb-8">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
                     <Bell className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Send Intelligence Alert</h3>
                  <p className="text-slate-400 font-medium">To: <span className="text-slate-900 font-black">{notificationTarget?.name}</span></p>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Alert Title</label>
                     <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold transition-all"
                        placeholder="e.g. Low Attendance Warning"
                        value={notificationData.title}
                        onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Message Body</label>
                     <textarea 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold transition-all min-h-[120px]"
                        placeholder="Detail the academic intervention required..."
                        value={notificationData.message}
                        onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                     />
                  </div>
                  <div className="flex gap-2">
                     {['info', 'warning', 'success'].map(type => (
                        <button 
                           key={type}
                           onClick={() => setNotificationData({...notificationData, type})}
                           className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${notificationData.type === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                        >
                           {type}
                        </button>
                     ))}
                  </div>
                  <button 
                     onClick={handleSendNotification}
                     className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all mt-6"
                  >
                     <Send className="w-5 h-5" /> Dispatch Alert
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Intelligence Modal */}
      <AnimatePresence>
        {isModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 50 }}
               className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
               {/* Modal Header */}
               <div className="p-10 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                     <GraduationCap className="w-48 h-48 text-slate-900" />
                  </div>
                  <div className="flex gap-8 relative z-10">
                     <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 p-1 shadow-xl">
                        {selectedStudent.profile.profile_photo ? (
                           <img src={selectedStudent.profile.profile_photo} className="w-full h-full object-cover rounded-[28px]" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black">
                              {selectedStudent.profile.name.charAt(0)}
                           </div>
                        )}
                     </div>
                     <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                           <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedStudent.profile.name}</h2>
                           <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tight ${getStatusBadge(selectedStudent.academic?.cgpa || 0, selectedStudent.academic?.arrears || 0).color}`}>
                              {getStatusBadge(selectedStudent.academic?.cgpa || 0, selectedStudent.academic?.arrears || 0).label}
                           </span>
                        </div>
                        <p className="text-slate-500 font-black text-lg mt-1">{selectedStudent.profile.roll_no} • {selectedStudent.profile.department_id}</p>
                        <div className="flex gap-3 mt-4">
                           <a href={selectedStudent.academic?.github_url} target="_blank" className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 hover:shadow-md transition-all"><Plus className="w-5 h-5" /></a>
                           <a href={selectedStudent.academic?.linkedin_url} target="_blank" className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:shadow-md transition-all"><Plus className="w-5 h-5" /></a>
                           <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                              <Download className="w-4 h-4" /> Download Intelligence PDF
                           </button>
                        </div>
                     </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-100 text-slate-400 rounded-3xl hover:bg-red-50 hover:text-red-500 transition-all relative z-10 group">
                     <Plus className="w-8 h-8 rotate-45 group-hover:scale-110 transition-transform" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-10 bg-slate-50/20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                     
                     {/* Left Sidebar: Detailed Stats & Remarks */}
                     <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Target className="w-20 h-20 text-blue-600" />
                           </div>
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Academic Performance</h4>
                           <div className="grid grid-cols-2 gap-6 relative z-10">
                              <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Current CGPA</p>
                                 <p className="text-2xl font-black text-slate-900">{selectedStudent.academic?.cgpa || '0.00'}</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Attendance</p>
                                 <p className="text-2xl font-black text-blue-600">{selectedStudent.academic?.attendance_percentage || 0}%</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Semester</p>
                                 <p className="text-2xl font-black text-slate-900">{selectedStudent.academic?.semester || '1'}</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Arrears</p>
                                 <p className={`text-2xl font-black ${selectedStudent.academic?.arrears > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{selectedStudent.academic?.arrears || 0}</p>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Staff Intelligence Remarks</h4>
                           <div className="space-y-4 mb-6 max-h-[250px] overflow-y-auto pr-2">
                              {selectedStudent.remarks?.map((rem: any) => (
                                 <div key={rem.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 relative">
                                    <div className="flex items-center justify-between mb-2">
                                       <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${rem.remark_type === 'academic' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                          {rem.remark_type}
                                       </span>
                                       <span className="text-[8px] font-bold text-slate-400">{new Date(rem.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed italic">"{rem.remark}"</p>
                                    <p className="text-[10px] font-black text-slate-900 mt-2">— Prof. {rem.staff_name}</p>
                                 </div>
                              ))}
                              {selectedStudent.remarks?.length === 0 && <p className="text-center text-slate-400 py-6 text-sm italic">No intelligence logs found.</p>}
                           </div>
                           
                           <div className="space-y-3 pt-4 border-t border-slate-100">
                              <textarea 
                                 className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium min-h-[80px]"
                                 placeholder="Add academic intervention remark..."
                                 value={remarkData.text}
                                 onChange={(e) => setRemarkData({...remarkData, text: e.target.value})}
                              />
                              <div className="flex gap-2">
                                 <select 
                                    className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                                    value={remarkData.type}
                                    onChange={(e) => setRemarkData({...remarkData, type: e.target.value})}
                                 >
                                    <option value="academic">Academic</option>
                                    <option value="behavior">Behavior</option>
                                    <option value="achievement">Achievement</option>
                                 </select>
                                 <button 
                                    onClick={handleAddRemark}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                                 >
                                    Add Log
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Center Column: Certifications & Timeline */}
                     <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                           <div className="flex items-center justify-between mb-8">
                              <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                 <Award className="w-6 h-6 text-blue-500" />
                                 Certification Portfolio
                              </h4>
                              <span className="px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                 {selectedStudent.certifications?.length || 0} Assets
                              </span>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedStudent.certifications?.map((cert: any) => (
                                 <div key={cert.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                       <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                          <Award className="w-5 h-5" />
                                       </div>
                                       <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${cert.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                          {cert.status}
                                       </span>
                                    </div>
                                    <h5 className="font-black text-slate-900 text-sm leading-tight mb-1">{cert.event_name || cert.eventName}</h5>
                                    <p className="text-[10px] text-slate-500 font-bold mb-4">{cert.event_college_name || 'Verified Institution'}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                                       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(cert.date).toLocaleDateString()}
                                       </div>
                                       <a 
                                          href={cert.file_url} 
                                          target="_blank" 
                                          className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                                       >
                                          View <ExternalLink className="w-3 h-3" />
                                       </a>
                                    </div>
                                 </div>
                              ))}
                              {selectedStudent.certifications?.length === 0 && (
                                 <div className="col-span-2 py-10 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 text-sm font-bold">No certifications uploaded yet.</p>
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                           <div className="flex items-center justify-between mb-8">
                              <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                 <Briefcase className="w-6 h-6 text-indigo-500" />
                                 Career & Industry Engagement
                              </h4>
                              <span className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                 {selectedStudent.activities?.length || 0} Records
                              </span>
                           </div>
                           <div className="space-y-4">
                              {selectedStudent.activities?.map((act: any) => (
                                 <div key={act.id} className="p-5 bg-white border border-slate-100 rounded-[28px] hover:shadow-lg transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                                          <Briefcase className="w-6 h-6" />
                                       </div>
                                       <div>
                                          <h5 className="font-black text-slate-900 text-base">{act.organization}</h5>
                                          <div className="flex items-center gap-3 mt-0.5">
                                             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{act.type}</span>
                                             <span className="w-1 h-1 rounded-full bg-slate-300" />
                                             <span className="text-[10px] font-bold text-slate-400">{act.duration}</span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${act.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                          {act.status}
                                       </span>
                                       <button className="p-2 text-slate-300 hover:text-slate-900"><ChevronRight className="w-5 h-5" /></button>
                                    </div>
                                 </div>
                              ))}
                              {selectedStudent.activities?.length === 0 && (
                                 <div className="py-10 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 text-sm font-bold">No industry activities recorded.</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

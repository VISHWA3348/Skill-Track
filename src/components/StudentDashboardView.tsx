import React, { useState, useEffect } from 'react';
import { db } from '../api/localApi';
import { collection, query, where, onSnapshot } from '../api/localApi';
import { Award, Briefcase, Trophy, User, Clock, Plus, ArrowRight, TrendingUp, CheckCircle2, AlertCircle, MapPin, Star, Github, Linkedin, ExternalLink, Sparkles, Target, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Certificate, CareerActivity } from '../types';
import { Link } from 'react-router-dom';
import { exportPortfolioToPDF } from '../services/portfolioExport';
import { toast } from 'sonner';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import AICareerInsights from './student/AICareerInsights';

export default function StudentDashboardView() {
  const { profile } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [activities, setActivities] = useState<CareerActivity[]>([]);
  const [academicProfile, setAcademicProfile] = useState<any>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [academicPerformance, setAcademicPerformance] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;

    const qCerts = query(collection(db, 'certificates'), where('userId', '==', profile.uid));
    const unsubCerts = onSnapshot(qCerts, (snap) => {
      const allCerts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
      setCertificates(allCerts.filter(c => !c.is_deleted));
    });

    const qActivities = query(collection(db, 'careerActivities'), where('userId', '==', profile.uid));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(doc => ({ docId: doc.id, ...doc.data() } as CareerActivity)));
    });

    const fetchData = async () => {
      try {
        const [statsRes, oppsRes, acadRes, notifRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/opportunities', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/student/academic-profile', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/student/notifications', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        ]);

        if (statsRes.ok) {
          const result = await statsRes.json();
          const data = result.success ? result.data : result;
          setStats(data || {});
          setRank(data?.studentRank || null);
          setTotalStudents(data?.totalStudents || 0);
        }

        if (oppsRes.ok) {
          const result = await oppsRes.json();
          setOpportunities(result.data || []);
        }

        if (acadRes.ok) {
          const result = await acadRes.json();
          setAcademicProfile(result.data);
        }

        if (notifRes.ok) {
          const result = await notifRes.json();
          setNotifications(result.data || []);
        }

        // Fetch granular academic performance
        const perfRes = await fetch('/api/student/academic/performance', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (perfRes.ok) {
          const result = await perfRes.json();
          setAcademicPerformance(result.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    return () => { 
      unsubCerts(); 
      unsubActivities(); 
      clearInterval(interval);
    };
  }, [profile]);

  const NotificationsSection = () => {
    if (notifications.length === 0) return null;

    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Priority Alerts
          </h3>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full uppercase">
            {notifications.length} New
          </span>
        </div>
        <div className="space-y-3">
          {notifications.slice(0, 3).map((n) => (
            <div key={n.id} className="p-4 rounded-2xl bg-amber-50/30 border border-amber-100">
              <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
              <p className="text-xs text-slate-600 mt-1">{n.message}</p>
              <span className="text-[10px] text-slate-400 mt-2 block">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };


  const progressScore = stats?.studentScore || 0;
  const gpsVerifiedCount = certificates.filter(c => c.gpsVerified).length;
  const nextRankScore = progressScore + 5; 
  const progressPercentage = Math.min((progressScore / (nextRankScore || 1)) * 100, 100);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Dashboard</h1>
          <p className="text-slate-500 mt-1">Unified academic & career performance monitoring.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link 
            to="/dashboard/academic-profile" 
            className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-sm"
          >
            <Calculator className="w-4 h-4" />
            Update Academics
          </Link>
          <Link 
            to="/dashboard/upload-certificate" 
            state={{ openUpload: true }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            Upload Certificate
          </Link>
          <Link 
            to="/dashboard/add-activity" 
            state={{ openAdd: true }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </Link>
          <Link 
            to="/dashboard/resume-builder" 
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            Resume Builder
          </Link>
        </div>
      </div>

      {/* AI Career Insights Section */}
      <section>
        <AICareerInsights />
      </section>

      {/* NEW ACADEMIC & READINESS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Performance Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-3 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Academic Standing</h2>
              <p className="text-sm text-slate-500">Semester {academicPerformance?.records?.[0]?.semester || academicProfile?.semester || '1'} performance overview</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current CGPA</p>
              <p className="text-3xl font-black text-blue-600">{academicPerformance?.summary?.cgpa?.toFixed(2) || academicProfile?.cgpa || '0.00'}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <TrendingUp className="w-3 h-3" />
                <span>Good Standing</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</p>
              <p className="text-3xl font-black text-slate-900">
                {academicPerformance?.semesters?.[0]?.attendance_avg?.toFixed(1) || academicProfile?.attendance_percentage || '0'}%
              </p>
              <div className={`w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden`}>
                <div 
                  className={`h-full rounded-full ${parseFloat(academicPerformance?.semesters?.[0]?.attendance_avg || academicProfile?.attendance_percentage || '0') < 75 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${academicPerformance?.semesters?.[0]?.attendance_avg || academicProfile?.attendance_percentage || 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Arrears</p>
              <p className={`text-3xl font-black ${parseInt(academicPerformance?.summary?.total_arrears || academicProfile?.arrears || '0') > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                {academicPerformance?.summary?.total_arrears || academicProfile?.arrears || '0'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Credits</p>
              <p className="text-3xl font-black text-slate-900">
                {academicPerformance?.records?.reduce((acc: number, r: any) => acc + (r.credits || 0), 0) || '124'}
              </p>
            </div>
          </div>

          {/* Performance Trend Chart */}
          {academicPerformance?.semesters?.length > 1 && (
            <div className="mt-8 pt-8 border-t border-slate-50 relative z-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">GPA Progress Trend</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={academicPerformance.semesters}>
                    <defs>
                      <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(val) => `Sem ${val}`} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 10]} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '15px' }}
                    />
                    <Area type="monotone" dataKey="semester_gpa" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Subject-wise Records */}
          {academicPerformance?.records?.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-50 relative z-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Subject-wise Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b border-slate-50">
                      <th className="pb-3">Subject Name</th>
                      <th className="pb-3 text-center">Semester</th>
                      <th className="pb-3 text-center">Grade</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {academicPerformance.records.slice(0, 5).map((r: any, i: number) => (
                      <tr key={i} className="group">
                        <td className="py-3">
                          <p className="font-bold text-slate-900">{r.subject_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{r.subject_code}</p>
                        </td>
                        <td className="py-3 text-center font-medium text-slate-600">Sem {r.semester}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-lg font-black ${
                            r.grade === 'O' ? 'bg-emerald-50 text-emerald-600' : 
                            r.grade === 'A+' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-[10px] font-bold uppercase ${r.result_status === 'Pass' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {r.result_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-blue-600" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Star className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Score</span>
          </div>
          <p className="text-4xl font-black text-slate-900 relative z-10">{progressScore}</p>
          
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
              <span>Level Progress</span>
              <span>{progressScore} / {nextRankScore}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-16 h-16 text-yellow-600" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Rank</span>
          </div>
          <div className="flex items-baseline gap-1 relative z-10">
            <p className="text-4xl font-black text-slate-900">#{rank || '--'}</p>
            <span className="text-sm font-medium text-slate-500">/ {totalStudents}</span>
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1 relative z-10">
            <TrendingUp className="w-3 h-3" /> Top {rank && totalStudents ? Math.round((rank/totalStudents)*100) : '--'}%
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certificates</span>
          </div>
          <p className="text-4xl font-black text-slate-900">{certificates.length}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-bold">{certificates.filter(c => c.status === 'verified' || c.status === 'approved').length} Verified</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">{certificates.filter(c => c.status === 'staff_approved').length} Staff Appr.</span>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold">{certificates.filter(c => c.status === 'pending').length} Pending</span>
            {gpsVerifiedCount > 0 && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {gpsVerifiedCount} GPS
              </span>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activities</span>
          </div>
          <p className="text-4xl font-black text-slate-900">{activities.length}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-bold">{activities.filter(a => a.status === 'approved').length} Approved</span>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold">{activities.filter(a => a.status === 'pending').length} Pending</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card & Alerts */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="px-6 pb-6 -mt-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl mb-4">
                  {profile?.profilePhoto ? (
                    <img src={profile.profilePhoto} className="w-full h-full rounded-2xl object-cover" alt="Profile" />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{profile?.name}</h3>
                <p className="text-sm text-slate-500">{profile?.email}</p>
                
                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                  <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll No</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.rollNo}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dept</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.departmentId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <NotificationsSection />
        </section>

        {/* Recommended Opportunities */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Recommended
              </h2>
              <Link to="/dashboard/opportunities" className="text-sm font-bold text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const mySkills = profile?.skills ? profile.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s) : [];
                const recommended = (opportunities || []).filter((opp: any) => {
                  if (!opp.required_skills || mySkills.length === 0) return false;
                  return opp.required_skills.split(',').some((s: string) => mySkills.includes(s.trim().toLowerCase()));
                }).slice(0, 3);
                
                if (recommended.length === 0) {
                  return (
                    <div className="p-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Add more skills in settings to unlock matching opportunities.</p>
                      <Link to="/dashboard/settings" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700">
                        Update Skills <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                }

                return recommended.map((opp: any) => (
                  <div key={opp.id} className="group p-4 rounded-2xl border border-blue-50 bg-gradient-to-br from-white to-blue-50/20 hover:to-blue-50 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{opp.title}</h3>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400" />
                    </div>
                    <p className="text-xs font-medium text-slate-500 mb-4">{opp.company_name}</p>
                    <a 
                      href={opp.external_link?.startsWith('http') ? opp.external_link : `https://${opp.external_link}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full text-center text-xs font-bold py-2 bg-white text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                    >
                      Apply Now
                    </a>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>

        {/* Portfolio & Skills */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            </div>
            <div className="px-6 pb-6 -mt-12 relative z-10">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl shadow-slate-200/50 mb-4 ring-4 ring-white">
                  {profile?.profilePhoto ? (
                    <img src={profile.profilePhoto} className="w-full h-full rounded-2xl object-cover" alt="Profile" />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-300">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900">{profile?.name}</h3>
                <p className="text-sm font-medium text-slate-500 mb-2">{profile?.departmentId} • {profile?.year || '1st'} Year</p>
                
                {profile?.bio && (
                  <p className="text-xs text-slate-600 text-center line-clamp-3 mb-4 leading-relaxed italic px-2">
                    "{profile.bio}"
                  </p>
                )}

                <div className="flex gap-2 mb-6">
                  {profile?.socialLinks?.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {profile?.socialLinks?.github && (
                    <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                </div>
                
                <div className="w-full space-y-4 pt-4 border-t border-slate-50">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-blue-500" />
                        Top Skills
                      </h4>
                      <Link to="/dashboard/settings" className="text-[10px] font-bold text-blue-600 hover:underline">Edit</Link>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {profile?.skills ? profile.skills.split(',').map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-100 uppercase tracking-tight hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all cursor-default">
                          {skill.trim()}
                        </span>
                      )) : (
                        <p className="text-[10px] text-slate-400 italic">No skills listed yet.</p>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        if (!profile) return;
                        toast.promise(
                          new Promise((resolve) => {
                            exportPortfolioToPDF(profile, certificates, activities);
                            resolve(true);
                          }),
                          {
                            loading: 'Generating your professional portfolio...',
                            success: 'Portfolio exported successfully!',
                            error: 'Failed to generate portfolio'
                          }
                        );
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Export Portfolio PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Submissions */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Recent Submissions
              </h2>
              <Link to="/dashboard/certificates" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {([...(certificates || []), ...(activities || [])])
                .sort((a, b) => {
                  const dateA = new Date((a as any).createdAt || (a as any).timestamp || (a as any).created_at || 0).getTime();
                  const dateB = new Date((b as any).createdAt || (b as any).timestamp || (b as any).created_at || 0).getTime();
                  return dateB - dateA;
                })
                .slice(0, 5)
                .map((item, idx) => {
                  const isCert = 'eventName' in item;
                  const status = item.status;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${isCert ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isCert ? <Award className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{isCert ? (item as Certificate).eventName : (item as CareerActivity).organization}</p>
                          <p className="text-xs text-slate-500">{isCert ? 'Certificate' : (item as CareerActivity).type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          status === 'verified' || status === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : status === 'staff_approved'
                              ? 'bg-blue-100 text-blue-700'
                              : status === 'rejected' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                        }`}>
                          {status === 'verified' || status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {(status || 'pending').replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {certificates.length === 0 && activities.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-medium">No submissions yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Start by uploading your first certificate!</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

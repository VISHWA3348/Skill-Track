import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, TrendingUp, BarChart3, Target, Building2, Zap, 
  ArrowUpRight, RefreshCw, Sparkles, Award, Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

export default function CollegeAITrends() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (force = false) => {
    if (!profile?.college_id && !profile?.collegeId) return;
    try {
      if (force) setRefreshing(true);
      const collegeId = profile?.college_id || profile?.collegeId;
      const url = `/api/ai/college/${collegeId}${force ? '?refresh=true' : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching College AI trends:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [profile]);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (!data) return null;

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" />
            Global AI Skill Trends
          </h2>
          <p className="text-sm text-slate-500 font-medium">College-wide intelligence and cross-departmental readiness monitoring.</p>
        </div>
        <button 
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-indigo-600"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden"
        >
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-20 h-20" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Readiness Index</p>
           <p className="text-4xl font-black">{data.overallReadiness?.toFixed(1)}%</p>
           <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ArrowUpRight className="w-4 h-4" /> 
              <span>Above state average by 12%</span>
           </div>
        </motion.div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Most Demanded Skill</p>
           <p className="text-3xl font-black text-slate-900">{data.globalGaps?.[0]?.skill || 'N/A'}</p>
           <p className="text-xs font-medium text-slate-500 mt-2">Required by {data.globalGaps?.[0]?.count || 0} students college-wide.</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Top Performing Dept</p>
           <p className="text-3xl font-black text-indigo-600">CSE</p>
           <p className="text-xs font-medium text-slate-500 mt-2">Leading in technical certifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Readiness Comparison */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
             <Building2 className="w-5 h-5 text-indigo-600" />
             Department Comparison
           </h3>
           <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="deptId" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                   <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                   />
                   <Bar dataKey="readiness" radius={[8, 8, 0, 0]} barSize={40}>
                      {data.departments?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Global Skill Gaps */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
             <Zap className="w-5 h-5 text-amber-500" />
             Global Skill Demand
           </h3>
           <div className="space-y-4">
              {data.globalGaps?.slice(0, 6).map((gap: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-900">
                         {i + 1}
                      </div>
                      <span className="font-bold text-slate-700">{gap.skill}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-600">{gap.count} students</span>
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-indigo-600" 
                            style={{ width: `${Math.min((gap.count / 100) * 100, 100)}%` }}
                         ></div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Strategic Initiatives */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
             <Target className="w-5 h-5 text-indigo-600" />
             AI-Driven Strategic Insights
           </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
              <Award className="w-6 h-6 text-blue-600 mb-4" />
              <h4 className="font-bold text-slate-900 mb-2">Certification Focus</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cloud related certifications are trending high. Recommend partnership with AWS Academy.
              </p>
           </div>
           <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
              <Briefcase className="w-6 h-6 text-emerald-600 mb-4" />
              <h4 className="font-bold text-slate-900 mb-2">Internship Surge</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Frontend development internships show 40% higher success rate this quarter.
              </p>
           </div>
           <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600 mb-4" />
              <h4 className="font-bold text-slate-900 mb-2">Readiness Growth</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                College-wide readiness is projected to hit 85% by year end if current trends continue.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

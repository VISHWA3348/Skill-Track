import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BrainCircuit, TrendingUp, Zap, Target, Users, AlertCircle, 
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function DepartmentAIInsights() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (force = false) => {
    if (!profile?.departmentId) return;
    try {
      if (force) setRefreshing(true);
      const url = `${API_BASE_URL}/api/ai/department/${profile.departmentId}${force ? '?refresh=true' : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching HOD AI insights:", error);
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

  const stats = data.readiness_stats || {};
  const skillGaps = data.skill_gaps || [];

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
            AI Department Analytics
          </h2>
          <p className="text-sm text-slate-500 font-medium">Predictive analysis of student readiness and skill trends.</p>
        </div>
        <button 
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-indigo-600"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp className="w-16 h-16 text-indigo-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Readiness</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900">{stats.avg_readiness?.toFixed(1)}%</p>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> 2.4%
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Elite Performers</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900">{stats.top_performers}</p>
            <p className="text-xs font-medium text-slate-400">/ {stats.total_students} students</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attention Required</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-rose-600">{stats.needing_focus}</p>
            <span className="text-xs font-bold text-rose-500 flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" /> Urgent
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-none shadow-indigo-100">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Skill Gap Index</p>
          <p className="text-3xl font-black">{Math.round(skillGaps.length * 4.5)}%</p>
          <p className="text-[10px] font-medium text-white/80 mt-1">Lower is better</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skill Gaps Visualization */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
               <Zap className="w-5 h-5 text-amber-500" />
               Department Skill Gaps
             </h3>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 10 Gaps</span>
          </div>
          <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={skillGaps} layout="vertical" margin={{ left: 40 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                 <XAxis type="number" hide />
                 <YAxis 
                    dataKey="skill" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#475569', fontSize: 11, fontWeight: 700}}
                 />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                 />
                 <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                   {skillGaps.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={index < 3 ? '#ef4444' : index < 6 ? '#f59e0b' : '#3b82f6'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            AI Training Recommendations
          </h3>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Urgent Curriculum Updates</p>
               <div className="space-y-4">
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                        <Zap className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-900">Industry Skill Mismatch</p>
                        <p className="text-xs text-slate-500 mt-1">Significant percentage of students lack <span className="font-bold text-slate-700">{skillGaps[0]?.skill || 'Modern Framework'}</span> knowledge.</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <Users className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-900">Placement Readiness Alert</p>
                        <p className="text-xs text-slate-500 mt-1">Recommend organizing a workshop for <span className="font-bold text-slate-700">{skillGaps[1]?.skill || 'Cloud Computing'}</span> next semester.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Performance Insights</p>
               <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-indigo-50 mb-3">
                  <span className="text-xs font-bold text-slate-700">Top Career Path</span>
                  <span className="text-xs font-black text-indigo-600 uppercase">Software Engineer</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-indigo-50">
                  <span className="text-xs font-bold text-slate-700">Emerging Interest</span>
                  <span className="text-xs font-black text-emerald-600 uppercase">Cloud & DevOps</span>
               </div>
            </div>

            <button className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
               Download Detailed AI Audit <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

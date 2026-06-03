import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Target, Award, Briefcase, TrendingUp, AlertCircle, 
  ArrowRight, BookOpen, GraduationCap, Zap, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export default function AICareerInsights() {
  const { profile } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (force = false) => {
    if (!profile?.uid) return;
    try {
      if (force) setRefreshing(true);
      const url = force ? `${API_BASE_URL}/api/ai/recalculate/${profile.uid}` : `${API_BASE_URL}/api/ai/insights/${profile.uid}`;
      const method = force ? 'POST' : 'GET';
      
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setInsights(result.data);
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [profile]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-100 rounded-full mb-8"></div>
        <div className="space-y-4">
          <div className="h-32 bg-slate-50 rounded-2xl"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-slate-50 rounded-2xl"></div>
            <div className="h-24 bg-slate-50 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const score = insights.placement_readiness_score || 0;
  const status = score > 80 ? 'Elite' : score > 60 ? 'Ready' : 'In Progress';
  const statusColor = score > 80 ? 'text-emerald-500' : score > 60 ? 'text-blue-500' : 'text-amber-500';

  return (
    <div className="space-y-6">
      {/* Hero Insight Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full -mr-48 -mt-48 opacity-20 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full -ml-32 -mb-32 opacity-10 blur-[80px]"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30 backdrop-blur-md">
                  <span className="text-[10px] font-black tracking-widest uppercase text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    AI Career Mentor
                  </span>
                </div>
                <button 
                  onClick={() => fetchInsights(true)}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                  title="Recalculate Insights"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <h2 className="text-3xl font-black tracking-tight">AI Career Insights</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <span className={`text-xl font-black ${statusColor}`}>{status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Readiness Gauge */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                  <circle 
                    cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * score) / 100} 
                    className="text-blue-500 transition-all duration-1000 ease-out" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black block leading-none">{score}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Readiness</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 text-center">Your placement readiness has increased by <span className="text-emerald-400 font-bold">+5%</span> this month.</p>
            </div>

            {/* Path & Summary */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Predicted Career Path</p>
                <div className="flex flex-wrap gap-2">
                  {insights.career_path_suggestions?.map((path: string, i: number) => (
                    <div key={i} className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-900/20">
                      <span className="text-sm font-black flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {path}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {insights.analysis_summary}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Skills & Gaps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missing Skills */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Skill Gaps
            </h3>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full uppercase">
              Action Required
            </span>
          </div>
          <div className="space-y-3">
            {insights.missing_skills?.map((skill: string, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-colors">
                <span className="text-sm font-bold text-slate-700">{skill}</span>
                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn Now <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            ))}
            {insights.missing_skills?.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No critical skill gaps detected!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Course Suggestions
            </h3>
          </div>
          <div className="space-y-3">
            {insights.course_recommendations?.map((course: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-blue-50/30 rounded-xl border border-blue-50 group hover:bg-blue-50 transition-colors cursor-pointer">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{course}</p>
                  <p className="text-[10px] text-blue-600 font-medium mt-0.5">Top Rated on Coursera</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recommended Certifications */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            Certifications
          </h4>
          <div className="space-y-3">
            {insights.suggested_certifications?.map((cert: string, i: number) => (
              <div key={i} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <p className="text-sm font-bold text-purple-900">{cert}</p>
                <p className="text-[10px] text-purple-600 mt-1">Boosts profile by +8%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Internships */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-500" />
            Internship Paths
          </h4>
          <div className="space-y-3">
            {insights.suggested_internships?.map((intern: string, i: number) => (
              <div key={i} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <p className="text-sm font-bold text-emerald-900">{intern}</p>
                <p className="text-[10px] text-emerald-600 mt-1">High Demand Domain</p>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Alerts */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            Priority Alerts
          </h4>
          <div className="space-y-3">
            {insights.smart_alerts?.map((alert: string, i: number) => (
              <div key={i} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex gap-3">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0"></div>
                <p className="text-xs font-medium text-rose-900 leading-relaxed">{alert}</p>
              </div>
            ))}
            {insights.smart_alerts?.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">No critical alerts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

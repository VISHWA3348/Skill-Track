import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Calculator, Calendar, CheckCircle2, Save, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function AcademicProfileView() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    register_no: '',
    semester: '1',
    cgpa: '',
    arrears: '0',
    attendance_percentage: '',
    total_subjects: '',
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    resume_url: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/student/academic-profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setData(prev => ({
              ...prev,
              ...result.data,
              cgpa: result.data.cgpa?.toString() || '',
              arrears: result.data.arrears?.toString() || '0',
              attendance_percentage: result.data.attendance_percentage?.toString() || '',
              total_subjects: result.data.total_subjects?.toString() || ''
            }));
          }
        }
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/student/academic-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success("Academic profile updated successfully!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Academic Intelligence</h1>
        <p className="text-slate-500 mt-1">Manage your academic performance and career readiness data.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Academic Records
              </h2>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Register Number</label>
                  <input
                    type="text"
                    value={data.register_no}
                    onChange={e => setData({...data, register_no: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="Enter Register No"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Semester</label>
                  <select
                    value={data.semester}
                    onChange={e => setData({...data, semester: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                  >
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current CGPA</label>
                  <div className="relative">
                    <Calculator className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      max="10"
                      value={data.cgpa}
                      onChange={e => setData({...data, cgpa: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Arrears</label>
                  <input
                    type="number"
                    value={data.arrears}
                    onChange={e => setData({...data, arrears: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance %</label>
                  <input
                    type="number"
                    value={data.attendance_percentage}
                    onChange={e => setData({...data, attendance_percentage: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="85"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Career Links
              </h2>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">GitHub URL</label>
                  <input
                    type="url"
                    value={data.github_url}
                    onChange={e => setData({...data, github_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LinkedIn URL</label>
                  <input
                    type="url"
                    value={data.linkedin_url}
                    onChange={e => setData({...data, linkedin_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-100">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Readiness Score
            </h3>
            <p className="text-blue-100 text-sm mb-6">Based on your academic and extracurricular profile.</p>
            
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-blue-400/30" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * (parseFloat(data.cgpa || '0') * 10)) / 100} className="text-white transition-all duration-1000" />
                 </svg>
                 <span className="absolute text-3xl font-black">{Math.round(parseFloat(data.cgpa || '0') * 10)}%</span>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10 text-xs">
              <p className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> CGPA: {data.cgpa || '0.00'}</p>
              <p className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> Arrears: {data.arrears || '0'}</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> Attendance: {data.attendance_percentage || '0'}%</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Improvement Tips
             </h3>
             <ul className="space-y-3">
                {parseInt(data.arrears) > 0 && (
                  <li className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    Focus on clearing your <b>{data.arrears} arrears</b> to improve placement eligibility.
                  </li>
                )}
                {parseFloat(data.attendance_percentage) < 75 && (
                   <li className="text-xs text-slate-600 bg-red-50 p-3 rounded-xl border border-red-100">
                     Maintain at least <b>75% attendance</b> to avoid semester registration issues.
                   </li>
                )}
                <li className="text-xs text-slate-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                  Update your <b>GitHub and LinkedIn</b> profiles to increase visibility to recruiters.
                </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

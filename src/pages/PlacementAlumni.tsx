import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { Building2, Briefcase, Users, Plus, Trash2, Search, Filter, Globe, ExternalLink, GraduationCap, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function PlacementAlumni() {
  const [activeTab, setActiveTab] = useState<'companies' | 'jobs' | 'alumni'>('companies');
  const [companies, setCompanies] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      const compRes = await fetch(`${API_BASE_URL}/api/companies`, { headers });
      const jobRes = await fetch(`${API_BASE_URL}/api/job-posts`, { headers });
      const alumRes = await fetch(`${API_BASE_URL}/api/alumni`, { headers });

      if (compRes.ok) {
        const result = await compRes.json();
        setCompanies(result.success ? result.data : result);
      }
      if (jobRes.ok) {
        const result = await jobRes.json();
        setJobs(result.success ? result.data : result);
      }
      if (alumRes.ok) {
        const result = await alumRes.json();
        setAlumni(result.success ? result.data : result);
      }
    } catch (e) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'companies' ? `${API_BASE_URL}/api/companies` : (activeTab === 'jobs' ? `${API_BASE_URL}/api/job-posts` : `${API_BASE_URL}/api/alumni`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success("Successfully added record");
        setShowAddModal(false);
        setFormData({});
        fetchData();
      }
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Placement & Alumni</h1>
          <p className="text-slate-500 text-sm">Manage corporate relations, job openings, and graduate tracking.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('companies')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'companies' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Companies
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'jobs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Job Posts
        </button>
        <button 
          onClick={() => setActiveTab('alumni')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'alumni' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Alumni
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -10 }}
           className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {activeTab === 'companies' && companies.map((c) => (
             <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 transition shadow-sm">
                <div className="flex items-start justify-between">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Building2 className="w-6 h-6" />
                   </div>
                   <a href={c.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                      <ExternalLink className="w-5 h-5" />
                   </a>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{c.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{c.industry}</p>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{c.description}</p>
             </div>
          ))}

          {activeTab === 'jobs' && jobs.map((j) => (
             <div key={j.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 transition shadow-sm">
                <div className="flex items-start justify-between">
                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Briefcase className="w-6 h-6" />
                   </div>
                   <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${j.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {j.status}
                   </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{j.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{j.salary_range || 'Competitive'}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                   <span>Min Score: {j.min_score}</span>
                   <button 
                     onClick={() => {
                        toast.info("Filtering eligible students...");
                        window.location.href = `/dashboard/students?minScore=${j.min_score}`;
                     }}
                     className="text-indigo-600 hover:underline"
                   >
                     View Eligible
                   </button>
                </div>
             </div>
          ))}

          {activeTab === 'alumni' && alumni.map((a) => (
             <div key={a.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 transition shadow-sm">
                <div className="flex items-start justify-between">
                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <GraduationCap className="w-6 h-6" />
                   </div>
                   <span className="text-sm font-bold text-slate-400">Class of {a.graduation_year}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{a.role}</h3>
                <p className="text-sm text-emerald-600 font-bold">{a.company}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                   <DollarSign className="w-4 h-4" /> {a.salary}
                </div>
             </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Basic Add Modal (Conceptual for brevity) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Add {activeTab}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                 {activeTab === 'companies' && (
                    <>
                       <input type="text" placeholder="Company Name" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                       <input type="text" placeholder="Industry" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, industry: e.target.value})} />
                       <input type="text" placeholder="Website" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, website: e.target.value})} />
                    </>
                 )}
                 {activeTab === 'jobs' && (
                    <>
                       <input type="text" placeholder="Job Title" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" onChange={(e) => setFormData({...formData, title: e.target.value})} />
                       <input type="number" placeholder="Min Score Required" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, min_score: parseFloat(e.target.value)})} />
                       <textarea placeholder="Job Requirements" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, requirements: e.target.value})} />
                    </>
                 )}
                 {activeTab === 'alumni' && (
                    <>
                       <input type="text" placeholder="Company" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, company: e.target.value})} />
                       <input type="text" placeholder="Role" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, role: e.target.value})} />
                       <input type="number" placeholder="Graduation Year" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" onChange={(e) => setFormData({...formData, graduation_year: parseInt(e.target.value)})} />
                    </>
                 )}
                 <div className="flex gap-4 mt-6">
                    <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold">Save</button>
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-xl font-bold">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

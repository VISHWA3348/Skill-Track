import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Search, Filter, RefreshCw, Calculator, BookCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function AcademicConfigView() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filters, setFilters] = useState({ department_id: '', semester: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    department_id: '',
    semester: '1',
    subject_code: '',
    subject_name: '',
    credits: '4'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [deptRes, subjRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/departments`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/academic/subjects?department_id=${filters.department_id}&semester=${filters.semester}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        })
      ]);

      if (deptRes.ok) {
        const res = await deptRes.json();
        setDepartments(res.data || []);
      }
      if (subjRes.ok) {
        const res = await subjRes.json();
        setSubjects(res.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch configuration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/academic/subjects/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSubject)
      });

      if (res.ok) {
        toast.success("Subject added successfully");
        setShowAddModal(false);
        setNewSubject({ department_id: '', semester: '1', subject_code: '', subject_name: '', credits: '4' });
        fetchData();
      }
    } catch (e) {
      toast.error("Failed to add subject");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/academic/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success("Subject deleted");
        fetchData();
      }
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            Curriculum Configuration
          </h2>
          <p className="text-slate-500 mt-1">Define subjects, credits, and semester structures for your college.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Add New Subject
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Filter Department</label>
          <select 
            value={filters.department_id}
            onChange={(e) => setFilters({...filters, department_id: e.target.value})}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.department_id}>{d.name}</option>)}
          </select>
        </div>
        <div className="w-48">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Semester</label>
          <select 
            value={filters.semester}
            onChange={(e) => setFilters({...filters, semester: e.target.value})}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div className="flex items-end h-full pt-6">
          <button 
            onClick={() => fetchData()}
            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-8 py-5">Subject Details</th>
                <th className="px-6 py-5">Code</th>
                <th className="px-6 py-5 text-center">Semester</th>
                <th className="px-6 py-5 text-center">Credits</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                        <BookCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.subject_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.department_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                      {s.subject_code}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-slate-700">
                    Sem {s.semester}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black">
                      <Calculator className="w-3 h-3" /> {s.credits}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">No subjects found for this criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Plus className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Add New Subject</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddSubject} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Department</label>
                  <select 
                    required
                    value={newSubject.department_id}
                    onChange={(e) => setNewSubject({...newSubject, department_id: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.department_id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                    <select 
                      value={newSubject.semester}
                      onChange={(e) => setNewSubject({...newSubject, semester: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
                    >
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credits</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      max="10"
                      value={newSubject.credits}
                      onChange={(e) => setNewSubject({...newSubject, credits: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. CS6501"
                    value={newSubject.subject_code}
                    onChange={(e) => setNewSubject({...newSubject, subject_code: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Database Management Systems"
                    value={newSubject.subject_name}
                    onChange={(e) => setNewSubject({...newSubject, subject_name: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4"
                >
                  Save Subject Master
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

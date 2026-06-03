import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, MapPin, Users, Award, Shield, Trash2, Edit2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function CollegeManagement() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCollege, setNewCollege] = useState({ id: '', name: '', location: '', type: 'Engineering' });

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/colleges`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      if (result.success) setColleges(result.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch colleges");
    }
  };

  const handleAddCollege = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/colleges`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(newCollege)
      });
      const result = await res.json();
      if (result.success) {
        toast.success("College added successfully");
        setShowAddModal(false);
        fetchColleges();
      }
    } catch (error) {
      toast.error("Failed to add college");
    }
  };

  const filteredColleges = colleges.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search colleges by name or ID..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-4 h-4" />
          Add New College
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 animate-pulse h-48" />
          ))
        ) : filteredColleges.map((college) => (
          <div key={college.id} className="bg-white group rounded-3xl border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-100 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
              {college.name}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
              <MapPin className="w-3 h-3" /> {college.location} • ID: {college.id}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-500" /> {college.student_count || 0}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certificates</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-500" /> {college.cert_count || 0}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                college.status === 'suspended' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {college.status || 'Active'}
              </span>
              <button className="text-indigo-600 hover:underline text-xs font-bold flex items-center gap-1">
                View Reports <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Add New College</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">College ID</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. COL001"
                  value={newCollege.id}
                  onChange={(e) => setNewCollege({...newCollege, id: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">College Name</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. National Institute of Tech"
                  value={newCollege.name}
                  onChange={(e) => setNewCollege({...newCollege, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Location</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. New Delhi, India"
                  value={newCollege.location}
                  onChange={(e) => setNewCollege({...newCollege, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                <select 
                   className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={newCollege.type}
                   onChange={(e) => setNewCollege({...newCollege, type: e.target.value})}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Medical">Medical</option>
                  <option value="Arts & Science">Arts & Science</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCollege}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Create College
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

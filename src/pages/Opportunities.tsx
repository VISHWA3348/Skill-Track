import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, ExternalLink, MapPin, Briefcase, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Opportunity {
  id: string;
  title: string;
  company_name: string;
  type: string;
  required_skills: string;
  location: string;
  description: string;
  external_link: string;
  deadline: string;
  status: string;
  created_at: string;
  visibility_scope?: string;
  college_id?: string;
  created_by?: string;
  target_college_ids?: string;
}

const Opportunities: React.FC = () => {
  const { profile, isSuperAdmin, isAdmin, isStudent } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState('job');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [deadline, setDeadline] = useState('');

  const [visibilityScope, setVisibilityScope] = useState('GLOBAL');
  const [targetColleges, setTargetColleges] = useState<string[]>([]);
  const [collegesList, setCollegesList] = useState<any[]>([]);

  const [filterType, setFilterType] = useState('all');
  const [filterMode, setFilterMode] = useState<'all' | 'recommended'>('all');

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchColleges = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/public/colleges`);
          const data = await response.json();
          if (data.success) {
            setCollegesList(data.data);
          }
        } catch (e) {
          console.error('Failed to load colleges:', e);
        }
      };
      fetchColleges();
    }
  }, [isSuperAdmin]);

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data);
      }
    } catch (e) {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/opportunities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title, company_name: companyName, type, required_skills: requiredSkills,
          location, description, external_link: externalLink, deadline,
          visibility_scope: visibilityScope,
          target_college_ids: visibilityScope === 'SELECTED_COLLEGES' ? targetColleges : undefined
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Opportunity published successfully');
        setShowAddModal(false);
        fetchOpportunities();
        // Reset
        setTitle(''); setCompanyName(''); setType('job'); setRequiredSkills('');
        setLocation(''); setDescription(''); setExternalLink(''); setDeadline('');
        setVisibilityScope('GLOBAL'); setTargetColleges([]);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to add opportunity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this opportunity?")) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/opportunities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Deleted');
      fetchOpportunities();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  // Student Recommendation Logic
  const mySkills = profile?.skills ? profile.skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s) : [];

  const isMatch = (reqSkills: string) => {
    if (!reqSkills || mySkills.length === 0) return false;
    const req = reqSkills.split(',').map(s => s.trim().toLowerCase());
    return req.some(skill => mySkills.includes(skill));
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (filterType !== 'all' && opp.type !== filterType) return false;
    if (isStudent && filterMode === 'recommended') return isMatch(opp.required_skills);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Career Opportunities</h1>
          <p className="text-gray-600">Internships and Job placements.</p>
        </div>
        {(isSuperAdmin || isAdmin) && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>Post Opportunity</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Types</option>
          <option value="internship">Internships</option>
          <option value="job">Jobs</option>
        </select>

        {isStudent && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setFilterMode('all')}
              className={`px-4 py-1 text-sm rounded-md transition ${filterMode === 'all' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600'}`}
            >
              All Openings
            </button>
            <button 
              onClick={() => setFilterMode('recommended')}
              className={`px-4 py-1 text-sm rounded-md transition ${filterMode === 'recommended' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600'}`}
            >
              Recommended (Match)
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading opportunities...</p>
      ) : filteredOpportunities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No opportunities found.</p>
          {isStudent && filterMode === 'recommended' && (
            <p className="text-sm text-gray-400 mt-2">Try updating your skills in Settings.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map(opp => (
            <div key={opp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden flex flex-col">
              <div className="p-5 border-b flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${opp.type === 'job' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {opp.type}
                    </span>
                    {(isSuperAdmin || isAdmin) && opp.visibility_scope && opp.visibility_scope !== 'GLOBAL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        {opp.visibility_scope === 'COLLEGE_ONLY' ? 'College Only' : 'Selected Colleges'}
                      </span>
                    )}
                  </div>
                  {(isSuperAdmin || isAdmin) && (
                    <button onClick={() => handleDelete(opp.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{opp.title}</h3>
                <p className="text-gray-600 font-medium text-sm flex items-center gap-1"><Briefcase className="w-3.5 h-3.5"/> {opp.company_name}</p>
                
                <div className="mt-4 space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {opp.location}</div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> Deadline: {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}</div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Required Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {opp.required_skills.split(',').map((s, idx) => {
                      const skillObj = s.trim().toLowerCase();
                      const matched = isStudent && mySkills.includes(skillObj);
                      return (
                        <span key={idx} className={`text-xs px-2 py-0.5 rounded-full ${matched ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                          {s.trim()}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 flex items-center justify-between">
                {isStudent && isMatch(opp.required_skills) ? (
                  <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Great Match</span>
                ) : <span />}
                
                <a 
                  href={opp.external_link.startsWith('http') ? opp.external_link : `https://${opp.external_link}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  Apply Now <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Post New Opportunity</h2>
            </div>
            <form onSubmit={handleAddOpportunity} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white">
                    <option value="job">Full-time Job</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Remote, Bangalore" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma separated)</label>
                  <input type="text" value={requiredSkills} onChange={e => setRequiredSkills(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. React, Python, Data Analysis" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">External Apply Link</label>
                  <input type="text" required value={externalLink} onChange={e => setExternalLink(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>

                {/* Visibility Scope Controls */}
                {(isSuperAdmin || isAdmin) && (
                  <div className="col-span-2 mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visibility Scope</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility_scope"
                          value="GLOBAL"
                          checked={visibilityScope === 'GLOBAL'}
                          onChange={() => { setVisibilityScope('GLOBAL'); setTargetColleges([]); }}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Global (All Colleges)</span>
                      </label>

                      {isAdmin && !isSuperAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="visibility_scope"
                            value="COLLEGE_ONLY"
                            checked={visibilityScope === 'COLLEGE_ONLY'}
                            onChange={() => { setVisibilityScope('COLLEGE_ONLY'); setTargetColleges([]); }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">My College Only</span>
                        </label>
                      )}

                      {isSuperAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="visibility_scope"
                            value="SELECTED_COLLEGES"
                            checked={visibilityScope === 'SELECTED_COLLEGES'}
                            onChange={() => setVisibilityScope('SELECTED_COLLEGES')}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Selected Colleges</span>
                        </label>
                      )}
                    </div>

                    {isSuperAdmin && visibilityScope === 'SELECTED_COLLEGES' && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Select target colleges:</p>
                        {collegesList.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No colleges found.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {collegesList.map((college: any) => (
                              <label key={college.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1.5 rounded">
                                <input
                                  type="checkbox"
                                  checked={targetColleges.includes(college.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTargetColleges(prev => [...prev, college.id]);
                                    } else {
                                      setTargetColleges(prev => prev.filter(id => id !== college.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-700 truncate">{college.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {targetColleges.length > 0 && (
                          <p className="text-xs text-blue-600 font-medium mt-2">{targetColleges.length} college(s) selected</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="pt-4 mt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Opportunities;

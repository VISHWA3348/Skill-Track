import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, CheckCircle, XCircle, Calendar, Hash, Building2, BookOpen, UserCheck, Search, Filter, Loader2, QrCode, Key, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface SignupCode {
  id: string;
  code: string;
  college_id: string;
  college_name: string;
  department_id: string;
  department_name: string;
  batch_year: string;
  usage_limit: number;
  usage_count: number;
  expiry_date: string;
  is_active: number;
  role: string;
  created_at: string;
}

export default function SignupCodesManagement() {
  const [activeTab, setActiveTab] = useState<'legacy' | 'dept'>('dept');
  const [codes, setCodes] = useState<SignupCode[]>([]);
  const [deptCodes, setDeptCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(true);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [newCode, setNewCode] = useState({
    code: '',
    collegeId: '',
    departmentId: '',
    batchYear: '',
    usageLimit: 1,
    expiryDate: '',
    role: 'student'
  });

  const fetchCodes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/superadmin/signup-codes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) setCodes(result.data);
    } catch (error) {
      toast.error("Failed to fetch signup codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeptInviteCodes = async () => {
    try {
      setDeptLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/invite-codes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) setDeptCodes(result.data);
    } catch (error) {
      toast.error("Failed to fetch department invite codes");
    } finally {
      setDeptLoading(false);
    }
  };

  const fetchCollegesAndDepts = async () => {
    try {
      const colRes = await fetch(`${API_BASE_URL}/api/superadmin/colleges`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const colData = await colRes.json();
      if (colData.success) setColleges(colData.data);

      const deptRes = await fetch(`${API_BASE_URL}/api/public/departments`);
      const deptData = await deptRes.json();
      if (deptData.success) setDepartments(deptData.data);
    } catch (error) {}
  };

  useEffect(() => {
    fetchCodes();
    fetchDeptInviteCodes();
    fetchCollegesAndDepts();
  }, []);

  const handleRegenerateDeptCode = async (deptId: string, deptName: string) => {
    const yearOption = window.prompt(
      `Regenerate invite code for ${deptName}.\n\nEnter Academic Year (e.g., 'I Year', 'II Year', 'III Year', 'IV Year', 'I Year PG', 'II Year PG') or leave blank for a generic code:`
    );
    if (yearOption === null) return;

    let targetYear = yearOption.trim();
    if (targetYear) {
      const allowedYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'I Year PG', 'II Year PG'];
      if (!allowedYears.includes(targetYear)) {
        toast.error("Invalid academic year. Must be like 'I Year', 'II Year', etc.");
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/department/${deptId}/regenerate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ academicYear: targetYear || null })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`New code for ${deptName}: ${data.inviteCode}`);
        fetchDeptInviteCodes();
      } else {
        toast.error(data.error || 'Failed to regenerate');
      }
    } catch (e) {
      toast.error('Failed to regenerate invite code');
    }
  };

  const generateRandomCode = (collegeId: string, deptId: string, year: string) => {
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const collegePart = collegeId.substring(0, 3).toUpperCase();
    const deptPart = deptId.substring(0, 3).toUpperCase();
    const yearPart = year || new Date().getFullYear();
    setNewCode({ ...newCode, code: `${collegePart}-${deptPart}-${yearPart}-${random}` });
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/superadmin/signup-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCode)
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Signup code created successfully");
        setShowAddModal(false);
        fetchCodes();
        setNewCode({
          code: '',
          collegeId: '',
          departmentId: '',
          batchYear: '',
          usageLimit: 1,
          expiryDate: '',
          role: 'student'
        });
      } else {
        toast.error(result.error || "Failed to create code");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const toggleStatus = async (id: string, currentStatus: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/superadmin/signup-codes/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: currentStatus === 1 ? 0 : 1 })
      });
      if (response.ok) {
        toast.success("Status updated");
        fetchCodes();
      }
    } catch (error) {}
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this code?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/superadmin/signup-codes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        toast.success("Code deleted");
        fetchCodes();
      }
    } catch (error) {}
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Signup & Invite Codes
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage all department invite codes and legacy signup codes.</p>
        </div>
        {activeTab === 'legacy' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Generate New Code
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('dept')}
          className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === 'dept'
              ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Key className="w-4 h-4" />
          Department Invite Codes
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === 'legacy'
              ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Legacy Signup Codes
        </button>
      </div>

      {/* Department Invite Codes Tab */}
      {activeTab === 'dept' && (
        deptLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-900 font-bold border-b border-slate-100">
                  <th className="p-4 rounded-tl-xl">College</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Academic Year</th>
                  <th className="p-4">Invite Code</th>
                  <th className="p-4 text-center">Registrations</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deptCodes.map(dc => (
                  <tr key={dc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{dc.college_name || dc.college_id}</td>
                    <td className="p-4 text-slate-600">{dc.department_name || dc.department_id}</td>
                    <td className="p-4">
                      {dc.academic_year ? (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {dc.academic_year}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">All Years</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-indigo-50 px-2 py-1 rounded text-indigo-700 font-mono font-bold text-xs uppercase">
                          {dc.code}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(dc.code); toast.success('Code copied!'); }}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-bold text-slate-900">
                        {dc.current_registrations} / {dc.max_registrations === -1 ? '∞' : dc.max_registrations}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        dc.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {dc.is_active ? <><CheckCircle className="w-3 h-3" />Active</> : <><XCircle className="w-3 h-3" />Inactive</>}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">{new Date(dc.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRegenerateDeptCode(dc.department_id, dc.department_name || dc.department_id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Regenerate Invite Code"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deptCodes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-medium italic">
                      No department invite codes found. Create a department to auto-generate codes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Legacy Signup Codes Tab */}
      {activeTab === 'legacy' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-900 font-bold border-b border-slate-100">
                <th className="p-4 rounded-tl-xl">Code</th>
                <th className="p-4">College & Dept</th>
                <th className="p-4">Target</th>
                <th className="p-4 text-center">Usage</th>
                <th className="p-4">Expiry</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {codes.map(code => (
                <tr key={code.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-indigo-700 font-mono font-bold text-xs uppercase">
                        {code.code}
                      </code>
                      <button onClick={() => {
                        navigator.clipboard.writeText(code.code);
                        toast.success("Code copied!");
                      }} className="text-slate-400 hover:text-indigo-600">
                        <Hash className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{code.college_name}</span>
                      <span className="text-xs text-slate-500">{code.department_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="capitalize text-slate-700 font-medium">{code.role}</span>
                      {code.batch_year && <span className="text-xs text-slate-500">Batch: {code.batch_year}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-900">{code.usage_count} / {code.usage_limit === -1 ? '∞' : code.usage_limit}</span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full ${code.usage_limit !== -1 && code.usage_count >= code.usage_limit ? 'bg-red-500' : 'bg-indigo-500'}`}
                          style={{ width: `${code.usage_limit === -1 ? 0 : Math.min(100, (code.usage_count / code.usage_limit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {code.expiry_date ? (
                      <span className={`text-xs font-medium flex items-center gap-1 ${new Date(code.expiry_date) < new Date() ? 'text-red-600' : 'text-slate-600'}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(code.expiry_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-medium">No Expiry</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleStatus(code.id, code.is_active)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                        code.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {code.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View QR Code">
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteCode(code.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium italic">
                    No signup codes generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legacy codes table - wrapped in legacy tab condition */}
      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Generate Access Code</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateCode} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">College</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.collegeId}
                        onChange={(e) => setNewCode({ ...newCode, collegeId: e.target.value })}
                      >
                        <option value="">Select College</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Department</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.departmentId}
                        onChange={(e) => setNewCode({ ...newCode, departmentId: e.target.value })}
                      >
                        <option value="">Select Dept</option>
                        {departments.filter(d => d.college_id === newCode.collegeId || d.collegeId === newCode.collegeId).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Role</label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.role}
                        onChange={(e) => setNewCode({ ...newCode, role: e.target.value })}
                      >
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                        <option value="hod">HOD</option>
                        <option value="admin">College Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Batch / Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. 2026"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.batchYear}
                        onChange={(e) => setNewCode({ ...newCode, batchYear: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Secure Code</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="SSR-CSE-2026-X7A92"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.code}
                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <button 
                      type="button"
                      disabled={!newCode.collegeId || !newCode.departmentId}
                      onClick={() => generateRandomCode(newCode.collegeId, newCode.departmentId, newCode.batchYear)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usage Limit</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min="-1"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.usageLimit}
                        onChange={(e) => setNewCode({ ...newCode, usageLimit: parseInt(e.target.value) })}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1">Use -1 for unlimited usage.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Expiry Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={newCode.expiryDate}
                        onChange={(e) => setNewCode({ ...newCode, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-4"
                >
                  Confirm & Create Code
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

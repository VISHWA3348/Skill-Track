import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleApiError, OperationType, logAudit } from '../api/localApi';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from '../api/localApi';
import { Department } from '../types';
import { Network, Plus, X, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';

const Departments: React.FC = () => {
  const { profile, isSuperAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [academicYear, setAcademicYear] = useState('');

  const fetchInviteCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/invite-codes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInviteCodes(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch invite codes:', e);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchInviteCodes();
    }
  }, [profile, departments]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'departments'));
    if (!isSuperAdmin && profile.collegeId) {
      q = query(collection(db, 'departments'), where('collegeId', '==', profile.collegeId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDepts: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepts.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(fetchedDepts);
      setLoading(false);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'departments');
      setLoading(false);
    });

    // Fetch colleges for the dropdown
    const unsubColleges = onSnapshot(query(collection(db, 'colleges')), (snapshot) => {
      const fetchedColleges: any[] = [];
      snapshot.forEach((doc) => {
        fetchedColleges.push({ id: doc.id, ...doc.data() });
      });
      setColleges(fetchedColleges);
    });

    return () => {
      unsubscribe();
      unsubColleges();
    };
  }, [profile, isSuperAdmin]);

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setIsEditing(true);
      setEditingId(dept.id);
      setDepartmentId(dept.department_id || '');
      setName(dept.name || dept.department_name || '');
      setCollegeId(dept.collegeId || dept.college_id || '');
      setAcademicYear('');
    } else {
      setIsEditing(false);
      setEditingId(null);
      setDepartmentId('');
      setName('');
      setCollegeId(profile?.collegeId || '');
      setAcademicYear('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const deptData = {
        name,
        department_name: name,
        collegeId,
        college_id: collegeId,
        department_id: departmentId,
        academicYear: academicYear || null
      };
      
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'departments', editingId), deptData);
        await logAudit('Department Updated', `Updated department ${name} (${editingId})`, collegeId);
        toast.success('Department updated successfully');
      } else {
        // Use the user-provided departmentId as the unique document ID
        await setDoc(doc(db, 'departments', departmentId), { 
          ...deptData, 
          createdAt: new Date().toISOString() 
        });
        await logAudit('Department Created', `Created department ${name} (${departmentId})`, collegeId);
        toast.success('Department added successfully');
      }
      setShowModal(false);
    } catch (error) {
      handleApiError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'departments');
      toast.error('Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateCode = async (deptId: string, deptName: string) => {
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/department/${deptId}/regenerate-code`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ academicYear: targetYear || null })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`New code for ${deptName}: ${data.inviteCode}`);
        fetchInviteCodes();
      } else {
        toast.error(data.error || 'Failed to regenerate invite code');
      }
    } catch (e) {
      toast.error('Failed to regenerate invite code');
    }
  };

  const handleDelete = async (id: string, deptName: string, deptCollegeId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Department',
      message: `Are you sure you want to delete the ${deptName} department? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'departments', id));
          await logAudit('Department Deleted', `Deleted department ${deptName} (${id})`, deptCollegeId);
          toast.success('Department deleted successfully');
        } catch (error) {
          handleApiError(error, OperationType.DELETE, `departments/${id}`);
          toast.error('Failed to delete department');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold">Departments Management</h3>
        <button 
          type="button"
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No departments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College ID</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invite Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {departments.map((d) => {
                  const deptName = d.name || d.department_name || 'Unnamed Department';
                  const deptId = d.department_id || d.id || '-';
                  const collegeId = d.college_id || d.collegeId || '-';
                  const deptInviteCode = inviteCodes.find(
                    ic => ic.department_id === deptId || ic.departmentId === deptId || ic.id === deptId
                  );
                  return (
                    <tr key={d.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {deptId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <Network className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{deptName}</div>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {collegeId}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {deptInviteCode ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">
                              {deptInviteCode.code}
                            </span>
                            {deptInviteCode.academic_year && (
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {deptInviteCode.academic_year}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(deptInviteCode.code);
                                toast.success('Invite code copied!');
                              }}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                              title="Copy Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRegenerateCode(deptId, deptName)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                              title="Regenerate Invite Code"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Active Code</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleOpenModal(d)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button onClick={() => handleDelete(d.id, deptName, collegeId)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit Department' : 'Add Department'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department ID</label>
                <input 
                  type="text" 
                  required 
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invite Code Scope / Year (Optional)</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                  >
                    <option value="">All Years (Generic Code)</option>
                    <option value="I Year">I Year</option>
                    <option value="II Year">II Year</option>
                    <option value="III Year">III Year</option>
                    <option value="IV Year">IV Year</option>
                    <option value="I Year PG">I Year PG</option>
                    <option value="II Year PG">II Year PG</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">College ID</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Enter College ID"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  disabled={!isSuperAdmin}
                  readOnly={!isSuperAdmin}
                />
                {isSuperAdmin && (
                  <p className="mt-1 text-xs text-gray-400">Type the exact College ID to link this department.</p>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center space-x-3 text-amber-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;

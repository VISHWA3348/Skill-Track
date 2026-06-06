import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect, useRef } from 'react';
import { useVirtual } from '../hooks/useVirtual';
import { useAuth } from '../context/AuthContext';
import { db, auth, handleApiError, OperationType, collection, query, where, onSnapshot, getDocs } from '../api/localApi';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';
import { UserPlus, Shield, Building, GraduationCap, User, X, Upload, CheckCircle, XCircle, FileText } from 'lucide-react';
import * as xlsx from 'xlsx';

const Users: React.FC = () => {
  const { profile, hasPermission, isSuperAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customRoles, setCustomRoles] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
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

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [newCollegeId, setNewCollegeId] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newRollNo, setNewRollNo] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [newAssignedAcademicYear, setNewAssignedAcademicYear] = useState('');
  const [newSemester, setNewSemester] = useState('');

  // New hierarchy-specific fields
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newSubjectSpecialization, setNewSubjectSpecialization] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newAdmissionYear, setNewAdmissionYear] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');


  // Dropdown data
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filteredDepts, setFilteredDepts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch colleges
    const unsubColleges = onSnapshot(query(collection(db, 'colleges')), (snapshot) => {
      const fetchedColleges: any[] = [];
      snapshot.forEach((doc) => {
        fetchedColleges.push({ id: doc.id, ...doc.data() });
      });
      setColleges(fetchedColleges);
    });

    // Fetch departments
    const unsubDepts = onSnapshot(query(collection(db, 'departments')), (snapshot) => {
      const fetchedDepts: any[] = [];
      snapshot.forEach((doc) => {
        fetchedDepts.push({ id: doc.id, ...doc.data() });
      });
      setDepartments(fetchedDepts);
    });

    return () => {
      unsubColleges();
      unsubDepts();
    };
  }, []);

  useEffect(() => {
    if (newCollegeId) {
      setFilteredDepts(departments.filter(d => d.collegeId === newCollegeId || d.college_id === newCollegeId));
    } else {
      setFilteredDepts([]);
    }
  }, [newCollegeId, departments]);

  const fetchUsers = async () => {
    try {
      if (!profile) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      const users = result.success ? result.data : result;
      setUsers(users);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchUsers();
    const interval = setInterval(fetchUsers, 300000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const q = query(collection(db, 'roles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roles: {id: string, name: string}[] = [];
      snapshot.forEach((doc) => {
        roles.push({ id: doc.id, name: doc.data().name });
      });
      setCustomRoles(roles);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      handleOpenModal();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!hasPermission('users_manage')) {
    return (
      <div className="p-8 text-center text-red-600">
        Unauthorized. You do not have permission to manage users.
      </div>
    );
  }

  const handleOpenModal = (user?: UserProfile) => {
    if (user) {
      setIsEditing(true);
      setEditingUserId(user.uid);
      setNewName(user.name);
      setNewEmail(user.email);
      setNewPassword(''); // Don't populate password
      setNewRole(user.role);
      setNewDepartmentId(user.departmentId || '');
      setNewCollegeId(user.collegeId || '');
      setNewYear(user.year || '');
      setNewRollNo(user.rollNo || '');
      setNewClass(user.class || '');
      setNewSection(user.section || '');
      setNewPhoneNumber(user.phoneNumber || (user as any).phone || (user as any).phone_number || '');
      setNewAcademicYear(user.academicYear || user.academic_year || '');
      setNewAssignedAcademicYear(user.assignedAcademicYear || user.assigned_academic_year || '');
      setNewSemester((user as any).semester || '');
      
      // Load editing user fields
      setNewEmployeeId(user.employeeId || '');
      setNewDesignation(user.designation || '');
      setNewSubjectSpecialization(user.subjectSpecialization || '');
      setNewGender(user.gender || '');
      setNewDateOfBirth(user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '');
      setNewBatch(user.batch || '');
      setNewAdmissionYear(user.admissionYear || '');
      setNewCollegeCode(user.collegeCode || '');
    } else {
      setIsEditing(false);
      setEditingUserId(null);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      // Set default role based on permissions
      if (isSuperAdmin) setNewRole('admin');
      else if (isAdmin) setNewRole('hod');
      else if (profile?.role === 'hod') setNewRole('staff');
      else setNewRole('student');
      
      setNewDepartmentId(profile?.departmentId || '');
      setNewCollegeId(profile?.collegeId || '');
      setNewYear('');
      setNewRollNo('');
      setNewClass('');
      setNewSection('');
      setNewPhoneNumber('');
      setNewAcademicYear('');
      setNewAssignedAcademicYear('');
      setNewSemester('');
      
      // Reset fields
      setNewEmployeeId('');
      setNewDesignation('');
      setNewSubjectSpecialization('');
      setNewGender('');
      setNewDateOfBirth('');
      setNewBatch('');
      setNewAdmissionYear('');
      setNewCollegeCode('');
    }
    setError('');
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setError('');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      const endpoint = isEditing ? `${API_BASE_URL}/api/admin/users/${editingUserId}` : `${API_BASE_URL}/api/admin/users`;
      const method = isEditing ? 'PUT' : 'POST';
      
      let body: any = {
        name: newName,
        role: newRole,
        collegeId: newCollegeId || profile.collegeId,
        phoneNumber: newPhoneNumber || undefined,
        employeeId: newEmployeeId || undefined,
        designation: newDesignation || undefined,
        subjectSpecialization: newSubjectSpecialization || undefined,
        gender: newGender || undefined,
        dateOfBirth: newDateOfBirth || undefined,
        batch: newBatch || undefined,
        admissionYear: newAdmissionYear || undefined,
        collegeCode: newCollegeCode || undefined
      };
      
      if (newRole !== 'super_admin' && newRole !== 'admin') {
        body.departmentId = newDepartmentId || undefined;
      }
      
      if (newRole === 'student') {
        body.year = newYear || undefined;
        body.rollNo = newRollNo || undefined;
        body.class = newClass || undefined;
        body.section = newSection || undefined;
        body.academicYear = newAcademicYear || undefined;
        body.semester = newSemester ? parseInt(newSemester, 10) : undefined;
      }

      if (newRole === 'staff') {
        body.academicYear = newAcademicYear || undefined;
        body.semester = newSemester ? parseInt(newSemester, 10) : undefined;
        body.assignedAcademicYear = newAcademicYear || undefined;
      }

      if (!isEditing) {
        body.email = newEmail;
        body.password = newPassword;
      } else if (newPassword) {
        body.password = newPassword;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} user`);
      }
      
      // Reset and Close
      setShowAddModal(false);
      setNewYear('');
      setNewRollNo('');
      setNewClass('');
      setNewSection('');
      setNewPhoneNumber('');
      setNewAcademicYear('');
      setNewAssignedAcademicYear('');
      setNewSemester('');
      setNewEmployeeId('');
      setNewDesignation('');
      setNewSubjectSpecialization('');
      setNewGender('');
      setNewDateOfBirth('');
      setNewBatch('');
      setNewAdmissionYear('');
      setNewCollegeCode('');
      setIsEditing(false);
      setEditingUserId(null);
      fetchUsers();
    } catch (err: any) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} user:`, err);
      setError(err.message || `Failed to ${isEditing ? 'update' : 'add'} user.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'admin': return <Building className="w-4 h-4 text-blue-500" />;
      case 'hod': return <GraduationCap className="w-4 h-4 text-purple-500" />;
      case 'staff': return <User className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleDeleteUser = (uid: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/admin/users/${uid}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) {
            throw new Error('Failed to delete user');
          }
          toast.success('User deleted successfully');
          fetchUsers();
        } catch (err) {
          console.error("Error deleting user:", err);
          toast.error("Failed to delete user.");
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleStatusChange = (uid: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    setConfirmModal({
      isOpen: true,
      title: `${newStatus === 'suspended' ? 'Suspend' : 'Activate'} User`,
      message: `Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/admin/users/${uid}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
          });
          if (!response.ok) {
            throw new Error('Failed to update user status');
          }
          toast.success(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
          fetchUsers();
        } catch (err) {
          console.error("Error updating user status:", err);
          toast.error("Failed to update user status.");
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkImport = async (file?: File) => {
    if (!profile) return;
    
    setError('');
    setIsSubmitting(true);
    try {
      let usersToImport: any[] = [];

      if (file) {
        // Handle Excel/CSV file upload
        const reader = new FileReader();
        const data = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result);
          reader.onerror = (e) => reject(e);
          reader.readAsBinaryString(file);
        });

        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        usersToImport = xlsx.utils.sheet_to_json(sheet);
      } else {
        // Handle CSV text
        const rows = bulkData.split('\n').map(row => row.trim()).filter(row => row);
        if (rows.length < 2) throw new Error("Please provide header and at least one data row.");
        
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
        usersToImport = rows.slice(1).map(row => {
          const values = row.split(',').map(v => v.trim());
          const userObj: any = {};
          headers.forEach((header, index) => {
            userObj[header] = values[index];
          });
          return userObj;
        });
      }

      // Normalize fields
      usersToImport = usersToImport.map(u => ({
        ...u,
        name: u.name || u.Name,
        email: u.email || u.Email,
        role: (u.role || u.Role || 'student').toLowerCase(),
        collegeId: u.collegeid || u.collegeId || profile.collegeId,
        departmentId: u.departmentid || u.departmentId || null,
        rollNo: u.rollno || u.rollNo || null,
        class: u.class || null,
        year: u.year || null,
        academicYear: u.academicyear || u.academicYear || null,
        assignedAcademicYear: u.assignedacademicyear || u.assignedAcademicYear || null
      }));

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ users: usersToImport })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import users');
      }
      
      const responseData = await response.json();
      const result = responseData.success ? responseData : { success: true, results: responseData };
      const successCount = result.results.filter((r: any) => r.status === 'success').length;
      toast.success(`Successfully imported ${successCount} users.`);
      
      setShowBulkModal(false);
      setBulkData('');
      fetchUsers();
    } catch (err: any) {
      console.error("Bulk import error:", err);
      setError(err.message || "Failed to import users.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (u.rollNo && u.rollNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const { startIndex, endIndex, topPadding, bottomPadding } = useVirtual({
    itemCount: filteredUsers.length,
    rowHeight: 70,
    containerRef: tbodyRef,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold">User Management</h3>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">College Admin</option>
            <option value="hod">HOD</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </select>
          {hasPermission('students_import') && (
            <button 
              onClick={() => setShowBulkModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk Import</span>
            </button>
          )}
          <button
            onClick={() => fetchUsers()}
            className="flex items-center justify-center p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
            title="Refresh Users List"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 21v-5h-.581m0 0a8.003 8.003 0 01-15.357-2" />
            </svg>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef} className="bg-white divide-y divide-gray-200">
              {topPadding > 0 && (
                <tr>
                  <td colSpan={5} style={{ height: `${topPadding}px`, border: 'none' }} />
                </tr>
              )}
              {filteredUsers.slice(startIndex, endIndex).map((u) => (
                <tr key={u.uid}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      {u.status === 'suspended' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    {u.rollNo && <div className="text-xs text-gray-500">Roll No: {u.rollNo}</div>}
                    {u.class && <div className="text-xs text-gray-500">Degree: {u.class}</div>}
                    {(u.academicYear || u.academic_year) && <div className="text-xs text-indigo-600 font-medium">Academic Year: {u.academicYear || u.academic_year}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{u.email}</div>
                    {u.phoneNumber && <div className="text-xs">{u.phoneNumber}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(u.role)}
                      <span className="text-sm text-gray-900 capitalize">{(u.role || "").replace('_', ' ')}</span>
                    </div>
                    {u.year && <div className="text-xs text-gray-500">Year: {u.year}</div>}
                    {u.role === 'staff' && (u.assignedAcademicYear || u.assigned_academic_year) && <div className="text-xs text-green-600 font-medium">Responsibility: {u.assignedAcademicYear || u.assigned_academic_year}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{u.departmentId || '-'}</div>
                    {u.collegeName && <div className="text-xs">{u.collegeName}</div>}
                    {u.city && <div className="text-xs">{u.city}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleOpenModal(u)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button 
                      onClick={() => handleStatusChange(u.uid, u.status)}
                      className={`${u.status === 'suspended' ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'} mr-3`}
                    >
                      {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.uid)}
                      className={`text-red-600 hover:text-red-900 ${u.uid === profile?.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={u.uid === profile?.uid}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {bottomPadding > 0 && (
                <tr>
                  <td colSpan={5} style={{ height: `${bottomPadding}px`, border: 'none' }} />
                </tr>
              )}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input 
                  type="text" 
                  required 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" 
                  required={!isEditing}
                  disabled={isEditing}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100 disabled:text-gray-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password {isEditing && <span className="text-xs text-gray-500 font-normal">(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  required={!isEditing}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input 
                  type="text" 
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  disabled={isEditing && !isSuperAdmin && !isAdmin}
                >
                  {isSuperAdmin && (
                    <>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">College Admin</option>
                      <option value="hod">HOD</option>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <option value="admin">College Admin</option>
                      <option value="hod">HOD</option>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                    </>
                  )}
                  {profile?.role === 'hod' && (
                    <>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                    </>
                  )}
                  {profile?.role === 'staff' && (
                    <>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                    </>
                  )}
                </select>
              </div>
              {/* College Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 font-bold mb-1">College *</label>
                <select 
                  required 
                  value={newCollegeId}
                  onChange={(e) => {
                    setNewCollegeId(e.target.value);
                    setNewDepartmentId('');
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                  disabled={!isSuperAdmin}
                >
                  <option value="">Select College</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.college_id || c.id}>{c.name || c.college_name}</option>
                  ))}
                </select>
              </div>

              {/* College Code (For College Admin only) */}
              {newRole === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-bold mb-1">College Code</label>
                  <input 
                    type="text" 
                    value={newCollegeCode}
                    onChange={(e) => setNewCollegeCode(e.target.value)}
                    placeholder="e.g. CAMPUS-01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  />
                </div>
              )}

              {/* Department Selection (For HOD, Staff, Student) */}
              {['hod', 'staff', 'student'].includes(newRole) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Department *</label>
                  <select 
                    required
                    value={newDepartmentId}
                    onChange={(e) => setNewDepartmentId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                    disabled={!newCollegeId || (profile?.role === 'hod' && !isSuperAdmin && !isAdmin)}
                  >
                    <option value="">Select Department</option>
                    {filteredDepts.map(d => (
                      <option key={d.id} value={d.department_id || d.id}>{d.name || d.department_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Employee ID & Designation (For HOD, Staff, and College Admin designation is optional) */}
              {['admin', 'hod', 'staff'].includes(newRole) && (
                <div className="grid grid-cols-2 gap-4">
                  {['hod', 'staff'].includes(newRole) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Employee ID *</label>
                      <input 
                        type="text" 
                        required
                        value={newEmployeeId}
                        onChange={(e) => setNewEmployeeId(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">
                      Designation {['hod', 'staff'].includes(newRole) ? '*' : ''}
                    </label>
                    <input 
                      type="text" 
                      required={['hod', 'staff'].includes(newRole)}
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      placeholder={newRole === 'admin' ? 'e.g. Chief Administrator' : 'e.g. Assistant Professor'}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                    />
                  </div>
                </div>
              )}

              {/* Joining Date & Subject Specialization */}
              {['hod', 'staff'].includes(newRole) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Joining Date</label>
                    <input 
                      type="date" 
                      value={newDateOfBirth /* reuse dob for simple mapping or load properly */}
                      onChange={(e) => setNewDateOfBirth(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                    />
                  </div>
                  {newRole === 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Subject Specialization</label>
                      <input 
                        type="text" 
                        value={newSubjectSpecialization}
                        onChange={(e) => setNewSubjectSpecialization(e.target.value)}
                        placeholder="e.g. Machine Learning"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Academic Year & Semester (For Staff and Student) */}
              {['staff', 'student'].includes(newRole) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Academic Year *</label>
                    <select
                      required
                      value={newAcademicYear}
                      onChange={(e) => setNewAcademicYear(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                    >
                      <option value="">Select Academic Year</option>
                      {['I Year', 'II Year', 'III Year', 'IV Year', '2023-2027', '2024-2028', '2025-2029', '2026-2030'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Semester *</label>
                    <select
                      required
                      value={newSemester}
                      onChange={(e) => setNewSemester(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                    >
                      <option value="">Select Semester</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Student Academic Info */}
              {newRole === 'student' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Roll Number *</label>
                      <input 
                        type="text" 
                        required
                        value={newRollNo}
                        onChange={(e) => setNewRollNo(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Degree *</label>
                      <input 
                        type="text" 
                        required
                        value={newClass}
                        onChange={(e) => setNewClass(e.target.value)}
                        placeholder="e.g. B.E. CSE"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Section *</label>
                      <input 
                        type="text" 
                        required
                        value={newSection}
                        onChange={(e) => setNewSection(e.target.value)}
                        placeholder="e.g. A"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Gender</label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={newDateOfBirth}
                        onChange={(e) => setNewDateOfBirth(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Batch</label>
                      <input 
                        type="text" 
                        value={newBatch}
                        onChange={(e) => setNewBatch(e.target.value)}
                        placeholder="e.g. 2024-2028"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bold mb-1">Admission Year</label>
                      <input 
                        type="text" 
                        value={newAdmissionYear}
                        onChange={(e) => setNewAdmissionYear(e.target.value)}
                        placeholder="e.g. 2024"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Bulk Import Users</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">
                {error}
              </div>
            )}

            <div className="mb-4 text-sm text-gray-600">
              <p>Upload an Excel (.xlsx) file or paste CSV data below.</p>
              <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl text-center">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  id="bulk-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkImport(file);
                  }}
                />
                <label htmlFor="bulk-file-input" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-blue-600 font-bold hover:underline">Click to upload Excel/CSV</span>
                  <span className="text-xs text-gray-400 mt-1">First row must be header: name, email, role...</span>
                </label>
              </div>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">OR PASTE CSV</span></div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleBulkImport(); }} className="space-y-4">
              <div>
                <textarea 
                  required={!bulkData}
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm h-48" 
                  placeholder="name,email,role,password&#10;John Doe,john@example.com,student,password123"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowBulkModal(false)} 
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 font-bold"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-bold"
                  disabled={isSubmitting || !bulkData}
                >
                  {isSubmitting ? 'Importing...' : 'Import from Text'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

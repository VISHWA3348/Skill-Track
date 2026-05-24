import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';
import { UserPlus, Shield, Building, GraduationCap, User, X, Upload } from 'lucide-react';

const Users: React.FC = () => {
  const { profile, hasPermission, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
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
  const [newDepartment, setNewDepartment] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended'>('active');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users');
      // Backend returns { users: [...] }
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchUsers();
    }
  }, [profile]);

  if (!hasPermission('users_manage')) {
    return (
      <div className="p-8 text-center text-red-600">
        Unauthorized. You do not have permission to manage users.
      </div>
    );
  }

  const handleOpenModal = (user?: any) => {
    if (user) {
      setIsEditing(true);
      setEditingUserId(user.id);
      setNewName(user.name);
      setNewEmail(user.email);
      setNewPassword(''); 
      setNewRole(user.role);
      setNewDepartment(user.department || '');
      setNewStatus(user.status || 'active');
    } else {
      setIsEditing(false);
      setEditingUserId(null);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('staff');
      setNewDepartment('');
      setNewStatus('active');
    }
    setError('');
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const body: any = {
        name: newName,
        email: newEmail,
        role: newRole,
        department: newDepartment,
        status: newStatus
      };

      if (newPassword) body.password = newPassword;

      if (isEditing) {
        await api.put(`/users/${editingUserId}`, body);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', body);
        toast.success('User added successfully');
      }
      
      setShowAddModal(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'admin': return <Building className="w-4 h-4 text-blue-500" />;
      case 'hod': return <GraduationCap className="w-4 h-4 text-purple-500" />;
      case 'staff': return <User className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleDeleteUser = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          toast.success('User deleted successfully');
          fetchUsers();
        } catch (err: any) {
          console.error("Error deleting user:", err);
          toast.error("Failed to delete user.");
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const rows = bulkData.split('\n').map(row => row.trim()).filter(row => row);
      if (rows.length < 2) throw new Error("Please provide header and at least one data row.");
      
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const usersToImport = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const userObj: any = {};
        headers.forEach((header, index) => {
          userObj[header] = values[index];
        });
        return userObj;
      });

      await api.post('/admin/users/bulk', { users: usersToImport }); // Note: Need to implement in backend or adjust endpoint
      toast.success('Bulk import successful');
      setShowBulkModal(false);
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
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">User Management</h3>
        <div className="flex space-x-3">
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">College Admin</option>
            <option value="hod">HOD</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </select>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((u: any) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {u.status || 'active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(u.role)}
                      <span className="text-sm text-gray-900 capitalize">{u.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.department || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleOpenModal(u)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            
            {error && <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">{error}</div>}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" required={!isEditing} disabled={isEditing} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password {isEditing && '(leave blank to keep current)'}</label>
                <input type="password" required={!isEditing} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                  <option value="admin">College Admin</option>
                  <option value="hod">HOD</option>
                  <option value="staff">Staff</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input type="text" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded text-gray-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400">
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-gray-700">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

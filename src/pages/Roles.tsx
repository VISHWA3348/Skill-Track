import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleApiError, OperationType } from '../api/localApi';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../api/localApi';
import { Shield, Plus, X, Check, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: any;
}

const PERMISSION_GROUPS = [
  {
    name: 'Certificates',
    permissions: [
      { id: 'certificates_view', label: 'View Certificates' },
      { id: 'certificates_upload', label: 'Upload Certificates' },
      { id: 'certificates_review', label: 'Review Certificates (Staff)' },
      { id: 'certificates_approve', label: 'Approve Certificates (HOD)' },
      { id: 'certificates_verify', label: 'Verify Certificates (Admin)' },
      { id: 'certificates_delete', label: 'Delete Certificates' },
    ]
  },
  {
    name: 'Career Activities',
    permissions: [
      { id: 'activities_view', label: 'View Career Activities' },
      { id: 'activities_create', label: 'Create Career Activities' },
      { id: 'activities_approve', label: 'Approve Career Activities' },
      { id: 'activities_delete', label: 'Delete Career Activities' },
    ]
  },
  {
    name: 'Students',
    permissions: [
      { id: 'students_view', label: 'View Students' },
      { id: 'students_manage', label: 'Manage Students (CRUD)' },
      { id: 'students_import', label: 'Bulk Import Students' },
    ]
  },
  {
    name: 'System',
    permissions: [
      { id: 'users_manage', label: 'Manage Users & Roles' },
      { id: 'reports_view', label: 'View Advanced Reports' },
      { id: 'settings_manage', label: 'Manage System Settings' },
      { id: 'audit_logs_view', label: 'View Audit Logs' },
      { id: 'db_backup_restore', label: 'Database Backup & Restore' },
    ]
  }
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions);

const Roles: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!isSuperAdmin) return;

    const q = query(collection(db, 'roles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRoles: CustomRole[] = [];
      snapshot.forEach((doc) => {
        fetchedRoles.push({ id: doc.id, ...doc.data() } as CustomRole);
      });
      setRoles(fetchedRoles);
      setLoading(false);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'roles');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-red-600">
        Unauthorized. Only Super Admins can manage custom roles.
      </div>
    );
  }

  const handleOpenModal = (role?: CustomRole) => {
    if (role) {
      setIsEditing(true);
      setRoleId(role.id);
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setSelectedPermissions(role.permissions || []);
    } else {
      setIsEditing(false);
      setRoleId('');
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
    }
    setShowModal(true);
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;

    setIsSubmitting(true);
    try {
      const id = isEditing ? roleId : (roleName || "").toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      await setDoc(doc(db, 'roles', id), {
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions,
        createdAt: isEditing ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(isEditing ? 'Role updated successfully' : 'Role created successfully');
      setShowModal(false);
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error("Failed to save role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'roles', id));
          toast.success('Role deleted successfully');
        } catch (error) {
          console.error("Error deleting role:", error);
          toast.error("Failed to delete role.");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold">Role & Permission Management</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Built-in Roles (Read-only representation) */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-red-500" />
            <h4 className="text-lg font-bold text-gray-900">Super Admin</h4>
          </div>
          <p className="text-sm text-gray-600 mb-4">Full system access. Cannot be modified.</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">All Permissions</span>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h4 className="text-lg font-bold text-gray-900">Admin</h4>
          </div>
          <p className="text-sm text-gray-600 mb-4">College-level administration. Cannot be modified.</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">Manage College Users</span>
            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">View College Reports</span>
          </div>
        </div>

        {/* Custom Roles */}
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">Loading roles...</div>
        ) : (
          roles.map(role => (
            <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <h4 className="text-lg font-bold text-gray-900">{role.name}</h4>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleOpenModal(role)} className="text-gray-400 hover:text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteRole(role.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden">{role.description}</p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map(p => {
                  const perm = ALL_PERMISSIONS.find(ap => ap.id === p);
                  return (
                    <span key={p} className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 text-xs rounded-full">
                      {perm ? perm.label : p}
                    </span>
                  );
                })}
                {role.permissions.length === 0 && (
                  <span className="text-xs text-gray-400 italic">No permissions assigned</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit Role' : 'Create Custom Role'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveRole} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Role Name</label>
                  <input 
                    type="text" 
                    required 
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                    placeholder="e.g., Placement Coordinator"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea 
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions by Module</label>
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.name} className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{group.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.permissions.map(perm => (
                        <div 
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPermissions.includes(perm.id) 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                            selectedPermissions.includes(perm.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {selectedPermissions.includes(perm.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-gray-700">{perm.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
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
                  {isSubmitting ? 'Saving...' : 'Save Role'}
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

export default Roles;

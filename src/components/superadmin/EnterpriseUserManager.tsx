import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Shield, UserX, UserCheck, MoreVertical, Mail, Building2, MapPin, Filter, Download, Key, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function EnterpriseUserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/superadmin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      if (result.success) setUsers(result.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const handleUpdateStatus = async (uid: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${uid}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`User ${status === 'active' ? 'activated' : 'suspended'} successfully`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const handleForceLogout = async (uid: string) => {
    try {
      const res = await fetch(`/api/superadmin/users/${uid}/force-logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) toast.success("User forced to logout");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const filteredUsers = users.filter(u => 
    (roleFilter === 'all' || u.role === roleFilter) &&
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="staff">Staff</option>
            <option value="hod">HODs</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 text-sm font-bold">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-100 text-sm font-bold hover:bg-indigo-700">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-100">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">College / Dept</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Login</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               [1, 2, 3, 4, 5].map(i => (
                 <tr key={i} className="animate-pulse">
                   <td colSpan={6} className="p-8 h-16 bg-slate-50/50" />
                 </tr>
               ))
            ) : filteredUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      {user.name?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'super_admin' ? 'bg-purple-50 text-purple-600' :
                    user.role === 'admin' ? 'bg-blue-50 text-blue-600' :
                    user.role === 'hod' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>
                    {user.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {user.college_name || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-400">{user.department_id || 'N/A'}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.status === 'suspended' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {user.status || 'Active'}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-500">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    {user.status === 'suspended' ? (
                      <button 
                        onClick={() => handleUpdateStatus(user.uid, 'active')}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Activate User"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(user.uid, 'suspended')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Suspend User"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Reset Password">
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleForceLogout(user.uid)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                      title="Force Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

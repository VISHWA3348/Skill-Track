import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db, logAudit, handleApiError, OperationType } from '../api/localApi';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from '../api/localApi';
import { Briefcase, Plus, Search, Edit2, Trash2, X, Save, Building2, Clock, Info, GraduationCap, Globe, Users, User, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createNotification } from '../services/notificationService';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

interface CareerActivity {
  docId: string;
  studentId: string;
  userId: string;
  collegeId: string;
  departmentId: string;
  type: 'Internship' | 'Workshop' | 'Online Course' | 'Project';
  organization: string;
  duration: string;
  details: string;
  status: 'pending' | 'staff_reviewed' | 'hod_approved' | 'approved' | 'rejected';
  timestamp: any;
}

interface Student {
  uid: string;
  rollNo: string;
  name: string;
}

export default function CareerActivityModule() {
  const { profile, hasPermission, isStudent, isStaff, isHOD, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [activities, setActivities] = useState<CareerActivity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CareerActivity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [formData, setFormData] = useState<{
    studentId: string;
    type: 'Internship' | 'Workshop' | 'Online Course' | 'Project';
    organization: string;
    duration: string;
    details: string;
  }>({
    studentId: '',
    type: 'Internship',
    organization: '',
    duration: '',
    details: ''
  });

  useEffect(() => {
    if (!profile) return;

    let qActivities = query(collection(db, 'careerActivities'));
    let qStudents = query(collection(db, 'users'), where('role', '==', 'student'));

    if (profile?.role !== 'super_admin' && profile?.collegeId) {
      if (isStudent) {
        qActivities = query(collection(db, 'careerActivities'), where('userId', '==', profile.uid));
      } else {
        qActivities = query(collection(db, 'careerActivities'), where('collegeId', '==', profile.collegeId));
        qStudents = query(collection(db, 'users'), where('role', '==', 'student'), where('collegeId', '==', profile.collegeId));
        
        if (isHOD || isStaff) {
          qActivities = query(qActivities, where('departmentId', '==', profile.departmentId));
          qStudents = query(qStudents, where('departmentId', '==', profile.departmentId));
        }
      }
    }

    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(doc => ({ ...doc.data(), docId: doc.id })) as CareerActivity[]);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'careerActivities');
    });

    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(doc => ({ 
        uid: doc.id, 
        rollNo: doc.data().rollNo || '', 
        name: doc.data().name 
      })));
    }, (error) => {
      handleApiError(error, OperationType.GET, 'users');
    });

    return () => { unsubActivities(); unsubStudents(); };
  }, [profile, isStudent, isStaff, isHOD, isAdmin]);

  useEffect(() => {
    if (location.state?.openAdd && hasPermission('activities_create')) {
      setEditingActivity(null);
      setFormData({ 
        studentId: isStudent ? profile?.uid || '' : '', 
        type: 'Internship', 
        organization: '', 
        duration: '', 
        details: '' 
      });
      setIsModalOpen(true);
      // Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, hasPermission, profile, isStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedStudent = students.find(s => s.uid === formData.studentId);
      
      const activityData = { 
        ...formData, 
        collegeId: profile?.collegeId || '',
        departmentId: profile?.departmentId || '',
        userId: isStudent ? profile?.uid : formData.studentId
      };
      if (editingActivity) {
        await updateDoc(doc(db, 'careerActivities', editingActivity.docId), activityData as any);
        await logAudit('Career Activity Updated', `Updated career activity for student ${formData.studentId}`, profile?.collegeId);
        toast.success('Activity updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'careerActivities'), { 
          ...activityData, 
          status: 'pending',
          timestamp: serverTimestamp()
        });
        await logAudit('Career Activity Created', `Created career activity for student ${formData.studentId} (${docRef.id})`, profile?.collegeId);
        toast.success('Activity submitted for approval');
      }
      setIsModalOpen(false);
      setEditingActivity(null);
      setFormData({ studentId: '', type: 'Internship', organization: '', duration: '', details: '' });
    } catch (error) {
      handleApiError(error, editingActivity ? OperationType.UPDATE : OperationType.CREATE, 'careerActivities');
    }
  };

  const handleStatusUpdate = async (docId: string, newStatus: string, studentId: string, activityType: string, organization: string) => {
    try {
      const idToken = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/career-activities/${docId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      // Send notification to student
      await createNotification(
        studentId,
        `Career Activity ${newStatus === 'rejected' ? 'Rejected' : 'Updated'}`,
        `Your career activity "${activityType}" at "${organization}" has been ${(newStatus || "").replace('_', ' ')}.`,
        newStatus === 'rejected' ? 'error' : 'success'
      );

      await logAudit('Career Activity Status Updated', `Updated status to ${newStatus} for activity ${docId}`, profile?.collegeId);
      toast.success(`Activity ${(newStatus || "").replace('_', ' ')}`);
    } catch (error: any) {
      handleApiError(error, OperationType.UPDATE, `careerActivities/${docId}`);
      toast.error(error.message);
    }
  };

  const handleEdit = (activity: CareerActivity) => {
    setEditingActivity(activity);
    setFormData({
      studentId: activity.studentId,
      type: activity.type,
      organization: activity.organization,
      duration: activity.duration,
      details: activity.details
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (docId: string, studentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Activity',
      message: 'Are you sure you want to delete this activity? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'careerActivities', docId));
          await logAudit('Career Activity Deleted', `Deleted career activity for student ${studentId} (${docId})`, profile?.collegeId);
          toast.success("Activity deleted successfully");
        } catch (error) {
          handleApiError(error, OperationType.DELETE, `careerActivities/${docId}`);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredActivities = activities.filter(a => {
    const orgMatch = a.organization?.toLowerCase().includes(searchQuery.toLowerCase());
    const studentMatch = a.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = a.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const student = students.find(s => s.uid === a.studentId);
    const studentNameMatch = student?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return orgMatch || studentMatch || typeMatch || studentNameMatch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Internship': return Building2;
      case 'Workshop': return GraduationCap;
      case 'Online Course': return Globe;
      case 'Project': return Briefcase;
      default: return Info;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Internship': return 'text-blue-600 bg-blue-50';
      case 'Workshop': return 'text-orange-600 bg-orange-50';
      case 'Online Course': return 'text-emerald-600 bg-emerald-50';
      case 'Project': return 'text-purple-600 bg-purple-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'staff_reviewed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Career Activities</h1>
          <p className="text-slate-500">Monitor internships, workshops, and projects.</p>
        </div>
        {hasPermission('activities_create') && (
          <button 
            onClick={() => {
              setEditingActivity(null);
              setFormData({ studentId: isStudent ? profile?.uid || '' : '', type: 'Internship', organization: '', duration: '', details: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus className="w-5 h-5" />
            Add Activity
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by organization or type..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {filteredActivities.map((activity) => {
            const Icon = getTypeIcon(activity.type);
            const colors = getTypeColor(activity.type);
            return (
              <motion.div 
                key={activity.docId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-6 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${colors} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${getStatusBadge(activity.status || 'pending')}`}>
                      {(activity.status || 'pending').replace('_', ' ')}
                    </span>
                    <div className="flex gap-1">
                      {hasPermission('activities_approve') && activity.status === 'pending' && (
                        <button 
                          onClick={() => handleStatusUpdate(activity.docId, 'staff_reviewed', activity.studentId, activity.type, activity.organization)} 
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg" 
                          title="Mark as Reviewed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('activities_approve') && activity.status === 'staff_reviewed' && (
                        <button 
                          onClick={() => handleStatusUpdate(activity.docId, 'hod_approved', activity.studentId, activity.type, activity.organization)} 
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg" 
                          title="HOD Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('activities_approve') && (activity.status === 'hod_approved' || (activity.status === 'staff_reviewed' && !isHOD)) && (
                        <button 
                          onClick={() => handleStatusUpdate(activity.docId, 'approved', activity.studentId, activity.type, activity.organization)} 
                          className="p-1 text-green-600 hover:bg-green-50 rounded-lg" 
                          title="Final Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {isSuperAdmin && activity.status === 'rejected' && (
                        <button 
                          onClick={() => handleStatusUpdate(activity.docId, 'approved', activity.studentId, activity.type, activity.organization)} 
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg font-semibold text-xs flex items-center gap-1" 
                          title="Override & Approve"
                        >
                          <CheckCircle className="w-3 h-3" /> Override
                        </button>
                      )}
                      {hasPermission('activities_approve') && (activity.status === 'pending' || activity.status === 'staff_reviewed' || activity.status === 'hod_approved') && (
                        <button 
                          onClick={() => handleStatusUpdate(activity.docId, 'rejected', activity.studentId, activity.type, activity.organization)} 
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg" 
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${colors}`}>
                    {activity.type}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{activity.organization}</h3>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                      <User className="w-4 h-4" />
                      <span>{students.find(s => s.uid === activity.studentId)?.name || 'Unknown Student'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Student ID: <span className="font-mono font-semibold">{students.find(s => s.uid === activity.studentId)?.rollNo || activity.studentId}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Duration: {activity.duration}</span>
                  </div>
                  {activity.details && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="line-clamp-2">{activity.details}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-auto flex justify-end gap-1">
                    {((hasPermission('activities_create') && activity.status === 'pending') || hasPermission('activities_delete')) && (
                      <>
                        {hasPermission('activities_create') && activity.status === 'pending' && (
                          <button onClick={() => handleEdit(activity)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('activities_delete') && (
                          <button onClick={() => handleDelete(activity.docId, activity.studentId)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                </div>
              </motion.div>
            );
          })}
        </div>
        {filteredActivities.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            No activities found.
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingActivity ? 'Edit Activity' : 'Add Activity'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Student</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.studentId}
                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                    disabled={isStudent}
                  >
                    <option value="">Select a student...</option>
                    {students.map(s => (
                      <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo || s.uid})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Activity Type</label>
                    <select 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="Internship">Internship</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Online Course">Online Course</option>
                      <option value="Project">Project</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Organization / Platform</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={formData.organization}
                      onChange={(e) => setFormData({...formData, organization: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Duration</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g., 2 months, 40 hours"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Additional Details / Links</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    value={formData.details}
                    onChange={(e) => setFormData({...formData, details: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {editingActivity ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
}

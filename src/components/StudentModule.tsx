import React, { useState, useEffect } from 'react';
import { db, storage, logAudit } from '../api/localApi';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from '../api/localApi';
import { ref, uploadBytes, getDownloadURL } from '../api/localApi';
import { Users, Plus, Search, Edit2, Trash2, X, Save, UserPlus, Eye, Mail, GraduationCap, Building2, Hash, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleApiError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';

interface Student {
  id: string;
  docId: string;
  name: string;
  department: string;
  year: string;
  contact: string;
  password?: string;
  photoURL?: string;
}

export default function StudentModule() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    department: '',
    year: '',
    contact: '',
    password: '',
    photoURL: ''
  });

  useEffect(() => {
    let q = query(collection(db, 'students'), orderBy('name'));
    if (profile?.role === 'hod' && profile?.departmentId) {
      q = query(collection(db, 'students'), where('departmentId', '==', profile.departmentId), orderBy('name'));
    } else if (profile?.role !== 'super_admin' && profile?.collegeId) {
      q = query(collection(db, 'students'), where('collegeId', '==', profile.collegeId), orderBy('name'));
    }
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      })) as Student[];
      setStudents(data);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'students');
    });
    return () => unsubscribe();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentData = { ...formData, collegeId: profile?.collegeId || '' };
      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.docId), studentData);
        await logAudit('Student Updated', `Updated student ${formData.name} (${editingStudent.docId})`, profile?.collegeId);
      } else {
        const docRef = await addDoc(collection(db, 'students'), studentData);
        await logAudit('Student Created', `Created student ${formData.name} (${docRef.id})`, profile?.collegeId);
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      setFormData({ id: '', name: '', department: '', year: '', contact: '', password: '', photoURL: '' });
    } catch (error) {
      handleApiError(error, editingStudent ? OperationType.UPDATE : OperationType.CREATE, 'students');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      id: student.id,
      name: student.name,
      department: student.department,
      year: student.year,
      contact: student.contact,
      password: student.password || '',
      photoURL: student.photoURL || ''
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!studentToDelete) return;
    try {
      await deleteDoc(doc(db, 'students', studentToDelete.docId));
      await logAudit('Student Deleted', `Deleted student ${studentToDelete.name} (${studentToDelete.docId})`, profile?.collegeId);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      handleApiError(error, OperationType.DELETE, `students/${studentToDelete.docId}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `students/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, photoURL: url }));
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploading(false);
    }
  };

  const uniqueDepartments = Array.from(new Set(students.map(s => s.department))).filter(Boolean);
  const uniqueYears = Array.from(new Set(students.map(s => s.year))).filter(Boolean);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment ? s.department === filterDepartment : true;
    const matchesYear = filterYear ? s.year === filterYear : true;
    return matchesSearch && matchesDepartment && matchesYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Student Management</h1>
          <p className="text-slate-500">Manage student records and academic information.</p>
        </div>
        <button 
          onClick={() => {
            setEditingStudent(null);
            setFormData({ id: '', name: '', department: '', year: '', contact: '', password: '', photoURL: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <UserPlus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by name or ID..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white min-w-[150px]"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white min-w-[150px]"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Year</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.docId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{student.id}</td>
                  <td className="px-6 py-4 text-slate-600">{student.department}</td>
                  <td className="px-6 py-4 text-slate-600">{student.year}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => setSelectedStudent(student)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(student)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {profile?.role !== 'staff' && (
                      <button 
                        onClick={() => confirmDelete(student)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No students found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">Student Details</h2>
                <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-lg">
                    {selectedStudent.photoURL ? (
                      <img src={selectedStudent.photoURL} alt={selectedStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-slate-500">{selectedStudent.department}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <Hash className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student ID</p>
                      <p className="font-mono text-slate-900">{selectedStudent.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</p>
                      <p className="text-slate-900">{selectedStudent.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <GraduationCap className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Year of Study</p>
                      <p className="text-slate-900">{selectedStudent.year}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Info</p>
                      <p className="text-slate-900">{selectedStudent.contact || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-full bg-slate-900 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-800 transition-all mt-4"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                      {formData.photoURL ? (
                        <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera className="w-8 h-8 text-slate-400" />
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-all">
                      <Plus className="w-4 h-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Upload Profile Picture</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Student ID</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.id}
                      onChange={(e) => setFormData({...formData, id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Department</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Year of Study</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Contact Details</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
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
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {editingStudent ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Confirm Delete</h2>
              <p className="text-slate-500 mb-8">Are you sure you want to delete this student? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

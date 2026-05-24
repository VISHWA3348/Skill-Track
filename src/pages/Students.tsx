import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleApiError, OperationType, storage } from '../api/localApi';
import { collection, query, where, onSnapshot, doc, updateDoc } from '../api/localApi';
import { ref, uploadBytes, getDownloadURL } from '../api/localApi';
import { UserProfile } from '../types';
import { Search, Filter, User, Mail, Hash, BookOpen, Edit2, CheckCircle, XCircle, Phone, MapPin, Calendar, Upload, X, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../api/localApi';
import { motion, AnimatePresence } from 'framer-motion';
import AcademicProfileView from '../components/AcademicProfileView';

const Students: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    rollNo: '',
    year: '',
    section: ''
  });
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [viewingStudent, setViewingStudent] = useState<UserProfile | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [viewingAcademicProfile, setViewingAcademicProfile] = useState<UserProfile | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // The backend already handles data isolation based on profile role, collegeId and departmentId
    // via queryDocuments and getDataIsolationFilters. 
    // We just need to query for students.
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setStudents(studentData);
      setLoading(false);
    }, (error) => {
      console.error("Snapshot error:", error);
      handleApiError(error, OperationType.GET, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const uniqueDepartments = Array.from(new Set(students.map(s => s.departmentId).filter(Boolean)));

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.uid.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === 'all' || student.year === selectedYear;
    const matchesDepartment = selectedDepartment === 'all' || student.departmentId === selectedDepartment;
    
    return matchesSearch && matchesYear && matchesDepartment;
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size exceeds 2MB limit.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      let finalPhotoUrl = '';

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newStudent.email,
          password: newStudentPassword,
          name: newStudent.name,
          role: 'student',
          collegeId: profile.collegeId,
          departmentId: profile.departmentId,
          rollNo: newStudent.rollNo,
          year: newStudent.year,
          section: newStudent.section
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create student');
      }

      const result = await response.json();

      if (photoFile) {
        const photoRef = ref(storage, `profiles/${result.uid}/${Date.now()}_${photoFile.name}`);
        const uploadResult = await uploadBytes(photoRef, photoFile);
        finalPhotoUrl = await getDownloadURL(uploadResult.ref);

        const studentRef = doc(db, 'users', result.uid);
        await updateDoc(studentRef, {
          photoUrl: finalPhotoUrl
        });
      }

      toast.success("Student added successfully.");
      setShowAddModal(false);
      setNewStudent({ name: '', email: '', rollNo: '', year: '', section: '' });
      setNewStudentPassword('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error: any) {
      console.error("Error adding student:", error);
      toast.error(error.message || "Failed to add student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsSubmitting(true);
    try {
      let finalPhotoUrl = editingStudent.photoUrl;

      if (photoFile) {
        const photoRef = ref(storage, `profiles/${editingStudent.uid}/${Date.now()}_${photoFile.name}`);
        const uploadResult = await uploadBytes(photoRef, photoFile);
        finalPhotoUrl = await getDownloadURL(uploadResult.ref);
      }

      const studentRef = doc(db, 'users', editingStudent.uid);
      await updateDoc(studentRef, {
        name: editingStudent.name,
        email: editingStudent.email,
        rollNo: editingStudent.rollNo,
        year: editingStudent.year,
        section: editingStudent.section,
        phoneNumber: editingStudent.phoneNumber || editingStudent.phone,
        ...(finalPhotoUrl && { photoUrl: finalPhotoUrl })
      });
      toast.success("Student details updated successfully.");
      setEditingStudent(null);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setBulkErrors([]);
    setIsSubmitting(true);
    try {
      const rows = bulkData.split('\n').map(row => row.trim()).filter(row => row);
      if (rows.length < 2) {
        setBulkErrors(["Please provide header and at least one data row."]);
        setIsSubmitting(false);
        return;
      }
      
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const emails = new Set();
      const rollNos = new Set();
      const errors: string[] = [];
      
      const studentsToImport = rows.slice(1).map((row, rowIndex) => {
        const values = row.split(',').map(v => v.trim());
        const studentObj: any = {};
        headers.forEach((header, index) => {
          studentObj[header] = values[index];
        });
        
        if (!studentObj.email || !studentObj.name) {
          errors.push(`Row ${rowIndex + 2}: Missing required fields (email, name).`);
          return null;
        }

        if (emails.has(studentObj.email)) {
          errors.push(`Row ${rowIndex + 2}: Duplicate email found in CSV (${studentObj.email}).`);
        }
        emails.add(studentObj.email);

        if (studentObj.rollNo) {
          if (rollNos.has(studentObj.rollNo)) {
            errors.push(`Row ${rowIndex + 2}: Duplicate Roll Number found in CSV (${studentObj.rollNo}).`);
          }
          rollNos.add(studentObj.rollNo);
        }
        
        studentObj.role = 'student';
        studentObj.collegeId = profile.collegeId;
        studentObj.departmentId = profile.departmentId;
        
        return studentObj;
      }).filter(Boolean);

      if (errors.length > 0) {
        setBulkErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ users: studentsToImport })
      });

      if (!response.ok) {
        const data = await response.json();
        setBulkErrors([data.error || 'Failed to import students']);
        setIsSubmitting(false);
        return;
      }
      
      const result = await response.json();
      const successCount = result.results.filter((r: any) => r.status === 'success').length;
      toast.success(`Successfully imported ${successCount} students.`);
      
      setShowBulkModal(false);
      setBulkData('');
    } catch (err: any) {
      console.error("Bulk import error:", err);
      setBulkErrors([err instanceof Error ? err.message : "Failed to import students."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Students</h2>
          <p className="text-gray-500">Manage and view students of {profile?.departmentId}</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setNewStudent({ name: '', email: '', rollNo: '', year: '', section: '' });
                setNewStudentPassword('');
                setPhotoFile(null);
                setPhotoPreview(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              <User className="w-4 h-4" />
              Add Student
            </button>
            <button 
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, ID, roll no, or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && uniqueDepartments.length > 0 && (
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Student</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Roll No</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Department</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Year/Section</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {(filteredStudents || []).map((student) => (
                <tr key={student.uid} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center overflow-hidden shrink-0">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{student.name}</span>
                        <span className="text-xs text-gray-500">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 font-mono">{student.rollNo || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{student.departmentId || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {student.year ? `Year ${student.year}` : '-'} {student.section ? `| Sec ${student.section}` : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${student.status === 'suspended' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {student.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                    <button 
                      onClick={() => setViewingAcademicProfile(student)}
                      className="text-blue-600 hover:text-blue-900 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      Academic Record
                    </button>
                    <button 
                      onClick={() => window.open(`/resume/${student.uid}`, '_blank')}
                      className="text-green-600 hover:text-green-900 font-bold text-xs uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      View Resume
                    </button>
                    <button 
                      onClick={() => setEditingStudent(student)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Edit Student"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-gray-500">No students found matching your criteria.</div>
          )}
          </div>
        </div>
      )}

      {viewingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="relative h-32 bg-indigo-600">
              <button 
                onClick={() => setViewingStudent(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors z-10"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-2xl shadow-lg">
                <div className="w-24 h-24 bg-indigo-50 rounded-xl flex items-center justify-center overflow-hidden">
                  {viewingStudent.photoUrl ? (
                    <img 
                      src={viewingStudent.photoUrl} 
                      alt={viewingStudent.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-12 h-12 text-indigo-300" />
                  )}
                </div>
              </div>
            </div>

            <div className="pt-16 p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{viewingStudent.name}</h3>
                <p className="text-indigo-600 font-medium">Student Profile</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student ID (Roll No)</label>
                    <div className="flex items-center mt-1 text-gray-700 font-medium">
                      <Hash className="w-4 h-4 mr-2 text-indigo-400" />
                      {viewingStudent.rollNo || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">System ID</label>
                    <div className="flex items-center mt-1 text-gray-500 text-xs font-mono">
                      {viewingStudent.uid}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Department</label>
                    <div className="flex items-center mt-1 text-gray-700 font-medium">
                      <BookOpen className="w-4 h-4 mr-2 text-indigo-400" />
                      {viewingStudent.departmentId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Year & Section</label>
                    <div className="flex items-center mt-1 text-gray-700 font-medium">
                      <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                      Year {viewingStudent.year || '-'} | Section {viewingStudent.section || '-'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</label>
                    <div className="flex items-center mt-1 text-gray-700 font-medium">
                      <Mail className="w-4 h-4 mr-2 text-indigo-400" />
                      {viewingStudent.email}
                    </div>
                    {viewingStudent.phoneNumber && (
                      <div className="flex items-center mt-1 text-gray-700 font-medium">
                        <Phone className="w-4 h-4 mr-2 text-indigo-400" />
                        {viewingStudent.phoneNumber}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</label>
                    <div className="flex items-center mt-1 text-gray-700 font-medium">
                      <MapPin className="w-4 h-4 mr-2 text-indigo-400" />
                      {viewingStudent.city || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                    <div className="flex items-center mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${viewingStudent.status === 'suspended' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {viewingStudent.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingStudent.photoUrl && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Profile Photo URL</label>
                  <code className="block p-2 bg-gray-50 rounded text-xs text-gray-500 break-all">
                    {viewingStudent.photoUrl}
                  </code>
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 mb-2">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">Click to upload photo (Max 2MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newStudent.rollNo || ''}
                  onChange={(e) => setNewStudent({...newStudent, rollNo: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={newStudent.year || ''}
                    onChange={(e) => setNewStudent({...newStudent, year: e.target.value})}
                  >
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={newStudent.section || ''}
                    onChange={(e) => setNewStudent({...newStudent, section: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-indigo-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Student Details</h3>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 mb-2">
                  {photoPreview || editingStudent.photoUrl ? (
                    <img 
                      src={photoPreview || editingStudent.photoUrl} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">Click to upload photo (Max 2MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={editingStudent.phoneNumber || editingStudent.phone || ''}
                  onChange={(e) => setEditingStudent({...editingStudent, phoneNumber: e.target.value, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={editingStudent.rollNo || ''}
                  onChange={(e) => setEditingStudent({...editingStudent, rollNo: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={editingStudent.year || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, year: e.target.value})}
                  >
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={editingStudent.section || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, section: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-indigo-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Bulk Upload Students</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {bulkErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <XCircle className="w-4 h-4" />
                  Please fix the following errors:
                </div>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  {bulkErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-800 font-medium mb-2">Instructions:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Paste CSV data below. The first row must be the header.</li>
                <li>Required columns: <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">email</code></li>
                <li>Optional columns: <code className="bg-blue-100 px-1 rounded">rollNo</code>, <code className="bg-blue-100 px-1 rounded">year</code>, <code className="bg-blue-100 px-1 rounded">section</code>, <code className="bg-blue-100 px-1 rounded">password</code></li>
                <li>Students will be automatically assigned to your department.</li>
              </ul>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <textarea 
                  required 
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                  placeholder="name,email,rollNo,year,section&#10;John Doe,john@example.com,20CS001,3,A&#10;Jane Smith,jane@example.com,20CS002,3,B"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowBulkModal(false)} 
                  className="px-6 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 shadow-lg shadow-indigo-100"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Uploading...' : 'Start Upload'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Students;

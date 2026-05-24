import React, { useState, useEffect } from 'react';
import { db, handleApiError, OperationType, logAudit } from '../api/localApi';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from '../api/localApi';
import { College } from '../types';
import { Building2, Plus, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Colleges: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [type, setType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    const unsubscribe = onSnapshot(collection(db, 'colleges'), (snapshot) => {
      const fetchedColleges: College[] = [];
      snapshot.forEach((doc) => {
        fetchedColleges.push({ id: doc.id, ...doc.data() } as College);
      });
      setColleges(fetchedColleges);
      setLoading(false);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'colleges');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (college?: College) => {
    if (college) {
      setIsEditing(true);
      setEditingId(college.id);
      setName(college.name || college.college_name || '');
      setLocation(college.location);
      setCollegeId(college.college_id || college.id || '');
      setCity(college.city || '');
      setState(college.state || '');
      setCountry(college.country || '');
      setPincode(college.pincode || '');
      setType(college.type || '');
    } else {
      setIsEditing(false);
      setEditingId(null);
      setName('');
      setLocation('');
      setCollegeId('');
      setCity('');
      setState('');
      setCountry('');
      setPincode('');
      setType('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const collegeData = { 
        name, 
        college_name: name,
        location, 
        college_id: collegeId,
        type,
        city,
        state,
        country,
        pincode
      };
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'colleges', editingId), collegeData);
        await logAudit('College Updated', `Updated college ${name} (${editingId})`);
        toast.success('College updated successfully');
      } else {
        // Use the user-provided collegeId as the unique document ID
        await setDoc(doc(db, 'colleges', collegeId), { 
          ...collegeData, 
          createdAt: new Date().toISOString() 
        });
        await logAudit('College Created', `Created college ${name} (${collegeId})`);
        toast.success('College added successfully');
      }
      setShowModal(false);
    } catch (error) {
      handleApiError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'colleges');
      toast.error('Failed to save college');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, collegeName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete College',
      message: `Are you sure you want to delete ${collegeName}? This action cannot be undone and may affect associated departments and users.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'colleges', id));
          await logAudit('College Deleted', `Deleted college ${collegeName} (${id})`);
          toast.success('College deleted successfully');
        } catch (error) {
          handleApiError(error, OperationType.DELETE, `colleges/${id}`);
          toast.error('Failed to delete college');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredColleges = colleges.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const name = (c.name || c.college_name || '').toLowerCase();
    const loc = (c.location || '').toLowerCase();
    const id = (c.college_id || c.id || '').toLowerCase();
    return name.includes(searchLower) || loc.includes(searchLower) || id.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold">Colleges Management</h3>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search colleges..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add College</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading colleges...</div>
        ) : colleges.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No colleges found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location / City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State / Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredColleges.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {c.college_id || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{c.name || c.college_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                      {(c as any).type || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{c.location}</div>
                    <div className="text-xs text-blue-600">{c.city} {c.pincode ? `- ${c.pincode}` : ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{c.state}</div>
                    <div className="text-xs">{c.country}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleOpenModal(c)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit College' : 'Add College'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">College ID</label>
                <input 
                  type="text" 
                  required 
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">College Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">College Type</label>
                <input 
                  type="text" 
                  placeholder="e.g. Engineering, Medical, Arts"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input 
                  type="text" 
                  required 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input 
                    type="text" 
                    required 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pincode</label>
                  <input 
                    type="text" 
                    required 
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input 
                    type="text" 
                    required 
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input 
                    type="text" 
                    required 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  />
                </div>
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
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add College')}
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

export default Colleges;

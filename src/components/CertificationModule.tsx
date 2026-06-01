import React, { useState, useEffect, useRef } from 'react';
import { db, logAudit, handleApiError, OperationType, auth } from '../api/localApi';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, where } from '../api/localApi';
import { Award, Plus, Search, Edit2, Trash2, X, Save, FileUp, ExternalLink, Calendar, MapPin, MapPinOff, Trophy, Users, User, AlertTriangle, ShieldCheck, Loader2, CheckCircle2, Camera as CameraIcon, Crop as CropIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import exifr from 'exifr';
import Cropper from 'react-cropper';
// import '@cropper/elements/dist/cropper.css';

interface Certification {
  docId: string;
  studentId: string;
  eventName: string;
  level: string;
  position: string;
  participationType: string;
  date: string;
  fileUrl: string;
  fraudFlag?: boolean;
  fraudReason?: string;
  gpsVerified?: boolean;
  certificate_file?: string;
  photo_file?: string;
  is_deleted?: boolean;
}

interface Student {
  id: string;
  name: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function CertificationModule() {
  const { profile } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    studentId: '',
    eventName: '',
    level: '',
    position: '',
    participationType: '',
    date: '',
    fileUrl: '', // legacy
    certificate_file: '',
    photo_file: '',
  });

  // Advanced Upload States
  const [uploadTab, setUploadTab] = useState<'cert' | 'camera'>('cert');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [metadataExtracted, setMetadataExtracted] = useState({ fraudFlag: false, fraudReason: '', gpsLat: null as number | null, gpsLng: null as number | null });

  // Camera & Crop
  const videoRef = useRef<HTMLVideoElement>(null);
  const cropperRef = useRef<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchCerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/certifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCertifications(data.filter((c: any) => !c.is_deleted));
      }
    } catch (err) {
      console.error("Error fetching certs:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users?role=student', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.map((u: any) => ({ id: u.uid, name: u.name })));
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchCerts();
    fetchStudents();
    const interval = setInterval(() => {
      fetchCerts();
    }, 300000);
    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, [profile]);

  // Clean up camera on tab switch or modal close
  useEffect(() => {
    if (uploadTab !== 'camera' || !isModalOpen) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [uploadTab, isModalOpen]);

  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (err) {
      toast.error('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg'));
      setIsCropping(true);
      stopCamera();
    }
  };

  const cropImage = () => {
    if (cropperRef.current) {
      cropperRef.current.cropper.getCroppedCanvas().toBlob((blob: Blob) => {
        setCroppedBlob(blob);
        setIsCropping(false);
      }, 'image/jpeg');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCroppedBlob(null);
    setIsCropping(false);
    startCamera();
  };

  const extractGPSData = async (fileOrBlob: File | Blob) => {
    let fraudFlag = false;
    let fraudReason = '';
    let gpsLat = null;
    let gpsLng = null;
    try {
      const metadata = await exifr.parse(fileOrBlob);
      if (metadata) {
        if (metadata.Software && (metadata.Software.toLowerCase().includes('photoshop') || metadata.Software.toLowerCase().includes('gimp'))) {
          fraudFlag = true;
          fraudReason = `Potential edit detected: ${metadata.Software}`;
        }
        if (metadata.latitude && metadata.longitude) {
          gpsLat = metadata.latitude;
          gpsLng = metadata.longitude;
        }
      }
    } catch (err) {
      // no exif
    }
    setMetadataExtracted({ fraudFlag, fraudReason, gpsLat, gpsLng });
  };

  const handleCertificateSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertificateFile(file);
    if (errors.certificateFile) setErrors(prev => { const { certificateFile, ...rest } = prev; return rest; });
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setCertPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      await extractGPSData(file);
    } else {
       setCertPreview(null);
       setMetadataExtracted({ fraudFlag: false, fraudReason: '', gpsLat: null, gpsLng: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.studentId) newErrors.studentId = 'Student ID is required';
    if (!formData.eventName) newErrors.eventName = 'Event Name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.participationType) newErrors.participationType = 'Participation Type is required';
    if (!certificateFile && !croppedBlob && !editingCert) newErrors.certificateFile = 'Certificate or Photo is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    
    try {
      const fd = new FormData();
      if (certificateFile) fd.append('certificate', certificateFile);
      if (croppedBlob) fd.append('photo', croppedBlob, 'photo.jpg');

      fd.append('studentId', formData.studentId);
      fd.append('eventName', formData.eventName);
      fd.append('level', formData.level);
      fd.append('position', formData.position);
      fd.append('participationType', formData.participationType);
      fd.append('date', formData.date);

      // We handle editing logic by possibly not uploading new files. 
      // The API endpoint handles this by merging or we just use setDocument internally via API.
      // Wait, if it's an edit, we might just update via Firebase if no files, or call /api/upload.
      // Easiest is to always call POST /api/upload if there are new files, otherwise just updateDoc.
      
      const token = localStorage.getItem('token') || '';

      if (certificateFile || croppedBlob) {
        // Evaluate GPS distance based on browser and EXIF
        const isWinnerOrRunnerUp = formData.position.toLowerCase().includes('winner') || 
                                   formData.position.toLowerCase().includes('runner-up') ||
                                   formData.position.toLowerCase().includes('1st') ||
                                   formData.position.toLowerCase().includes('2nd');
                                   
        let finalFraud = metadataExtracted.fraudFlag;
        let finalReason = metadataExtracted.fraudReason;
        
        if (isWinnerOrRunnerUp && metadataExtracted.gpsLat && metadataExtracted.gpsLng) {
          try {
            const browserPos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
            const distance = calculateDistance(metadataExtracted.gpsLat, metadataExtracted.gpsLng, browserPos.coords.latitude, browserPos.coords.longitude);
            if (distance > 5) {
              finalFraud = true;
              finalReason = `${finalReason ? finalReason + '. ' : ''}GPS Mismatch: Location is ${distance.toFixed(2)}km away.`;
            }
          } catch(e) { /* ignore */ }
        } else if (isWinnerOrRunnerUp && !metadataExtracted.gpsLat) {
           finalFraud = true;
           finalReason = `${finalReason ? finalReason + '. ' : ''}GPS Verification Failed: Image has no GPS metadata.`;
        }

        fd.append('fraudFlag', String(finalFraud));
        fd.append('fraudReason', finalReason);
        if (metadataExtracted.gpsLat) fd.append('gps_lat', String(metadataExtracted.gpsLat));
        if (metadataExtracted.gpsLng) fd.append('gps_lng', String(metadataExtracted.gpsLng));

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        
        // If editing, we could delete old or just overwrite. The API generates a new ID if we use /api/upload without passing ID.
        // Wait, the API endpoint generates a new ID ALWAYS! We need to pass the docId to overwrite!
        // To keep it simple, if editing, and we upload new files, we can just delete the old one or update it.
        // Let's modify the code so that if we are editing and NOT uploading a new file, we do it via Firestore.
        // If we are uploading a new file, we do it via /api/upload and pass ID ? Wait, `server/api.ts` hardcodes `cert_${Date.now()}`.
        // If editingCert exists and we have files, the API creates a new one. We can delete the old one.
        if (editingCert) {
          await deleteDoc(doc(db, 'certifications', editingCert.docId));
        }

        await logAudit(editingCert ? 'Certification Updated' : 'Certification Created', `Action for student ${formData.studentId}`, profile?.collegeId);
        toast.success(editingCert ? "Certification updated successfully" : "Certification added successfully");
      } else {
        // No new files, just update metadata via Firestore
        if (editingCert) {
          await updateDoc(doc(db, 'certifications', editingCert.docId), {
            studentId: formData.studentId,
            eventName: formData.eventName,
            level: formData.level,
            position: formData.position,
            participationType: formData.participationType,
            date: formData.date
          });
          await logAudit('Certification Updated', `Updated certification metadata ${formData.eventName}`, profile?.collegeId);
          toast.success("Certification updated successfully");
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save certification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingCert(null);
    setFormData({ studentId: '', eventName: '', level: '', position: '', participationType: '', date: '', fileUrl: '', certificate_file: '', photo_file: '' });
    setCertificateFile(null);
    setCertPreview(null);
    setCapturedImage(null);
    setCroppedBlob(null);
    setIsCropping(false);
    setErrors({});
    stopCamera();
    setUploadTab('cert');
  };

  const handleEdit = (cert: Certification) => {
    resetForm();
    setEditingCert(cert);
    setFormData({
      studentId: cert.studentId,
      eventName: cert.eventName,
      level: cert.level,
      position: cert.position,
      participationType: cert.participationType || '',
      date: cert.date,
      fileUrl: cert.fileUrl,
      certificate_file: cert.certificate_file || '',
      photo_file: cert.photo_file || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (docId: string, studentId: string, eventName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Certification',
      message: `Are you sure you want to delete the certification for "${eventName}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'certifications', docId));
          await logAudit('Certification Deleted', `Deleted certification ${eventName} for student ${studentId}`, profile?.collegeId);
          toast.success("Certification deleted successfully");
        } catch (error) {
          handleApiError(error, OperationType.DELETE, `certifications/${docId}`);
          toast.error("Failed to delete certification");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredCerts = certifications.filter(c => {
    const eventMatch = c.eventName?.toLowerCase().includes(searchQuery.toLowerCase());
    const studentMatch = c.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
    const student = students.find(s => s.id === c.studentId);
    const studentNameMatch = student?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return eventMatch || studentMatch || studentNameMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Certifications</h1>
          <p className="text-slate-500">Track and verify achievements.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
        >
          <Plus className="w-5 h-5" /> Add Certification
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" placeholder="Search by event or student ID..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {filteredCerts.map((cert) => (
            <motion.div key={cert.docId} layout className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  {cert.fraudFlag ? (
                    <div className="bg-red-50 px-2 py-1 rounded-lg text-red-600 flex items-center gap-1 border border-red-200" title={cert.fraudReason}>
                      <AlertTriangle className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">Flagged</span>
                    </div>
                  ) : cert.gpsVerified ? (
                    <div className="bg-emerald-50 px-2 py-1 rounded-lg text-emerald-600 flex items-center gap-1 border border-emerald-200">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Verified</span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 px-2 py-1 rounded-lg text-slate-600 flex items-center gap-1 border border-slate-200">
                      <MapPinOff className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Unverified</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cert)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cert.docId, cert.studentId, cert.eventName)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">{cert.eventName}</h3>
              <p className="text-sm font-semibold text-blue-600 flex items-center gap-2 mb-4"><User className="w-4 h-4" /> {students.find(s => s.id === cert.studentId)?.name || 'Unknown Student'}</p>

              <div className="space-y-2 mb-6 text-sm text-slate-600">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> <span>{cert.level} Level</span></div>
                <div className="flex items-center gap-2"><Award className="w-4 h-4" /> <span>Position: {cert.position}</span></div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> <span>{cert.date}</span></div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                {cert.certificate_file || cert.fileUrl ? (
                  <a href={cert.certificate_file || cert.fileUrl} target="_blank" rel="noreferrer" className="text-purple-600 text-sm font-semibold flex items-center gap-2 hover:underline">
                    <ExternalLink className="w-4 h-4" /> View Certificate
                  </a>
                ) : <span className="text-slate-400 text-sm italic">No Certificate</span>}
                {cert.photo_file && (
                  <a href={cert.photo_file} target="_blank" rel="noreferrer" className="text-emerald-600 text-sm font-semibold flex items-center gap-2 hover:underline">
                    <CameraIcon className="w-4 h-4" /> View Photo
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-24 pb-12">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto relative">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-slate-900">{editingCert ? 'Edit Certification' : 'Add Certification'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* File Upload / Camera Section */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                  <div className="flex border-b border-slate-200">
                    <button type="button" onClick={() => setUploadTab('cert')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${uploadTab === 'cert' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      <FileUp className="w-4 h-4" /> Upload Certificate
                    </button>
                    <button type="button" onClick={() => setUploadTab('camera')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${uploadTab === 'camera' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      <CameraIcon className="w-4 h-4" /> Capture Photo
                    </button>
                  </div>

                  {uploadTab === 'cert' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <input type="file" accept="image/*,application/pdf" onChange={handleCertificateSelect} className="hidden" id="cert-upload" />
                        <label htmlFor="cert-upload" className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 cursor-pointer bg-white transition-colors">
                          <FileUp className="w-8 h-8 text-slate-400" />
                          <div className="text-center">
                            <p className="text-sm font-semibold text-slate-700">Click to upload certificate</p>
                            <p className="text-xs text-slate-500">PDF or Images (Max 5MB)</p>
                          </div>
                        </label>
                      </div>
                      {certificateFile && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-semibold truncate flex-1">{certificateFile.name} (Ready)</span>
                        </div>
                      )}
                      {!certificateFile && editingCert && editingCert.certificate_file && (
                        <div className="text-sm text-slate-500 italic">Existing certificate will be kept.</div>
                      )}
                      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                        {certPreview && (
                            <div className="flex-none">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Certificate Preview</p>
                              <img src={certPreview} alt="Preview" className="h-32 object-contain rounded-lg border border-slate-200 shadow-sm" />
                            </div>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadTab === 'camera' && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                      {!capturedImage ? (
                        <div className="space-y-4">
                          <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                            {stream ? (
                              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-slate-500 flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm">Starting camera...</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <button type="button" onClick={capturePhoto} disabled={!stream} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                              <CameraIcon className="w-5 h-5" /> Take Photo
                            </button>
                          </div>
                        </div>
                      ) : isCropping ? (
                        <div className="space-y-4">
                          <div className="bg-slate-100 rounded-lg overflow-hidden h-[300px]">
                            <Cropper
                              ref={cropperRef}
                              src={capturedImage}
                              style={{ height: '100%', width: '100%' }}
                              aspectRatio={NaN}
                              guides={true}
                              viewMode={1}
                            />
                          </div>
                          <div className="flex justify-between gap-3">
                            <button type="button" onClick={retakePhoto} className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300">Retake</button>
                            <button type="button" onClick={cropImage} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
                              <CropIcon className="w-4 h-4" /> Crop & Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <div className="flex justify-center">
                              {croppedBlob && (
                                <img src={URL.createObjectURL(croppedBlob)} alt="Cropped" className="max-h-48 rounded-lg border shadow-sm" />
                              )}
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                             <CheckCircle2 className="w-5 h-5" />
                             <span className="text-sm font-semibold truncate flex-1">Photo captured and verified</span>
                           </div>
                           <div className="flex justify-center">
                             <button type="button" onClick={retakePhoto} className="text-sm text-blue-600 hover:underline">Recapture Photo</button>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                  {errors.certificateFile && <p className="text-xs text-red-500 mt-1">{errors.certificateFile}</p>}
                </div>

                {/* Event Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Student</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200" value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})}>
                      <option value="">Select a student...</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                    </select>
                    {errors.studentId && <p className="text-xs text-red-500">{errors.studentId}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Event Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200" value={formData.eventName} onChange={(e) => setFormData({...formData, eventName: e.target.value})} />
                    {errors.eventName && <p className="text-xs text-red-500">{errors.eventName}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Level</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})}>
                      <option value="">Select level...</option>
                      <option value="International">International</option><option value="National">National</option>
                      <option value="State">State</option><option value="Zonal">Zonal</option><option value="College">College</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Participation Type</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" value={formData.participationType} onChange={(e) => setFormData({...formData, participationType: e.target.value})}>
                      <option value="">Select type...</option>
                      <option value="participation">Participation</option><option value="winner">Winner</option>
                      <option value="runner-up">Runner-up</option><option value="organizer">Organizer</option>
                    </select>
                    {errors.participationType && <p className="text-xs text-red-500">{errors.participationType}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Position</label>
                    <input type="text" placeholder="e.g., 1st, Runner Up" className="w-full px-4 py-3 rounded-xl border border-slate-200" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Date</label>
                    <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {editingCert ? 'Update' : 'Upload'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

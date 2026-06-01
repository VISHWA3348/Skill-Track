import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage, auth, handleApiError, OperationType, logAudit } from '../api/localApi';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, deleteDoc, getDocs, orderBy, ref, uploadBytes, getDownloadURL } from '../api/localApi';
import { Certificate, ParticipationType, PrizePosition, PrizeType, UserProfile, College } from '../types';
import { Upload, CheckCircle, XCircle, Clock, MapPin, MapPinOff, QrCode, Edit, Trash2, AlertTriangle, Image as ImageIcon, FileText, Search, Filter, ShieldCheck, ShieldAlert, Shield, Download, Camera, Crop, RotateCcw } from 'lucide-react';
import { createNotification } from '../services/notificationService';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import QRCodeLib from 'qrcode';
import exifr from 'exifr';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

const Certificates: React.FC = () => {
  const { profile, hasPermission, isStudent, isStaff, isHOD, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventCollegeName, setEventCollegeName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [certType, setCertType] = useState<ParticipationType>('participation');
  const [studentName, setStudentName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certFileUrl, setCertFileUrl] = useState('');
  const [date, setDate] = useState('');
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  
  // New Prize Fields
  const [prizePosition, setPrizePosition] = useState<PrizePosition>('');
  const [customPrizePosition, setCustomPrizePosition] = useState('');
  const [prizeType, setPrizeType] = useState<PrizeType>('');
  const [cashPrizeAmount, setCashPrizeAmount] = useState<number | ''>('');
  const [prizeDescription, setPrizeDescription] = useState('');

  // GPS Photo Verification Fields
  const [gpsPhotoUrl, setGpsPhotoUrl] = useState('');
  const [gpsPhotoLat, setGpsPhotoLat] = useState<number | null>(null);
  const [gpsPhotoLng, setGpsPhotoLng] = useState<number | null>(null);
  const [gpsPhotoTimestamp, setGpsPhotoTimestamp] = useState<string | null>(null);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [fraudFlag, setFraudFlag] = useState(false);
  const [fraudReason, setFraudReason] = useState('');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [actionType, setActionType] = useState<'review' | 'approve' | 'verify' | 'reject'>('review');
  const [remark, setRemark] = useState('');
  const [newRemarkText, setNewRemarkText] = useState('');
  const [isAddingRemark, setIsAddingRemark] = useState(false);

  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRCert, setSelectedQRCert] = useState<Certificate | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedViewCert, setSelectedViewCert] = useState<Certificate | null>(null);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');

  const [manualFraud, setManualFraud] = useState(false);
  const [manualFraudReason, setManualFraudReason] = useState('');

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterFraud, setFilterFraud] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Enterprise Upload Features
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropper, setCropper] = useState<any>();
  const [showPreview, setShowPreview] = useState(false);
  const [videoRef] = useState<React.RefObject<HTMLVideoElement>>(React.createRef());
  const [canvasRef] = useState<React.RefObject<HTMLCanvasElement>>(React.createRef());

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'certificates'));

    if (isStudent) {
      q = query(collection(db, 'certificates'), where('userId', '==', profile.uid), orderBy('timestamp', 'desc'));
    } else if (isAdmin) {
      q = query(collection(db, 'certificates'), where('collegeId', '==', profile.collegeId), orderBy('timestamp', 'desc'));
    } else if (isHOD || isStaff) {
      q = query(
        collection(db, 'certificates'), 
        where('collegeId', '==', profile.collegeId),
        where('departmentId', '==', profile.departmentId),
        orderBy('timestamp', 'desc')
      );
    }
    // super_admin sees all

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const certs: Certificate[] = [];
      snapshot.forEach((doc) => {
        certs.push({ id: doc.id, ...doc.data() } as Certificate);
      });
      setCertificates(certs);
      setLoading(false);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'certificates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, isStudent, isAdmin, isHOD, isStaff, refreshTrigger]);

  // Polling for data refresh
  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(() => {
      // Periodic check
    }, 300000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    if (location.state?.openUpload && hasPermission('certificates_upload')) {
      openUploadModal();
      // Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, hasPermission]);

  useEffect(() => {
    if (!profile?.departmentId || hasPermission('certificates_upload')) return;

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('departmentId', '==', profile.departmentId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setStudents(studentData);
    });

    return () => unsubscribe();
  }, [profile, isStudent]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'colleges'), (snapshot) => {
      const fetchedColleges: College[] = [];
      snapshot.forEach((doc) => {
        fetchedColleges.push({ id: doc.id, ...doc.data() } as College);
      });
      setColleges(fetchedColleges);
    });

    return () => unsubscribe();
  }, []);

  const openUploadModal = () => {
    setEventName('');
    setEventCollegeName('');
    setEventLocation('');
    setCertType('participation');
    
    if (hasPermission('certificates_upload')) {
      setStudentName(profile?.name || '');
      setSelectedStudentId(profile?.uid || '');
    } else {
      setStudentName('');
      setSelectedStudentId('');
    }
    
    setPhotoUrl('');
    setCertFile(null);
    setCertFileUrl('');
    setDate(new Date().toISOString().split('T')[0]);
    setGps(null);
    setPrizePosition('');
    setCustomPrizePosition('');
    setPrizeType('');
    setCashPrizeAmount('');
    setPrizeDescription('');
    setGpsPhotoUrl('');
    setGpsPhotoLat(null);
    setGpsPhotoLng(null);
    setGpsPhotoTimestamp(null);
    setGpsVerified(false);
    setFraudFlag(false);
    setFraudReason('');
    setIsEditing(false);
    setEditingCertId(null);
    setShowUploadModal(true);
  };

  const openEditModal = (cert: Certificate) => {
    setEventName(cert.eventName);
    setEventCollegeName(cert.eventCollegeName);
    setEventLocation(cert.eventLocation || '');
    setCertType(cert.type);
    setStudentName(cert.studentName);
    setPhotoUrl(cert.photoUrl || '');
    setCertFileUrl(cert.fileUrl || '');
    setCertFile(null);
    setDate(cert.date ? new Date(cert.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setGps(cert.gps || null);
    setPrizePosition(cert.prizePosition || '');
    setCustomPrizePosition(cert.customPrizePosition || '');
    setPrizeType(cert.prizeType || '');
    setCashPrizeAmount(cert.cashPrizeAmount || '');
    setPrizeDescription(cert.prizeDescription || '');
    setGpsPhotoUrl(cert.gpsPhotoUrl || '');
    setGpsPhotoLat(cert.gpsPhotoLat || null);
    setGpsPhotoLng(cert.gpsPhotoLng || null);
    setGpsPhotoTimestamp(cert.gpsPhotoTimestamp || null);
    setGpsVerified(cert.gpsVerified || false);
    setFraudFlag(cert.fraudFlag || false);
    setFraudReason(cert.fraudReason || '');
    setIsEditing(true);
    setEditingCertId(cert.id);
    setShowUploadModal(true);
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleCertFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setCertFile(file);
    setCertFileUrl(URL.createObjectURL(file));
    setImageToCrop(URL.createObjectURL(file)); // Automatically open cropper
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error("Camera access denied or not available.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setImageToCrop(dataUrl);
        stopCamera();
      }
    }
  };

  const onCrop = () => {
    if (cropper) {
      const croppedDataUrl = cropper.getCroppedCanvas().toDataURL();
      setCertFileUrl(croppedDataUrl);
      setImageToCrop(null);
      toast.success("Image cropped successfully");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setGpsPhotoUrl(objectUrl); // In a real app, upload to Firebase Storage

    try {
      const exifData = await exifr.parse(file);
      
      // 1. Basic Image Editing Detection
      if (exifData && (exifData.Software || exifData.ProcessingSoftware)) {
        const software = (exifData.Software || exifData.ProcessingSoftware).toLowerCase();
        if (software.includes('photoshop') || software.includes('lightroom') || software.includes('gimp') || software.includes('canva')) {
          setFraudFlag(true);
          setFraudReason(`Edited image detected (Software: ${exifData.Software || exifData.ProcessingSoftware}). Original photos required.`);
          setGpsVerified(false);
          return;
        }
      }

      // 2. Extract GPS and Timestamp
      if (exifData && exifData.latitude && exifData.longitude) {
        setGpsPhotoLat(exifData.latitude);
        setGpsPhotoLng(exifData.longitude);
        
        let photoDate: Date | null = null;
        if (exifData.DateTimeOriginal || exifData.CreateDate) {
          photoDate = exifData.DateTimeOriginal || exifData.CreateDate;
          setGpsPhotoTimestamp(photoDate!.toISOString());
        } else {
          setGpsPhotoTimestamp(null);
        }
        
        // 3. Compare with Browser GPS (Submission Location)
        let isGpsValid = true;
        let fraudMsg = '';

        if (gps) {
          const distance = getDistanceFromLatLonInKm(gps.lat, gps.lng, exifData.latitude, exifData.longitude);
          if (distance > 5) {
            isGpsValid = false;
            fraudMsg = `GPS mismatch: Photo taken ${distance.toFixed(2)}km away from submission location.`;
          }
        }

        // 3.5 Compare with Event College Location (if known)
        // if (eventCollegeName) {
        //   const college = colleges.find(c => c.name.toLowerCase() === eventCollegeName.toLowerCase());
        //   // Typescript Error Fix: lat and lng were removed from College schema
        //   // if (college && college.lat && college.lng) {
        //   //   const distFromCollege = getDistanceFromLatLonInKm(college.lat, college.lng, exifData.latitude, exifData.longitude);
        //   //   if (distFromCollege > 2) { // Allow 2km radius for college campus
        //   //     isGpsValid = false;
        //   //     fraudMsg += (fraudMsg ? ' ' : '') + `Venue mismatch: Photo taken ${distFromCollege.toFixed(2)}km away from ${college.name} campus.`;
        //   //   }
        //   // }
        // }

        // 4. Compare with Event Date
        if (photoDate && date) {
          const eventDate = new Date(date);
          const diffInHours = Math.abs(photoDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
          
          if (diffInHours > 48) { // Allow 48 hours window for travel/setup
            isGpsValid = false;
            fraudMsg += (fraudMsg ? ' ' : '') + `Date mismatch: Photo taken ${Math.floor(diffInHours/24)} days away from event date.`;
          }

          // Check if photo was taken AFTER the event date (suspicious if too late)
          if (photoDate.getTime() < eventDate.getTime() - (24 * 60 * 60 * 1000)) {
            isGpsValid = false;
            fraudMsg += (fraudMsg ? ' ' : '') + `Temporal mismatch: Photo taken before the event started.`;
          }
        }

        if (!isGpsValid) {
          setFraudFlag(true);
          setFraudReason(fraudMsg);
          setGpsVerified(false);
        } else {
          setFraudFlag(false);
          setFraudReason('');
          setGpsVerified(true);
        }
      } else {
        setGpsPhotoLat(null);
        setGpsPhotoLng(null);
        setGpsVerified(false);
        setFraudFlag(true);
        setFraudReason('No EXIF GPS data found. Please upload an original photo taken at the event venue.');
      }
    } catch (error) {
      console.error("Error reading EXIF data:", error);
      setGpsPhotoLat(null);
      setGpsPhotoLng(null);
      setGpsVerified(false);
      setFraudFlag(true);
      setFraudReason('Failed to read image metadata.');
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          toast.error('Error getting location: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const computeFileHash = async (file: Blob): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    // GPS and GPS photo are now optional per requirements
    // if (!gps) {
    //   toast.error('Please provide your browser GPS location first for verification.');
    //   return;
    // }
    // if ((certType === 'winner' || certType === 'runner-up') && !gpsPhotoUrl) {
    //   toast.error('GPS Photo proof is mandatory for winners and runners-up.');
    //   return;
    // }
    if (!certFile && !isEditing) {
      toast.error('Please upload the certificate document (PDF or Image).');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalFileUrl = certFileUrl;
      let finalGpsPhotoUrl = gpsPhotoUrl;
      let currentFileHash = isEditing && selectedCert ? selectedCert.fileHash : undefined;

      // Upload Certificate File if new one selected
      if (certFile) {
        currentFileHash = await computeFileHash(certFile);
        
        // Removed fileHash duplicate check to prevent upload blockages

        const fileRef = ref(storage, `certificates/${profile?.uid}/${Date.now()}_${certFile.name}`);
        const uploadResult = await uploadBytes(fileRef, certFile);
        finalFileUrl = await getDownloadURL(uploadResult.ref);
      }

      // In a real app, we would also upload the gpsPhotoUrl if it's a local blob
      // For this demo, we'll assume it's already handled or we'll just use the blob for now
      // but let's try to handle it if it starts with blob:
      if (gpsPhotoUrl.startsWith('blob:')) {
        const response = await fetch(gpsPhotoUrl);
        const blob = await response.blob();
        const photoRef = ref(storage, `proofs/${profile?.uid}/${Date.now()}_proof.jpg`);
        const fileObj = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        const uploadResult = await uploadBytes(photoRef, fileObj as any);
        finalGpsPhotoUrl = await getDownloadURL(uploadResult.ref);
      }

      const studentToUse = isStudent ? profile : students.find(s => s.uid === selectedStudentId);
      
      if (!studentToUse && !isStudent) {
        toast.error('Please select a student');
        setIsSubmitting(false);
        return;
      }

      // Removed event_name duplicate check to prevent upload blockages

      const certData: any = {
        studentId: studentToUse?.uid,
        studentName: studentToUse?.name || studentName,
        rollNo: studentToUse?.rollNo,
        class: studentToUse?.class,
        year: studentToUse?.year,
        phoneNumber: studentToUse?.phoneNumber,
        city: studentToUse?.city,
        collegeName: studentToUse?.collegeName,
        eventName,
        eventCollegeName,
        eventLocation,
        date: new Date(date).toISOString(),
        type: certType,
        photoUrl: photoUrl || 'https://example.com/photo.jpg',
        fileUrl: finalFileUrl,
        gps,
        prizePosition: certType === 'winner' || certType === 'runner-up' ? prizePosition : null,
        customPrizePosition: prizePosition === 'Other' ? customPrizePosition : null,
        prizeType: certType === 'winner' || certType === 'runner-up' ? prizeType : null,
        cashPrizeAmount: prizeType === 'Cash Prize' ? Number(cashPrizeAmount) : null,
        prizeDescription: certType === 'winner' || certType === 'runner-up' ? prizeDescription : null,
        gpsPhotoUrl: finalGpsPhotoUrl,
        gpsPhotoLat,
        gpsPhotoLng,
        gpsPhotoTimestamp,
        gpsVerified,
        fraudFlag,
        fraudReason,
        fileHash: currentFileHash
      };

      // Removed basic duplicate check

      if (isEditing && editingCertId) {
        const certRef = doc(db, 'certificates', editingCertId);
        try {
          await updateDoc(certRef, certData);
          await logAudit('Certificate Updated', `Updated certificate ${eventName} (${editingCertId})`, profile?.collegeId);
        } catch (error) {
          handleApiError(error, OperationType.UPDATE, `certificates/${editingCertId}`);
        }
      } else {
        try {
          const docRef = await addDoc(collection(db, 'certificates'), {
            ...certData,
            userId: studentToUse?.uid || profile?.uid,
            collegeId: studentToUse?.collegeId || profile?.collegeId || 'dummy-college',
            departmentId: studentToUse?.departmentId || profile?.departmentId || 'dummy-dept',
            status: 'pending',
            remarks: [],
            timestamp: serverTimestamp()
          });
          await logAudit('Certificate Created', `Created certificate ${eventName} (${docRef.id})`, profile?.collegeId);
        } catch (error) {
          handleApiError(error, OperationType.CREATE, 'certificates');
        }
      }
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error saving certificate:', error);
      toast.error('Failed to save certificate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (cert: Certificate) => {
    setCertToDelete(cert);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!certToDelete) return;
    try {
      // Enterprise Soft Delete
      const certRef = doc(db, 'certificates', certToDelete.id);
      await updateDoc(certRef, { is_deleted: true });
      
      await logAudit('Certificate Soft Deleted', `Deleted certificate ${certToDelete.eventName} (${certToDelete.id})`, profile?.collegeId);
      setShowDeleteModal(false);
      setCertToDelete(null);
    } catch (error) {
      handleApiError(error, OperationType.DELETE, `certificates/${certToDelete.id}`);
    }
  };

  const handleActionClick = (cert: Certificate, action: 'review' | 'approve' | 'verify' | 'reject') => {
    setSelectedCert(cert);
    setActionType(action);
    setRemark('');
    setManualFraud(cert.fraudFlag || false);
    setManualFraudReason(cert.fraudReason || '');
    setShowActionModal(true);
  };

  const handleAddRemark = async () => {
    if (!selectedViewCert || !profile || !newRemarkText.trim()) return;
    
    setIsAddingRemark(true);
    try {
      const certRef = doc(db, 'certificates', selectedViewCert.id);
      const newRemark = {
        userId: profile.uid,
        role: profile.role,
        comment: newRemarkText.trim(),
        timestamp: new Date().toISOString()
      };
      
      await updateDoc(certRef, {
        remarks: arrayUnion(newRemark)
      });
      
      // Update local state to reflect immediately
      setSelectedViewCert({
        ...selectedViewCert,
        remarks: [...(selectedViewCert.remarks || []), newRemark]
      });
      
      setNewRemarkText('');
      toast.success("Remark added successfully");
    } catch (error) {
      handleApiError(error, OperationType.UPDATE, `certificates/${selectedViewCert.id}`);
      toast.error("Failed to add remark");
    } finally {
      setIsAddingRemark(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert || !profile) return;

    const idToken = localStorage.getItem('token');
    try {
      let nextStatus = selectedCert.status;
      if (actionType === 'approve') {
        if (isStaff) nextStatus = 'staff_approved';
        else if (isHOD) nextStatus = 'approved';
        else if (isSuperAdmin || isAdmin) nextStatus = 'approved';
      } else if (actionType === 'reject') {
        nextStatus = 'rejected';
      }

      const response = await fetch(`/api/certifications/${selectedCert.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          status: nextStatus,
          remark: remark.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      setShowActionModal(false);
      setSelectedCert(null);
      setRemark('');
      toast.success(`Certificate ${actionType}ed successfully!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);

  const handleVerifyIntegrity = async (cert: Certificate) => {
    setIsVerifyingIntegrity(true);
    try {
      if (!cert.fileHash) {
        toast.error("No original hash found for this certificate to compare against.");
        setIsVerifyingIntegrity(false);
        return;
      }
      
      const response = await fetch(cert.fileUrl);
      const blob = await response.blob();
      
      const currentHash = await computeFileHash(blob);
      
      if (currentHash === cert.fileHash) {
        toast.success("Integrity Verified: The file has not been tampered with.");
      } else {
        toast.error("Integrity Check Failed: The file hash does not match the original.");
        await updateDoc(doc(db, 'certificates', cert.id), {
          fraudFlag: true,
          fraudReason: 'File integrity check failed (Hash mismatch). The file may have been tampered with.'
        });
      }
    } catch (error) {
      console.error("Integrity check error:", error);
      toast.error("Failed to verify file integrity. Ensure CORS is configured for storage.");
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  const handleDownloadPDF = async (cert: Certificate) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(33, 37, 41);
    doc.text('Certificate Details', 105, 20, { align: 'center' });
    
    // Status Badge
    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74); // Green for verified
    doc.text('VERIFIED', 105, 30, { align: 'center' });

    // Basic Info
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Student Information', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Field', 'Details']],
      body: [
        ['Student Name', cert.studentName],
        ['Roll No', cert.rollNo || 'N/A'],
        ['Class/Year', `${cert.class || ''} ${cert.year || ''}`.trim() || 'N/A'],
        ['College', cert.collegeName || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Event Info
    doc.text('Event Information', 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Field', 'Details']],
      body: [
        ['Event Name', cert.eventName],
        ['Event Date', cert.date],
        ['Participation Type', (cert.type || "").replace('-', ' ').toUpperCase()],
        ['Position', cert.prizePosition || 'N/A'],
        ['Prize Type', cert.prizeType || 'N/A'],
        ['Cash Amount', cert.cashPrizeAmount ? `Rs. ${cert.cashPrizeAmount}` : 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Verification Info
    doc.text('Verification Details', 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Field', 'Details']],
      body: [
        ['Status', cert.status.toUpperCase()],
        ['GPS Verified', cert.gpsVerified ? 'Yes' : 'No'],
        ['Fraud Flag', cert.fraudFlag ? 'Yes' : 'No'],
        ['File Hash', cert.fileHash ? `${cert.fileHash.substring(0, 16)}...` : 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Add QR Code
    const qrUrl = `${window.location.origin}/verify/${cert.id}`;
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(qrUrl, { width: 100, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', 85, (doc as any).lastAutoTable.finalY + 15, 40, 40);
    } catch (err) {
      console.error('Failed to generate QR code for PDF', err);
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Verify online at: ${qrUrl}`, 105, (doc as any).lastAutoTable.finalY + 60, { align: 'center' });

    doc.save(`${cert.studentName}_${cert.eventName}_Certificate.pdf`);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 w-fit";
    switch (status) {
      case 'approved': return <span className={`${baseClasses} bg-green-50 text-green-700 border border-green-200`}><CheckCircle className="w-3.5 h-3.5"/> Fully Approved</span>;
      case 'verified': return <span className={`${baseClasses} bg-green-50 text-green-700 border border-green-200`}><CheckCircle className="w-3.5 h-3.5"/> Verified</span>;
      case 'rejected': return <span className={`${baseClasses} bg-red-50 text-red-700 border border-red-200`}><XCircle className="w-3.5 h-3.5"/> Rejected</span>;
      case 'pending': return <span className={`${baseClasses} bg-amber-50 text-amber-700 border border-amber-200`}><Clock className="w-3.5 h-3.5"/> Pending Review</span>;
      case 'staff_approved': return <span className={`${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`}><ShieldCheck className="w-3.5 h-3.5"/> Approved by Staff (Waiting for HOD)</span>;
      case 'hod_approved': return <span className={`${baseClasses} bg-purple-50 text-purple-700 border border-purple-200`}><ShieldCheck className="w-3.5 h-3.5"/> HOD Approved</span>;
      default: return <span className={`${baseClasses} bg-gray-50 text-gray-700 border border-gray-200`}>{status}</span>;
    }
  };

  const getGPSStatusBadge = (cert: Certificate) => {
    const baseClasses = "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 w-fit shadow-sm transition-all hover:scale-105 cursor-default";
    
    if (cert.fraudFlag) {
      return (
        <div className="flex flex-col gap-1 max-w-[150px]">
          <span className={`${baseClasses} bg-red-100 text-red-700 border border-red-200 ring-1 ring-red-200`} title="Fraud Alert">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse"/> Flagged
          </span>
          <span className="text-[10px] text-red-600 font-medium leading-tight whitespace-normal" title={cert.fraudReason}>
            {cert.fraudReason}
          </span>
        </div>
      );
    }
    
    if (cert.gpsVerified) {
      return (
        <span className={`${baseClasses} bg-emerald-100 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-200`} title="GPS Location Verified">
          <CheckCircle className="w-3.5 h-3.5"/> Verified
        </span>
      );
    }
    
    return (
      <span className={`${baseClasses} bg-slate-100 text-slate-600 border border-slate-200 ring-1 ring-slate-200`} title="GPS verification not performed or failed">
        <MapPinOff className="w-3.5 h-3.5"/> Unverified
      </span>
    );
  };

  const filteredCertificates = certificates.filter(cert => {
    if (filterStatus !== 'all' && cert.status !== filterStatus) return false;
    if (filterType !== 'all' && cert.type !== filterType) return false;
    if (filterFraud === 'fraud' && !cert.fraudFlag) return false;
    if (filterFraud === 'verified' && !cert.gpsVerified) return false;
    if (filterFraud === 'clean' && cert.fraudFlag) return false;
    
    if (startDate && new Date(cert.date) < new Date(startDate)) return false;
    if (endDate && new Date(cert.date) > new Date(endDate)) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesStudent = cert.studentName?.toLowerCase().includes(query);
      const matchesEvent = cert.eventName?.toLowerCase().includes(query);
      const matchesRollNo = cert.rollNo?.toLowerCase().includes(query);
      
      if (!matchesStudent && !matchesEvent && !matchesRollNo) {
        return false;
      }
    }
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType, filterFraud, searchQuery, startDate, endDate]);

  const paginatedCertificates = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCertificates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCertificates, currentPage]);

  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Certificates</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshTrigger(prev => prev + 1);
              toast.success("Synchronizing Certificates...");
            }}
            className="flex items-center justify-center p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
            title="Refresh Certificates"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 21v-5h-.581m0 0a8.003 8.003 0 01-15.357-2" />
            </svg>
          </button>
          {(isStudent || isStaff) && (
            <button 
              onClick={openUploadModal}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Status</label>
          <div className="relative">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[160px]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="staff_approved">Staff Approved</option>
              <option value="hod_approved">HOD Approved</option>
              <option value="approved">Fully Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <Filter className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Type</label>
          <div className="relative">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[160px]"
            >
              <option value="all">All Types</option>
              <option value="participation">Participation</option>
              <option value="winner">Winner</option>
              <option value="runner-up">Runner-up</option>
              <option value="organizer">Organizer</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <Filter className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Fraud Flag</label>
          <div className="relative">
            <select 
              value={filterFraud} 
              onChange={(e) => setFilterFraud(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[180px]"
            >
              <option value="all">All Entries</option>
              <option value="fraud">Fraudulent Only</option>
              <option value="verified">Verified Only (GPS)</option>
              <option value="clean">Clean (No Fraud Flag)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Search</label>
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, roll no, or event..." 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Start Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">End Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        {(startDate || endDate) && (
          <div className="flex flex-col justify-end pb-1">
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear Dates
            </button>
          </div>
        )}
      </div>

      {/* Certificates List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading certificates...</div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No certificates found matching your criteria.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Event</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">College</th>
                      {!hasPermission('certificates_upload') && <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Student</th>}
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Type</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">GPS</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] italic font-serif">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{cert.eventName}</div>
                      <div className="text-[11px] font-medium text-gray-400 font-mono">{new Date(cert.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{cert.eventCollegeName}</div>
                    </td>
                    {!hasPermission('certificates_upload') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-700">
                          {cert.studentName}
                          {cert.rollNo && <span className="text-[11px] font-mono text-gray-400 ml-2">({cert.rollNo})</span>}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-gray-600">{(cert.type || "").replace('-', ' ')}</span>
                        {cert.fraudFlag && (
                          <div className="relative group flex flex-col items-start">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-red-50 text-red-600 border border-red-100 cursor-help">
                              <AlertTriangle className="w-3 h-3 animate-pulse" /> Fraud Alert
                            </span>
                            <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-48 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 text-left pointer-events-none">
                              <span className="font-bold text-red-400 block mb-1">Fraud Reason</span>
                              {cert.fraudReason || 'Suspicious activity detected.'}
                            </div>
                          </div>
                        )}
                        {cert.cashPrizeAmount && cert.cashPrizeAmount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-green-50 text-green-600 border border-green-100">
                            ₹{cert.cashPrizeAmount} Prize
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getGPSStatusBadge(cert)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(cert.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => { setSelectedViewCert(cert); setShowViewModal(true); }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      
                      {cert.status === 'verified' && (
                        <button 
                          onClick={() => handleDownloadPDF(cert)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4 inline-block" />
                        </button>
                      )}
  
                      {hasPermission('certificates_upload') && cert.status === 'pending' && (
                        <>
                          <button onClick={() => openEditModal(cert)} className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center gap-1">
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <button onClick={() => confirmDelete(cert)} className="text-red-600 hover:text-red-900 mr-3 inline-flex items-center gap-1">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </>
                      )}
  
                      {cert.status === 'verified' && (
                        <button 
                          onClick={() => { setSelectedQRCert(cert); setShowQRModal(true); }} 
                          className="text-indigo-600 hover:text-indigo-900 mr-3 flex items-center gap-1 inline-flex"
                        >
                          <QrCode className="w-4 h-4" /> QR
                        </button>
                      )}
                      {((hasPermission('certificates_review') || hasPermission('certificates_approve')) && cert.status === 'staff_approved') && <button onClick={() => handleActionClick(cert, 'approve')} className="text-purple-600 hover:text-purple-900 mr-3">Approve</button>}
                      {hasPermission('certificates_verify') && cert.status === 'hod_approved' && <button onClick={() => handleActionClick(cert, 'verify')} className="text-green-600 hover:text-green-900 mr-3">Verify</button>}
                      {isSuperAdmin && cert.status === 'rejected' && <button onClick={() => handleActionClick(cert, 'verify')} className="text-emerald-600 hover:text-emerald-900 mr-3 font-semibold">Override & Verify</button>}
                      {(
                        ((hasPermission('certificates_review') || hasPermission('certificates_approve')) && cert.status === 'staff_approved') ||
                        (hasPermission('certificates_verify') && cert.status === 'hod_approved') ||
                        (isSuperAdmin && cert.status !== 'verified' && cert.status !== 'rejected')
                      ) && (
                        <button onClick={() => handleActionClick(cert, 'reject')} className="text-red-600 hover:text-red-900">Reject</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-semibold">{Math.min(filteredCertificates.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                  <span className="font-semibold">{Math.min(filteredCertificates.length, currentPage * itemsPerPage)}</span> of{' '}
                  <span className="font-semibold">{filteredCertificates.length}</span> certificates
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload/Edit Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Edit Certificate' : 'Upload Certificate'}</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              {!hasPermission('certificates_upload') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Student</label>
                  <select 
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="">Select a student...</option>
                    {students.map(s => (
                      <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo || s.uid})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Student Name</label>
                <input 
                  type="text" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Name</label>
                <input 
                  type="text" 
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event College Name</label>
                <input 
                  type="text" 
                  value={eventCollegeName}
                  onChange={(e) => setEventCollegeName(e.target.value)}
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Location</label>
                <input 
                  type="text" 
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g., Main Auditorium, Block A, etc."
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Event</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Participation Type</label>
                <select 
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as ParticipationType)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="participation">Participation</option>
                  <option value="winner">Winner</option>
                  <option value="runner-up">Runner-up</option>
                  <option value="organizer">Organizer</option>
                </select>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
                <label className="block text-sm font-medium text-blue-800 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Certificate Document (PDF/Image) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-blue-600">Upload the original certificate document for verification.</p>
                <input 
                  type="file" 
                  accept="application/pdf, image/jpeg, image/png"
                  onChange={handleCertFileUpload}
                  required={!isEditing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                />
                {certFileUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
                    <CheckCircle className="w-3 h-3" /> 
                    {certFile ? `Selected: ${certFile.name}` : 'Current file attached'}
                  </div>
                )}
              </div>

              {(certType === 'winner' || certType === 'runner-up') && (
                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                    🏆 Prize Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Prize Position</label>
                      <select 
                        value={prizePosition}
                        onChange={(e) => setPrizePosition(e.target.value as PrizePosition)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      >
                        <option value="">Select Position</option>
                        <option value="1st Place">1st Place</option>
                        <option value="2nd Place">2nd Place</option>
                        <option value="3rd Place">3rd Place</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {prizePosition === 'Other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Specify Position</label>
                        <input 
                          type="text" 
                          value={customPrizePosition}
                          onChange={(e) => setCustomPrizePosition(e.target.value)}
                          required 
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Prize Type</label>
                      <select 
                        value={prizeType}
                        onChange={(e) => setPrizeType(e.target.value as PrizeType)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      >
                        <option value="">Select Type</option>
                        <option value="Cash Prize">Cash Prize</option>
                        <option value="Certificate Only">Certificate Only</option>
                        <option value="Trophy / Medal">Trophy / Medal</option>
                        <option value="Internship Offer">Internship Offer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {prizeType === 'Cash Prize' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cash Amount (₹)</label>
                        <input 
                          type="number" 
                          value={cashPrizeAmount}
                          onChange={(e) => setCashPrizeAmount(Number(e.target.value))}
                          required 
                          min="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prize Description</label>
                    <textarea 
                      value={prizeDescription}
                      onChange={(e) => setPrizeDescription(e.target.value)}
                      placeholder="e.g., Won 1st place in Paper Presentation and received ₹5000"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Step 1: Browser GPS Location (Optional)</label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={handleGetLocation}
                    className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 text-sm flex items-center gap-1"
                  >
                    <MapPin className="w-4 h-4" /> Get Current Location
                  </button>
                  {gps && <span className="text-xs text-green-600 font-medium">Location captured ✓</span>}
                </div>
                {gps && (
                  <p className="text-xs text-gray-500 mt-1">Lat: {gps.lat.toFixed(4)}, Lng: {gps.lng.toFixed(4)}</p>
                )}
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Step 2: Proof Photo {(certType === 'winner' || certType === 'runner-up') && <span className="text-gray-500"> (Optional)</span>}
                </label>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => document.getElementById('photo-upload-input')?.click()}
                    className="flex-1 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs flex items-center justify-center gap-1"
                  >
                    <ImageIcon className="w-4 h-4" /> Upload File
                  </button>
                  <button 
                    type="button" 
                    onClick={startCamera}
                    className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 text-xs flex items-center justify-center gap-1"
                  >
                    <Camera className="w-4 h-4" /> Use Camera
                  </button>
                  {gpsPhotoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setImageToCrop(gpsPhotoUrl)}
                      className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 text-xs flex items-center justify-center gap-1"
                    >
                      <Crop className="w-4 h-4" /> Re-crop
                    </button>
                  )}
                </div>

                <input 
                  id="photo-upload-input"
                  type="file" 
                  accept="image/jpeg, image/png"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                
                {isCameraOpen && (
                  <div className="relative rounded overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                      <button type="button" onClick={takePhoto} className="bg-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform">
                        <div className="w-8 h-8 rounded-full border-4 border-gray-300" />
                      </button>
                      <button type="button" onClick={stopCamera} className="bg-red-600 text-white p-2 rounded-md">Cancel</button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

                {gpsPhotoUrl && !isCameraOpen && (
                  <div className="mt-3 space-y-2">
                    <div className="relative group">
                      <img src={gpsPhotoUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded border bg-white" />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => setImageToCrop(gpsPhotoUrl)} className="bg-white/90 p-1.5 rounded-full shadow hover:bg-white"><Crop className="w-4 h-4"/></button>
                      </div>
                    </div>
                    <div className="text-[10px] space-y-1">
                      {gpsPhotoLat ? (
                        <p className="text-green-600 flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5"/> EXIF Found: {gpsPhotoLat.toFixed(3)}, {gpsPhotoLng?.toFixed(3)}</p>
                      ) : (
                        <p className="text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5"/> No EXIF GPS Found</p>
                      )}
                      {fraudFlag && (
                        <p className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5"/> {fraudReason}</p>
                      )}
                      {gpsVerified && (
                        <p className="text-green-700 font-bold flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5"/> Verified Authentic</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Image Cropper Modal */}
              {imageToCrop && (
                <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] p-4">
                  <div className="bg-white rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl">
                    <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2"><Crop className="w-5 h-5"/> Crop Proof Image</h4>
                      <button onClick={() => setImageToCrop(null)} className="text-gray-500 hover:text-gray-800">Dismiss</button>
                    </div>
                    <div className="p-4 bg-gray-200">
                      <Cropper
                        src={imageToCrop}
                        style={{ height: 400, width: "100%" }}
                        initialAspectRatio={16/9}
                        guides={true}
                        onInitialized={(instance) => setCropper(instance)}
                      />
                    </div>
                    <div className="p-4 flex justify-between bg-white">
                      <button type="button" onClick={() => setImageToCrop(null)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => cropper?.rotate(90)} className="p-2 border rounded-md text-gray-600 hover:bg-gray-50" title="Rotate"><RotateCcw className="w-4 h-4"/></button>
                        <button type="button" onClick={onCrop} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">Apply Crop</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400" disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading...' : (isEditing ? 'Save Changes' : 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && certToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Delete Certificate?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the certificate for <strong>{certToDelete.eventName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setCertToDelete(null); }} 
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedCert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 capitalize">{actionType} Certificate</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600"><strong>Student:</strong> {selectedCert.studentName} {selectedCert.rollNo && <span className="text-xs text-gray-400 ml-1">({selectedCert.rollNo})</span>}</p>
              <p className="text-sm text-gray-600"><strong>Event:</strong> {selectedCert.eventName}</p>
            </div>
            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks (Required)</label>
                <textarea 
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  required={true}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                  rows={3}
                  placeholder="Add your remarks here..."
                />
              </div>

              {/* Manual Fraud Flagging */}
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <input 
                  type="checkbox" 
                  id="manualFraud"
                  checked={manualFraud}
                  onChange={(e) => setManualFraud(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <label htmlFor="manualFraud" className="text-sm font-bold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Mark as Fraudulent
                </label>
              </div>

              {manualFraud && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fraud Reason</label>
                  <input 
                    type="text"
                    value={manualFraudReason}
                    onChange={(e) => setManualFraudReason(e.target.value)}
                    required={manualFraud}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    placeholder="Why is this certificate fraudulent?"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowActionModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                <button 
                  type="submit" 
                  className={`px-4 py-2 text-white rounded capitalize ${actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Confirm {actionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Certificate Modal */}
      {showViewModal && selectedViewCert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Certificate Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Student Name</p>
                  <p className="font-medium">{selectedViewCert.studentName} {selectedViewCert.rollNo && <span className="text-xs text-gray-400 ml-1">({selectedViewCert.rollNo})</span>}</p>
                </div>
                {selectedViewCert.rollNo && (
                  <div>
                    <p className="text-sm text-gray-500">Roll No</p>
                    <p className="font-medium">{selectedViewCert.rollNo}</p>
                  </div>
                )}
                {selectedViewCert.class && (
                  <div>
                    <p className="text-sm text-gray-500">Class</p>
                    <p className="font-medium">{selectedViewCert.class}</p>
                  </div>
                )}
                {selectedViewCert.year && (
                  <div>
                    <p className="text-sm text-gray-500">Year</p>
                    <p className="font-medium">{selectedViewCert.year}</p>
                  </div>
                )}
                {selectedViewCert.phoneNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{selectedViewCert.phoneNumber}</p>
                  </div>
                )}
                {selectedViewCert.city && (
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="font-medium">{selectedViewCert.city}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedViewCert.eventName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">College</p>
                  <p className="font-medium">{selectedViewCert.eventCollegeName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Event Location</p>
                  <p className="font-medium">{selectedViewCert.eventLocation || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(selectedViewCert.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedViewCert.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">GPS Verification</p>
                  <div className="mt-1">{getGPSStatusBadge(selectedViewCert)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{(selectedViewCert.type || "").replace('-', ' ')}</p>
                </div>
                {selectedViewCert.fraudFlag && (
                  <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Fraud Reason
                    </p>
                    <p className="text-sm text-red-600 font-medium">{selectedViewCert.fraudReason || 'Suspicious activity detected.'}</p>
                  </div>
                )}
                {selectedViewCert.status === 'verified' && (
                  <div className="col-span-2 mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col items-center">
                    <p className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <QrCode className="w-4 h-4" /> Verification QR Code
                    </p>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <QRCode 
                        value={`${window.location.origin}/verify/${selectedViewCert.id}`} 
                        size={120}
                        level="H"
                      />
                    </div>
                    <p className="mt-3 text-[10px] text-indigo-600 font-medium">
                      Scan this code to verify the certificate's authenticity
                    </p>
                  </div>
                )}
              </div>

              {/* Certificate Document */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Certificate Document
                </h4>
                {selectedViewCert.fileUrl ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded text-blue-600">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Certificate File</p>
                          <p className="text-xs text-gray-500">Official document for verification</p>
                        </div>
                      </div>
                      <a 
                        href={selectedViewCert.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        View Document
                      </a>
                    </div>
                    {selectedViewCert.fileHash && (
                      <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">File Integrity</p>
                            <p className="text-xs text-gray-500 font-mono" title={selectedViewCert.fileHash}>
                              Hash: {selectedViewCert.fileHash.substring(0, 16)}...
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleVerifyIntegrity(selectedViewCert)}
                          disabled={isVerifyingIntegrity}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center gap-2"
                        >
                          {isVerifyingIntegrity ? 'Verifying...' : 'Verify Integrity'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-blue-600 italic">No certificate document uploaded.</p>
                )}
              </div>

              {/* Prize Details */}
              {(selectedViewCert.type === 'winner' || selectedViewCert.type === 'runner-up') && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">🏆 Prize Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-yellow-700">Position</p>
                      <p className="font-medium text-yellow-900">{selectedViewCert.prizePosition === 'Other' ? selectedViewCert.customPrizePosition : selectedViewCert.prizePosition}</p>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700">Prize Type</p>
                      <p className="font-medium text-yellow-900">{selectedViewCert.prizeType}</p>
                    </div>
                    {selectedViewCert.cashPrizeAmount && (
                      <div>
                        <p className="text-sm text-yellow-700">Cash Amount</p>
                        <p className="font-medium text-green-700">₹{selectedViewCert.cashPrizeAmount}</p>
                      </div>
                    )}
                    {selectedViewCert.prizeDescription && (
                      <div className="col-span-2">
                        <p className="text-sm text-yellow-700">Description</p>
                        <p className="text-sm text-yellow-900 mt-1">{selectedViewCert.prizeDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GPS & Fraud Verification */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location & Verification</h4>
                
                {selectedViewCert.fraudFlag && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Fraud Alert</p>
                      <p className="text-sm text-red-700">{selectedViewCert.fraudReason}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">GPS Photo Proof</p>
                    {selectedViewCert.gpsPhotoUrl ? (
                      <button 
                        onClick={() => { setSelectedPhotoUrl(selectedViewCert.gpsPhotoUrl!); setShowPhotoModal(true); }}
                        className="w-full h-48 block overflow-hidden rounded-md border hover:opacity-90 transition-opacity"
                      >
                        <img src={selectedViewCert.gpsPhotoUrl} alt="Proof" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-md flex flex-col items-center justify-center text-gray-500">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <p className="text-sm">No Photo Provided</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Browser GPS (Submission Location)</p>
                      <p className="text-sm font-medium">
                        {selectedViewCert.gps ? `${selectedViewCert.gps.lat.toFixed(4)}, ${selectedViewCert.gps.lng.toFixed(4)}` : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">EXIF GPS (Photo Location)</p>
                      <p className="text-sm font-medium">
                        {selectedViewCert.gpsPhotoLat ? `${selectedViewCert.gpsPhotoLat.toFixed(4)}, ${selectedViewCert.gpsPhotoLng?.toFixed(4)}` : 'Not found in image'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">EXIF Timestamp</p>
                      <p className="text-sm font-medium">
                        {selectedViewCert.gpsPhotoTimestamp ? new Date(selectedViewCert.gpsPhotoTimestamp).toLocaleString() : 'Not found in image'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Verification Status</p>
                      {getGPSStatusBadge(selectedViewCert)}
                    </div>
                    {selectedViewCert.gps && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedViewCert.gps.lat},${selectedViewCert.gps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <MapPin className="w-4 h-4" /> View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Remarks History */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Remarks & Status History
                </h4>
                {selectedViewCert.remarks && selectedViewCert.remarks.length > 0 ? (
                  <div className="space-y-4">
                    {selectedViewCert.remarks.map((remark, idx) => (
                      <div key={idx} className="relative pl-6 pb-4 last:pb-0 border-l-2 border-gray-100 last:border-l-0">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500" />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded self-start">
                              {(remark.role || "").replace('_', ' ')}
                            </span>
                            {remark.status && (
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                changed status to {getStatusBadge(remark.status)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">
                            {new Date(remark.timestamp).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{remark.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">No remarks or status changes have been recorded yet.</p>
                  </div>
                )}
                
                {(hasPermission('certificates_review') || hasPermission('certificates_approve') || isSuperAdmin) && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add a Remark</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newRemarkText}
                        onChange={(e) => setNewRemarkText(e.target.value)}
                        placeholder="Type your remark here..."
                        className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRemark();
                          }
                        }}
                      />
                      <button 
                        onClick={handleAddRemark}
                        disabled={isAddingRemark || !newRemarkText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                      >
                        {isAddingRemark ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t flex justify-between items-center">
              <div className="flex gap-2">
                {selectedViewCert.status === 'verified' && (
                  <button 
                    onClick={() => handleDownloadPDF(selectedViewCert)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                )}
                {((hasPermission('certificates_review') || hasPermission('certificates_approve')) && selectedViewCert.status === 'staff_approved') && (
                  <button 
                    onClick={() => { setShowViewModal(false); handleActionClick(selectedViewCert, 'approve'); }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                  >
                    Approve
                  </button>
                )}
                {hasPermission('certificates_verify') && selectedViewCert.status === 'hod_approved' && (
                  <button 
                    onClick={() => { setShowViewModal(false); handleActionClick(selectedViewCert, 'verify'); }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                  >
                    Verify
                  </button>
                )}
                {isSuperAdmin && selectedViewCert.status === 'rejected' && (
                  <button 
                    onClick={() => { setShowViewModal(false); handleActionClick(selectedViewCert, 'verify'); }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                  >
                    Override & Verify
                  </button>
                )}
                {(
                  ((hasPermission('certificates_review') || hasPermission('certificates_approve')) && selectedViewCert.status === 'staff_approved') ||
                  (hasPermission('certificates_verify') && selectedViewCert.status === 'hod_approved') ||
                  (isSuperAdmin && selectedViewCert.status !== 'verified' && selectedViewCert.status !== 'rejected')
                ) && (
                  <button 
                    onClick={() => { setShowViewModal(false); handleActionClick(selectedViewCert, 'reject'); }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                  >
                    Reject
                  </button>
                )}
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedQRCert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm text-center">
            <h3 className="text-lg font-bold mb-2">Verified Certificate QR</h3>
            <p className="text-sm text-gray-600 mb-6">Scan to verify authenticity</p>
            
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm border border-gray-100 mb-6">
              <QRCode 
                value={`${window.location.origin}/verify/${selectedQRCert.id}`} 
                size={200}
                level="H"
              />
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-900">
                {selectedQRCert.studentName}
                {selectedQRCert.rollNo && <span className="text-xs text-gray-400 ml-1">({selectedQRCert.rollNo})</span>}
              </p>
              <p className="text-xs text-gray-500">{selectedQRCert.eventName}</p>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/verify/${selectedQRCert.id}`);
                  toast.success('Verification link copied to clipboard');
                }}
                className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 font-medium text-sm transition-colors"
              >
                Copy Verification Link
              </button>
              <button 
                onClick={() => { setShowQRModal(false); setSelectedQRCert(null); }} 
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Photo Proof Modal */}
      {showPhotoModal && selectedPhotoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4">
          <div className="relative max-w-4xl w-full">
            <button 
              onClick={() => { setShowPhotoModal(false); setSelectedPhotoUrl(''); }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-1"
            >
              <XCircle className="w-8 h-8" />
              <span className="text-sm font-medium">Close</span>
            </button>
            <div className="bg-white p-2 rounded-lg shadow-2xl">
              <img 
                src={selectedPhotoUrl} 
                alt="GPS Proof Full Size" 
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
              <div className="mt-4 p-4 bg-gray-50 rounded border-t flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-gray-900">GPS Proof Photo</p>
                  <p className="text-xs text-gray-500">Certificate ID: {selectedViewCert?.id}</p>
                </div>
                <a 
                  href={selectedPhotoUrl} 
                  download={`gps_proof_${selectedViewCert?.id}.jpg`}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                  Download Original
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;


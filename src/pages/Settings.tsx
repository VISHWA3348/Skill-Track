import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../api/localApi';
import { collection, onSnapshot, doc, setDoc } from '../api/localApi';
import { Save, Shield, Settings as SettingsIcon, Upload, Database, Lock, Check, User, Key, AlertCircle, Building2, MapPin, Globe, ExternalLink, Camera, Image, X, Briefcase, Heart, Twitter } from 'lucide-react';
import { toast } from 'sonner';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string;
}

interface PermissionRow {
  id: string;
  role: string;
  module: string;
  action: string;
  allowed: boolean;
}

const Settings: React.FC = () => {
  const { profile, isSuperAdmin, isStudent } = useAuth();
  
  // System State
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile State
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [rollNo, setRollNo] = useState(profile?.rollNo || '');
  const [departmentId, setDepartmentId] = useState(profile?.departmentId || '');
  const [className, setClassName] = useState(profile?.class || '');
  const [year, setYear] = useState(profile?.year || '');
  const [profilePhoto, setProfilePhoto] = useState(profile?.profilePhoto || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [section, setSection] = useState(profile?.section || '');
  const [city, setCity] = useState(profile?.city || '');
  const [collegeName, setCollegeName] = useState(profile?.collegeName || '');
  const [collegeId, setCollegeId] = useState(profile?.collegeId || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // New Settings State
  const [preferences, setPreferences] = useState(profile?.preferences || { emailNotifications: true, smsNotifications: false, theme: 'system' as any });
  const [socialLinks, setSocialLinks] = useState(profile?.socialLinks || { linkedin: '', github: '' });
  const [skills, setSkills] = useState(profile?.skills || '');

  // College Data (Admin)
  const [collegeData, setCollegeData] = useState({ name: '', location: '', lat: '', lng: '' });
  const [isUpdatingCollege, setIsUpdatingCollege] = useState(false);
  
  // Camera & Image State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Expanded Student Settings
  const [careerInterests, setCareerInterests] = useState<string[]>(profile?.preferences?.careerInterests || []);
  const [hobbies, setHobbies] = useState(profile?.preferences?.hobbies || '');
  const [twitterUrl, setTwitterUrl] = useState(profile?.socialLinks?.twitter || '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.socialLinks?.portfolio || '');

  // Dropdown data
  const [allColleges, setAllColleges] = useState<any[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [filteredDepts, setFilteredDepts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all colleges
    const unsubColleges = onSnapshot(collection(db, 'colleges'), (snap) => {
      setAllColleges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Fetch all departments
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      setAllDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubColleges();
      unsubDepts();
    };
  }, []);

  useEffect(() => {
    if (collegeId) {
      setFilteredDepts(allDepartments.filter(d => d.collegeId === collegeId || d.college_id === collegeId));
    } else {
      setFilteredDepts([]);
    }
  }, [collegeId, allDepartments]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'general' | 'permissions' | 'sys_security' | 'college'>('profile');

  useEffect(() => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setRollNo(profile?.rollNo || '');
    setDepartmentId(profile?.departmentId || '');
    setClassName(profile?.class || '');
    setYear(profile?.year || '');
    setProfilePhoto(profile?.profilePhoto || '');
    setPreferences(profile?.preferences || { emailNotifications: true, smsNotifications: false, theme: 'system' as any });
    setSocialLinks(profile?.socialLinks || { linkedin: '', github: '' });
    setSkills(profile?.skills || '');
    setBio(profile?.bio || '');
    setSection(profile?.section || '');
    setCity(profile?.city || '');
    setCollegeName(profile?.collegeName || '');
    setCollegeId(profile?.collegeId || '');
    setCareerInterests(profile?.preferences?.careerInterests || []);
    setHobbies(profile?.preferences?.hobbies || '');
    setTwitterUrl(profile?.socialLinks?.twitter || '');
    setPortfolioUrl(profile?.socialLinks?.portfolio || '');
  }, [profile]);

  useEffect(() => {
    if ((profile?.role === 'admin' || isSuperAdmin) && profile?.collegeId) {
       fetch(`/api/firestore/colleges/${profile.collegeId}`, {
         headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
       }).then(res => res.json()).then(data => {
         if (data.data) setCollegeData({ 
           name: data.data.name || '', 
           location: data.data.location || '',
           lat: data.data.lat || '',
           lng: data.data.lng || ''
         });
       });
    }

    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      setSettings(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemSetting)));
    });

    const unsubPerms = onSnapshot(collection(db, 'permissions'), (snap) => {
      setPermissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PermissionRow)));
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubPerms();
    };
  }, [isSuperAdmin]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is mandatory');
    if (isStudent && !rollNo.trim()) return toast.error('Roll Number is mandatory for students');

    setIsUpdatingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          profilePhoto,
          rollNo,
          className,
          year,
          section,
          departmentId,
          collegeId,
          collegeName,
          city,
          preferences: { ...preferences, careerInterests, hobbies },
          socialLinks: { ...socialLinks, twitter: twitterUrl, portfolio: portfolioUrl },
          skills,
          bio
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');
      
      toast.success('Profile updated successfully');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords don't match");
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to change password');
      
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateSetting = async (id: string, value: any) => {
    try {
      await setDoc(doc(db, 'settings', id), { value }, { merge: true });
      toast.success("Setting updated");
    } catch (err) {
      toast.error("Failed to update setting");
    }
  };

  const togglePermission = async (perm: PermissionRow) => {
    try {
      await setDoc(doc(db, 'permissions', perm.id), { allowed: !perm.allowed }, { merge: true });
      toast.success(`Permission updated for ${perm.role}`);
    } catch (err) {
      toast.error("Failed to update permission");
    }
  };

  const handleUpdateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCollege(true);
    try {
      const response = await fetch('/api/college/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(collegeData)
      });
      if (!response.ok) throw new Error('Failed to update college profile');
      toast.success('College profile updated successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdatingCollege(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload?type=photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await response.json();
      if (data.url) {
        setProfilePhoto(data.url);
        toast.success('Photo uploaded successfully');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      setIsCameraOpen(true);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      toast.error("Could not access camera");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await fetch('/api/upload?type=photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
          });
          const data = await response.json();
          if (data.url) {
            setProfilePhoto(data.url);
            toast.success('Photo captured and uploaded');
            stopCamera();
          }
        } catch (err) {
          toast.error("Failed to upload capture");
        }
      }, 'image/jpeg');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Settings...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-600" /> Account Settings
        </h1>
        {isSuperAdmin && (
          <div className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
            Enterprise RBAC Active
          </div>
        )}
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <User className="w-4 h-4 inline-block mr-2" /> Profile Information
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Key className="w-4 h-4 inline-block mr-2" /> Security Settings
        </button>
        <button 
          onClick={() => setActiveTab('preferences')}
          className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'preferences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <SettingsIcon className="w-4 h-4 inline-block mr-2" /> Preferences & Social
        </button>
        
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('college')}
            className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'college' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 className="w-4 h-4 inline-block mr-2" /> College Profile
          </button>
        )}
        
        {isSuperAdmin && (
          <>
            <button 
              onClick={() => setActiveTab('general')}
              className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              System General
            </button>
            <button 
              onClick={() => setActiveTab('permissions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Dynamic Permissions
            </button>
            <button 
              onClick={() => setActiveTab('sys_security')}
              className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'sys_security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              System Policies
            </button>
          </>
        )}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-6 border-b border-gray-100">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-50 bg-gray-100 flex items-center justify-center">
                {profilePhoto ? (
                  <img 
                    src={profilePhoto.startsWith('http') || profilePhoto.startsWith('/') || profilePhoto.startsWith('data:') ? profilePhoto : `/${profilePhoto}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                       // Fallback if image fails to load
                       const target = e.target as HTMLImageElement;
                       target.onerror = null; // Prevent infinite loop
                       target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || 'User') + "&background=random";
                    }}
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-300" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex gap-2">
                <label className="p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 shadow-lg transition-transform hover:scale-110">
                  <Image className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
                <button 
                  type="button"
                  onClick={startCamera}
                  className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-900 shadow-lg transition-transform hover:scale-110"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900">{name || 'Your Name'}</h3>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">{(profile?.role || '').replace('_', ' ')}</p>
              <p className="text-xs text-blue-600 mt-1">Updates to photo are saved when you click 'Save Changes' at the bottom.</p>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-4">Personal Details</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 text-xs">(Read-only)</span></label>
                <input 
                  type="email" 
                  value={profile?.email || ''} 
                  disabled
                  className="w-full border bg-gray-50 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input 
                  type="text" 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)} 
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Your City"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Professional Biography</label>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                rows={4}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-100 mt-6">
              <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Academic & College Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                  <input 
                    type="text" 
                    value={rollNo} 
                    onChange={(e) => setRollNo(e.target.value)} 
                    disabled={isStudent}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    value={departmentId} 
                    onChange={(e) => setDepartmentId(e.target.value)} 
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={!collegeId || isStudent}
                  >
                    <option value="">Select Department</option>
                    {filteredDepts.map(d => (
                      <option key={d.id} value={d.department_id}>{d.name || d.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  {isStudent ? (
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Class</option>
                      <option value="Diploma">Diploma</option>
                      <option value="B.E">B.E</option>
                      <option value="B.Tech">B.Tech</option>
                      <option value="M.E">M.E</option>
                      <option value="M.Tech">M.Tech</option>
                      <option value="MBA">MBA</option>
                      <option value="MCA">MCA</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={className} 
                      onChange={(e) => setClassName(e.target.value)} 
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  {isStudent ? (
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Year</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)} 
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  {isStudent ? (
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Section</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={section} 
                      onChange={(e) => setSection(e.target.value)} 
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
                  <input 
                    type="text" 
                    value={collegeName} 
                    onChange={(e) => setCollegeName(e.target.value)} 
                    disabled={isStudent}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                  <select 
                    value={collegeId} 
                    onChange={(e) => {
                      setCollegeId(e.target.value);
                      const selectedCol = allColleges.find(c => c.college_id === e.target.value);
                      if (selectedCol) setCollegeName(selectedCol.name || selectedCol.college_name);
                    }} 
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={!isSuperAdmin || isStudent}
                  >
                    <option value="">Select College</option>
                    {allColleges.map(c => (
                      <option key={c.id} value={c.college_id}>{c.name || c.college_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button 
                type="submit" 
                disabled={isUpdatingProfile}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {isUpdatingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Save Profile Changes
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-lg">
          <h3 className="text-lg font-bold mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
                minLength={8}
              />
            </div>
            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isChangingPassword}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-gray-100 disabled:opacity-50"
              >
                {isChangingPassword ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="w-5 h-5" />}
                Update Password
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'preferences' && (
        <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-2xl">
          <h3 className="text-lg font-bold mb-4">Preferences & Social Links</h3>
          <div className="space-y-6">
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Social Branding</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input 
                    type="url" 
                    value={socialLinks.linkedin || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                  <input 
                    type="url" 
                    value={socialLinks.github || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://github.com/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter / X URL</label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="url" 
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      className="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Portfolio</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="url" 
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      className="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isStudent && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                <h4 className="font-semibold text-blue-800 mb-3 text-sm uppercase tracking-wider">Professional Skills</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Skills (Comma separated)</label>
                  <input 
                    type="text" 
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. React, Node.js, Public Speaking, UI/UX"
                  />
                  <p className="text-xs text-blue-600 mt-1">This helps us match you with relevant internship & job opportunities.</p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-bold">Career Interests</label>
                  <div className="flex flex-wrap gap-3">
                    {['Internships', 'Full-time Jobs', 'Higher Studies', 'Entrepreneurship', 'Research'].map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          if (careerInterests.includes(interest)) {
                            setCareerInterests(careerInterests.filter(i => i !== interest));
                          } else {
                            setCareerInterests([...careerInterests, interest]);
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${careerInterests.includes(interest) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Hobbies & Extra-curricular</label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea 
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      rows={2}
                      className="w-full border rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Tell us what you love doing in your free time..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Notifications & UI</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-800">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive updates about your certificates.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPreferences({ ...preferences, emailNotifications: !preferences.emailNotifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${preferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-800">SMS Notifications</p>
                    <p className="text-xs text-gray-500">Receive critical alerts via SMS.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPreferences({ ...preferences, smsNotifications: !preferences.smsNotifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${preferences.smsNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.smsNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="pt-2 border-t border-gray-200 mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">UI Theme Setting</label>
                  <select 
                    value={preferences.theme || 'system'}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
                    className="w-full md:w-1/2 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button 
                type="submit" 
                disabled={isUpdatingProfile}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                {isUpdatingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Save Preferences
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Super Admin Features */}
      {isSuperAdmin && activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.filter(s => s.category === 'upload' || s.category === 'general').map(s => (
            <div key={s.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-800 capitalize">{s.key.replace(/_/g, ' ')}</h4>
                  <p className="text-xs text-gray-500 mt-1">{s.description || 'System-wide parameter'}</p>
                </div>
                {s.category === 'upload' ? <Upload className="w-5 h-5 text-indigo-500" /> : <Database className="w-5 h-5 text-gray-400" />}
              </div>
              <div className="flex gap-2">
                <input 
                  type={typeof s.value === 'number' ? 'number' : 'text'}
                  defaultValue={Array.isArray(s.value) ? s.value.join(', ') : s.value}
                  onBlur={(e) => {
                    let val: any = e.target.value;
                    if (typeof s.value === 'number') val = Number(val);
                    if (Array.isArray(s.value)) val = val.split(',').map((v: string) => v.trim());
                    handleUpdateSetting(s.id, val);
                  }}
                  className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {isSuperAdmin && activeTab === 'permissions' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permissions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900 capitalize">{p.role.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.module}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 italic font-mono">{p.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => togglePermission(p)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${p.allowed ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.allowed ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-yellow-50 flex items-start gap-3 border-t border-yellow-100">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <p className="text-xs text-yellow-700">
              <strong>Warning:</strong> Changes to permissions take effect immediately for all users. Revoking access to the "Certifications" module may disrupt current workflows.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'college' && profile?.role === 'admin' && (
        <form onSubmit={handleUpdateCollege} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">College Profile</h3>
              <p className="text-sm text-gray-500">Manage your institution's public information.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Institution Name</label>
              <input 
                type="text" 
                value={collegeData.name} 
                onChange={(e) => setCollegeData({ ...collegeData, name: e.target.value })} 
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                placeholder="e.g., Global Institute of Technology"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location / Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={collegeData.location} 
                  onChange={(e) => setCollegeData({ ...collegeData, location: e.target.value })} 
                  className="w-full border rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  placeholder="Street, City, State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                <input 
                  type="text" 
                  value={collegeData.lat} 
                  onChange={(e) => setCollegeData({ ...collegeData, lat: e.target.value })} 
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                <input 
                  type="text" 
                  value={collegeData.lng} 
                  onChange={(e) => setCollegeData({ ...collegeData, lng: e.target.value })} 
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl flex items-start gap-3">
              <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Updating your college location will affect Geo-fencing validations for student certificate uploads. Ensure coordinates are accurate for campus premises.
              </p>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit" 
                disabled={isUpdatingCollege}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {isUpdatingCollege ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Update Institution Details
              </button>
            </div>
          </div>
        </form>
      )}

      {isSuperAdmin && activeTab === 'sys_security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.filter(s => s.category === 'security').map(s => (
            <div key={s.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-800 capitalize">{s.key.replace(/_/g, ' ')}</h4>
                  <p className="text-xs text-gray-500 mt-1">{s.description || 'Enterprise security policy'}</p>
                </div>
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex items-center gap-4">
                {typeof s.value === 'boolean' ? (
                  <button 
                    onClick={() => handleUpdateSetting(s.id, !s.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${s.value ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.value ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                ) : (
                  <input 
                    type="number"
                    defaultValue={s.value}
                    onBlur={(e) => handleUpdateSetting(s.id, Number(e.target.value))}
                    className="w-20 border rounded px-3 py-2 text-sm text-center font-bold text-blue-600"
                  />
                )}
                <span className="text-xs font-medium text-gray-600">
                  {typeof s.value === 'boolean' ? (s.value ? 'Enabled' : 'Disabled') : (s.key.includes('timeout') ? 'Minutes' : 'Attempts')}
                </span>
              </div>
            </div>
          ))}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-lg text-white shadow-lg flex flex-col justify-between">
            <div>
              <Shield className="w-10 h-10 mb-4 text-indigo-200" />
              <h4 className="text-xl font-bold">Hardened Security Mode</h4>
              <p className="text-sm text-indigo-100 mt-2 opacity-90">
                All security configurations are strictly enforced at the database query level. Modification of these values is audited.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs bg-white/10 p-2 rounded">
              <Check className="w-3 h-3" /> System Integrity Verified
            </div>
          </div>
        </div>
      )}
      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full relative">
            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative aspect-video bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-6 flex justify-center gap-4">
              <button 
                onClick={stopCamera}
                className="px-6 py-2 border rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={capturePhoto}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700"
              >
                <Camera className="w-5 h-5" /> Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

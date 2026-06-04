import { API_BASE_URL } from '@/config/api';
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db, createUserWithEmailAndPassword, createUserProfile, signInWithEmailAndPassword } from '../api/localApi';
import { ShieldCheck, LogIn, Mail, Lock, User, GraduationCap, Phone, MapPin, Building, BookOpen, Hash, Calendar, Copy, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';
import { toast } from 'sonner';



const Login: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
  const [isSignup, setIsSignup] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  
  // Login/Signup state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [deptId, setDeptId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [year, setYear] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');

  // Invite Code State (new CAMP-DEPT-XXXXXX system + legacy signupCode compat)
  const [signupCode, setSignupCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isAcademicYearLocked, setIsAcademicYearLocked] = useState(false);
  const [verifiedCollegeName, setVerifiedCollegeName] = useState('');
  const [verifiedDeptName, setVerifiedDeptName] = useState('');

  // Dropdown data
  const [colleges, setColleges] = React.useState<any[]>([]);
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [filteredDepts, setFilteredDepts] = React.useState<any[]>([]);

  React.useEffect(() => {
    document.title = isSignup ? 'Skill Track | Signup' : 'Skill Track | Login';
  }, [isSignup]);

  React.useEffect(() => {
    if (isSignup) {
      // Fetch colleges
      fetch(`${API_BASE_URL}/api/public/colleges`).then(res => res.json()).then(data => {
        if (data.data) setColleges(data.data);
      });
      // Fetch departments
      fetch(`${API_BASE_URL}/api/public/departments`).then(res => res.json()).then(data => {
        if (data.data) setDepartments(data.data);
      });
    }
  }, [isSignup]);

  React.useEffect(() => {
    if (collegeId) {
      setFilteredDepts(departments.filter(d => d.collegeId === collegeId || d.college_id === collegeId));
    } else {
      setFilteredDepts([]);
    }
  }, [collegeId, departments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user && profile) {
    const from = (location.state as any)?.from?.pathname || `/dashboard/${profile.role.replace('_', '-')}-dashboard`;
    return <Navigate to={from === '/' ? `/dashboard/${profile.role.replace('_', '-')}-dashboard` : from} replace />;
  }


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      
      if (data.requiresOtp) {
        setShowOtp(true);
        toast.info("OTP sent to your email/phone");
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update local auth context
        auth.currentUser = { ...data.user, getIdToken: () => Promise.resolve(data.token) };
        auth.notify();

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'OTP verification failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update local auth context
      auth.currentUser = { ...data.user, getIdToken: () => Promise.resolve(data.token) };
      auth.notify();

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!signupCode) return;
    setVerifyingCode(true);
    setError('');
    try {
      // Try the new invite-code validation endpoint first (supports both CAMP-* and legacy)
      const response = await fetch(`${API_BASE_URL}/api/invite-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: signupCode.trim().toUpperCase() })
      });
      const result = await response.json();
      if (result.success) {
        setIsCodeVerified(true);
        setCollegeId(result.data.collegeId);
        setCollegeName(result.data.collegeName);
        setDeptId(result.data.departmentId);
        setVerifiedCollegeName(result.data.collegeName || result.data.collegeId);
        setVerifiedDeptName(result.data.departmentName || result.data.departmentId);
        if (result.data.batchYear) setYear(result.data.batchYear);
        if (result.data.role) setRole(result.data.role as UserRole);
        if (result.data.academicYear) {
          setAcademicYear(result.data.academicYear);
          setIsAcademicYearLocked(true);
        } else {
          setIsAcademicYearLocked(false);
        }
        toast.success(`✅ Invite code verified! ${result.data.collegeName} — ${result.data.departmentName}`);
      } else {
        const errMsg = result.message || result.error || 'Invalid or expired invite code';
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      setError('Failed to verify invite code. Please check your connection.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeVerified) {
      setError('Please verify your Department Invite Code first');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const upperCode = signupCode.trim().toUpperCase();
      await createUserWithEmailAndPassword(auth, email.trim(), password.trim(), {
        name,
        role,
        collegeId,
        departmentId: deptId,
        rollNo,
        class: className,
        year,
        academicYear,
        section,
        city,
        phoneNumber,
        collegeName,
        skills,
        bio,
        // Send both field names: new system prefers inviteCode, legacy falls back to signupCode
        inviteCode: upperCode,
        signupCode: upperCode
      });
      toast.success('Sign up successful! Please log in.');
      setIsSignup(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className={`max-w-md w-full space-y-8 bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-100 ${isSignup ? 'max-w-xl' : ''}`}>
        <div>
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignup ? 'Student Sign Up' : 'Sign In'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Student Certificate Tracking & Verification System
          </p>
        </div>

        {/* Login Type Toggle (only if not signing up) */}
        {!isSignup && (
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setLoginType('student')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-md transition-all ${
                loginType === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-md transition-all ${
                loginType === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Staff/Admin</span>
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center font-medium border border-red-100">
            {error}
          </div>
        )}


        <form className="mt-8 space-y-6" onSubmit={showOtp ? handleVerifyOtp : (isSignup ? handleSignup : handleLogin)}>
          {!showOtp ? (
            <>
              <div className={`grid ${isSignup ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {isSignup && (
                  <>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        Department Invite Code
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            required
                            id="dept-invite-code"
                            disabled={isCodeVerified}
                            className={`appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border ${isCodeVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold' : 'border-blue-200 bg-blue-50'} placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase font-mono tracking-widest`}
                            placeholder="CAMP-CSE-XXXXXX"
                            value={signupCode}
                            onChange={(e) => {
                              setSignupCode(e.target.value.toUpperCase());
                              if (isCodeVerified) {
                                setIsCodeVerified(false);
                                setVerifiedCollegeName('');
                                setVerifiedDeptName('');
                              }
                            }}
                          />
                        </div>
                        {!isCodeVerified ? (
                          <button
                            type="button"
                            disabled={!signupCode || verifyingCode}
                            onClick={handleVerifyCode}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-all disabled:bg-blue-300 flex items-center gap-2 whitespace-nowrap"
                          >
                            {verifyingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓ Verify'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCodeVerified(false);
                              setSignupCode('');
                              setVerifiedCollegeName('');
                              setVerifiedDeptName('');
                              setIsAcademicYearLocked(false);
                              setAcademicYear('');
                            }}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-200 transition-all"
                          >
                            Change
                          </button>
                        )}
                      </div>
                      {!isCodeVerified && (
                        <p className="text-[10px] text-blue-500 ml-1">
                          Enter the invite code provided by your institution (format: CAMP-DEPT-XXXXXX)
                        </p>
                      )}
                      {isCodeVerified && (
                        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-700">Invite code verified!</p>
                            <p className="text-[11px] text-emerald-600">
                              🏛️ <strong>{verifiedCollegeName}</strong> &nbsp;•&nbsp; 📚 <strong>{verifiedDeptName}</strong>
                            </p>
                            <p className="text-[10px] text-emerald-500">College &amp; Department have been auto-assigned. Fields below are locked.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isCodeVerified}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="College ID (e.g. COL001)"
                        value={collegeId}
                        onChange={(e) => setCollegeId(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BookOpen className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isCodeVerified}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="Department ID (e.g. CS01)"
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Roll Number"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <GraduationCap className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Class (e.g. B.Tech)"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        required
                        disabled={isAcademicYearLocked}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                      >
                        <option value="">Select Academic Year</option>
                        {(className ? (className.match(/^(M\.|M[A-Z]|PG|Master)/i) ? ['I Year PG', 'II Year PG'] : ['I Year', 'II Year', 'III Year', 'IV Year']) : ['I Year', 'II Year', 'III Year', 'IV Year']).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {isAcademicYearLocked && (
                        <p className="text-[10px] text-emerald-600 mt-1 ml-1 font-semibold">
                          (Auto-detected from invite code)
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Copy className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Phone Number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        disabled={isCodeVerified}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="College Name"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2 relative">
                      <textarea
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Skills (comma separated)"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="md:col-span-2 relative">
                      <textarea
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 font-bold"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <LogIn className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                  </span>
                  {isSignup ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                <p className="text-xs text-blue-700">Enter the 6-digit OTP sent to your registered email.</p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="tracking-[1em] text-center appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-lg font-bold"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || otp.length < 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-400 font-bold"
              >
                Verify & Login
              </button>
              <button
                type="button"
                onClick={() => setShowOtp(false)}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Login
              </button>
            </div>
          )}

          <div className="text-center space-y-4">
            {loginType === 'student' && (
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-blue-600 hover:text-blue-500 block w-full"
              >
                {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            )}
            
            {loginType === 'admin' && (
              <div className="pt-4 border-t border-gray-100">
                <p className="mt-2 text-[10px] text-gray-400 italic">
                  Note: Admin accounts are managed by the Super Admin.
                </p>
              </div>
            )}
          </div>

          </form>
      </div>
    </div>
  );
};

export default Login;

import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Check, 
  X, 
  Eye, 
  TrendingUp, 
  Award, 
  Users, 
  BookOpen, 
  Download, 
  FileText,
  Calendar,
  Layers,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Search,
  ChevronRight,
  Plus,
  Building2,
  Network,
  Mail,
  Phone,
  LayoutDashboard,
  Printer,
  Activity,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';

// Helper: load pdf.js from CDN dynamically
const loadPdfJs = (): Promise<any> => {
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    document.body.appendChild(script);
  });
};

const GRADE_POINTS: Record<string, number> = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, 'RA': 0, 'F': 0
};

const AcademicRecords: React.FC = () => {
  const { profile } = useAuth();

  
  const role = profile?.role || 'student';
  const collegeId = profile?.collegeId || profile?.college_id;
  const departmentId = profile?.departmentId || profile?.department_id;
  const userId = profile?.uid || profile?.id;

  const [subTab, setSubTab] = useState('dashboard');
  
  // Roster lists for directories
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Data loading states
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Core datasets
  const [academicRecords, setAcademicRecords] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Filter States
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Attendance Entry Form States (Staff)
  const [attSem, setAttSem] = useState('1');
  const [attSubjectCode, setAttSubjectCode] = useState('');
  const [attSubjectName, setAttSubjectName] = useState('');
  const [commonConducted, setCommonConducted] = useState('45');
  const [attendanceFormRecords, setAttendanceFormRecords] = useState<any[]>([]);

  // Marks Manual Entry Form States (Staff)
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualRegNo, setManualRegNo] = useState('');
  const [manualSem, setManualSem] = useState('1');
  const [manualSubCode, setManualSubCode] = useState('');
  const [manualSubName, setManualSubName] = useState('');
  const [manualInternal, setManualInternal] = useState('');
  const [manualExternal, setManualExternal] = useState('');
  const [manualCredits, setManualCredits] = useState('3');
  const [manualGrade, setManualGrade] = useState('A');
  const [manualAttendance, setManualAttendance] = useState('90');

  // File upload previews
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');

  // HOD Verification states
  const [pendingMarks, setPendingMarks] = useState<any[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<any[]>([]);
  const [selectedPendingMarks, setSelectedPendingMarks] = useState<string[]>([]);
  const [selectedPendingAttendance, setSelectedPendingAttendance] = useState<string[]>([]);
  const [verificationMode, setVerificationMode] = useState<'marks' | 'attendance'>('marks');
  const [processingReview, setProcessingReview] = useState(false);

  // College Admin Publish Wizard states
  const [publishDept, setPublishDept] = useState('');
  const [publishSem, setPublishSem] = useState('1');
  const [publishYear, setPublishYear] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<'results' | 'attendance'>('results');

  // Load sidebar navigation sub-tabs based on role
  const getSubTabs = () => {
    switch (role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'records', label: 'Academic Records', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance', icon: <Activity className="w-4 h-4" /> },
          { id: 'results', label: 'Semester Results', icon: <Layers className="w-4 h-4" /> },
          { id: 'cgpa', label: 'CGPA Tracker', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'backlogs', label: 'Backlogs', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'analytics', label: 'Academic Analytics', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'downloads', label: 'Downloads', icon: <Download className="w-4 h-4" /> },
        ];
      case 'staff':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance Upload', icon: <Activity className="w-4 h-4" /> },
          { id: 'upload', label: 'Marks Upload', icon: <Upload className="w-4 h-4" /> },
          { id: 'records', label: 'Academic Records', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'results', label: 'Semester Results', icon: <Layers className="w-4 h-4" /> },
          { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
        ];
      case 'hod':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'students', label: 'Department Students', icon: <Users className="w-4 h-4" /> },
          { id: 'staff', label: 'Department Staff', icon: <Users className="w-4 h-4" /> },
          { id: 'approve', label: 'Academic Verification', icon: <CheckCircle className="w-4 h-4" /> },
          { id: 'attendance_analytics', label: 'Attendance Analytics', icon: <Activity className="w-4 h-4" /> },
          { id: 'analytics', label: 'Department Analytics', icon: <TrendingUp className="w-4 h-4" /> },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'departments', label: 'Departments', icon: <Network className="w-4 h-4" /> },
          { id: 'hod', label: 'HOD Management', icon: <Users className="w-4 h-4" /> },
          { id: 'staff', label: 'Staff Management', icon: <Users className="w-4 h-4" /> },
          { id: 'students', label: 'Student Management', icon: <Users className="w-4 h-4" /> },
          { id: 'records', label: 'Academic Records', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'publish', label: 'Academic Publishing', icon: <Layers className="w-4 h-4" /> },
          { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
        ];
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'colleges', label: 'Colleges', icon: <Building2 className="w-4 h-4" /> },
          { id: 'analytics', label: 'Academic Analytics', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'reports', label: 'Global Reports', icon: <FileText className="w-4 h-4" /> },
        ];
      default:
        return [];
    }
  };

  // Fetch generic lists (Colleges, Departments, Users list)
  const fetchGenericData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch colleges
      const colRes = await fetch(`${API_BASE_URL}/api/public/colleges`);
      const colData = await colRes.json();
      if (colData.success) setColleges(colData.data);

      // Fetch departments
      const depRes = await fetch(`${API_BASE_URL}/api/public/departments`);
      const depData = await depRes.json();
      if (depData.success) {
        if (role === 'admin' && collegeId) {
          setDepartments(depData.data.filter((d: any) => d.collegeId === collegeId || d.college_id === collegeId));
        } else {
          setDepartments(depData.data);
        }
      }

      // Fetch directories (HOD, Staff, Students) via /api/admin/users
      if (['hod', 'admin', 'super_admin', 'staff'].includes(role)) {
        const uRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const uData = await uRes.json();
        if (uData.success) {
          setDirectoryUsers(uData.data);
          // If staff view is students tab, sync roster list for attendance input grid too
          if (role === 'staff') {
            const roster = uData.data.filter((u: any) => u.role === 'student');
            setAttendanceFormRecords(roster.map((st: any) => ({
              student_id: st.uid || st.id,
              name: st.name,
              roll_no: st.roll_no,
              classes_conducted: Number(commonConducted),
              classes_attended: Number(commonConducted)
            })));
          }
        }
      }
    } catch (err) {
      console.error("Failed fetching generic list directories:", err);
    }
  };

  // Fetch academic datasets (records, attendance, analytics)
  const fetchAcademicData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterSemester) params.append('semester', filterSemester);
      if (filterYear) params.append('academic_year', filterYear);
      if (filterStatus) params.append('status', filterStatus);

      // 1. Fetch academic records
      const recRes = await fetch(`${API_BASE_URL}/api/academic/records?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const recData = await recRes.json();
      if (recData.success) setAcademicRecords(recData.data);

      // 2. Fetch attendance
      const attRes = await fetch(`${API_BASE_URL}/api/academic/attendance?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attData = await attRes.json();
      if (attData.success) setAttendanceRecords(attData.data);

      // 3. Fetch analytics
      const alyRes = await fetch(`${API_BASE_URL}/api/academic/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const alyData = await alyRes.json();
      if (alyData.success) setAnalyticsData(alyData.data);

      // 4. Fetch verification queues (HOD only)
      if (role === 'hod') {
        const pendingRecs = await fetch(`${API_BASE_URL}/api/academic/records?status=pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const pendingRecsData = await pendingRecs.json();
        if (pendingRecsData.success) setPendingMarks(pendingRecsData.data);

        const pendingAtts = await fetch(`${API_BASE_URL}/api/academic/attendance?status=pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const pendingAttsData = await pendingAtts.json();
        if (pendingAttsData.success) setPendingAttendance(pendingAttsData.data);
      }
    } catch (err) {
      console.error("Failed fetching academic datasets:", err);
      toast.error("Network error. Unable to load latest records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenericData();
    fetchAcademicData();
  }, [filterSemester, filterYear, filterStatus, subTab]);

  // Adjust attendance conducted values in the bulk manual form
  const applyCommonConducted = (val: string) => {
    setCommonConducted(val);
    setAttendanceFormRecords(prev => prev.map(r => ({
      ...r,
      classes_conducted: Number(val),
      classes_attended: Math.min(r.classes_attended, Number(val))
    })));
  };

  const handleAttendanceRowChange = (index: number, field: string, val: number) => {
    setAttendanceFormRecords(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: val
      };
      // Prevent attended > conducted
      if (field === 'classes_attended') {
        copy[index].classes_attended = Math.min(val, copy[index].classes_conducted);
      } else if (field === 'classes_conducted') {
        copy[index].classes_attended = Math.min(copy[index].classes_attended, val);
      }
      return copy;
    });
  };

  // Submit manual marks upload (Staff)
  const handleManualMarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRegNo || !manualSubCode || !manualSubName || !manualInternal || !manualExternal) {
      toast.error("Please fill out all marks fields.");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // Resolve student uid based on register number
      const match = directoryUsers.find(u => u.role === 'student' && (u.roll_no === manualRegNo || u.email === manualRegNo));
      if (!match) {
        toast.error(`Student register number ${manualRegNo} not found in this department.`);
        return;
      }

      const mockPayload = [{
        student_id: match.uid || match.id,
        register_no: manualRegNo,
        semester: Number(manualSem),
        subject_code: manualSubCode,
        subject_name: manualSubName,
        internal_mark: Number(manualInternal),
        external_mark: Number(manualExternal),
        grade: manualGrade,
        credits: Number(manualCredits),
        attendance_percentage: Number(manualAttendance)
      }];

      const res = await fetch(`${API_BASE_URL}/api/academic/records/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: 'Manual Entry',
          fileType: 'manual',
          records: mockPayload
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsManualEntry(false);
        setManualRegNo('');
        setManualSubCode('');
        setManualSubName('');
        setManualInternal('');
        setManualExternal('');
        setSubTab('records');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed saving manual records.");
    }
  };

  // Submit Bulk Attendance entries (Staff)
  const handleSaveAttendance = async () => {
    if (!attSubjectCode || !attSubjectName) {
      toast.error("Please enter Subject Code & Subject Name before saving.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payloadRecords = attendanceFormRecords.map(r => ({
        student_id: r.student_id,
        semester: Number(attSem),
        subject_code: attSubjectCode.toUpperCase(),
        subject_name: attSubjectName,
        classes_conducted: r.classes_conducted,
        classes_attended: r.classes_attended
      }));

      const res = await fetch(`${API_BASE_URL}/api/academic/attendance/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ records: payloadRecords })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setAttSubjectCode('');
        setAttSubjectName('');
        setSubTab('dashboard');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed saving attendance rosters.");
    } finally {
      setLoading(false);
    }
  };

  // File Upload Handlers (Excel/CSV/PDF parsing preview)
  const parsePdfClientSide = async (file: File) => {
    try {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const pdfjsLib = await loadPdfJs();
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const textItems = textContent.items.map((item: any) => item.str);
          fullText += textItems.join(' ') + '\n';
        }
        
        // Find semester
        let semester = 1;
        const semMatch = fullText.match(/(?:Semester|Sem|SEM)\s*[:\-]?\s*([1-8])/i);
        if (semMatch) semester = parseInt(semMatch[1], 10);

        // Subject Regex scanning
        const recordsRegex = /([A-Z]{2,5}\d{3,5})\s+([A-Za-z0-9\s\-&]+?)\s+(\d{1,3})\s+(\d{1,3})\s+([OABCFU\+\-]+)\s+(\d)/g;
        let match;
        const tempRecords: any[] = [];
        
        while ((match = recordsRegex.exec(fullText)) !== null) {
          tempRecords.push({
            'Subject Code': match[1],
            'Subject Name': match[2].trim(),
            'Semester': semester,
            'Internal': parseInt(match[3], 10),
            'External': parseInt(match[4], 10),
            'Grade': match[5],
            'Credits': parseInt(match[6], 10),
            'Attendance': 90
          });
        }

        if (tempRecords.length === 0) {
          // fallback codes matching
          const codeRegex = /([A-Z]{2,5}\d{3,5})/g;
          const codes = fullText.match(codeRegex) || [];
          codes.forEach((code) => {
            tempRecords.push({
              'Subject Code': code,
              'Subject Name': `Subject ${code}`,
              'Semester': semester,
              'Internal': 18,
              'External': 45,
              'Grade': 'B+',
              'Credits': 3,
              'Attendance': 95
            });
          });
        }

        uploadParsedJSON(tempRecords, file.name, 'pdf');
      };
    } catch (err) {
      console.error(err);
      toast.error("Failed client-side PDF parsing.");
    }
  };

  const uploadParsedJSON = async (records: any[], fileName: string, fileType: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/academic/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ records, fileName, fileType })
      });
      const data = await res.json();
      if (data.success) {
        setUploadPreview(data.records);
        setPreviewFileName(data.fileName);
        setPreviewFileType(data.fileType);
        toast.success("Parsed documents. Matches shown below.");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed uploading parsed mock JSON.");
    }
  };

  const handleUploadFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadPreview([]);
    const fileExtension = uploadFile.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'pdf') {
      await parsePdfClientSide(uploadFile);
      setUploading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch(`${API_BASE_URL}/api/academic/records/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadPreview(data.records);
        setPreviewFileName(data.fileName);
        setPreviewFileType(data.fileType);
        toast.success("File parsed successfully. Review mappings below.");
      } else {
        throw new Error(data.error || "Failed uploading Excel/CSV");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload process encountered an error.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/academic/records/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: previewFileName,
          fileType: previewFileType,
          records: uploadPreview.filter(r => r.matched)
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        setUploadPreview([]);
        setUploadFile(null);
        setSubTab('records');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed confirming import preview.");
    }
  };

  // Review & Verification (HOD)
  const handleVerificationReview = async (action: 'approved' | 'rejected') => {
    const list = verificationMode === 'marks' ? selectedPendingMarks : selectedPendingAttendance;
    if (list.length === 0) {
      toast.error("Please select at least one record from the queue.");
      return;
    }
    setProcessingReview(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = verificationMode === 'marks' 
        ? `${API_BASE_URL}/api/academic/records/review` 
        : `${API_BASE_URL}/api/academic/attendance/review`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordIds: list,
          action
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        if (verificationMode === 'marks') {
          setSelectedPendingMarks([]);
        } else {
          setSelectedPendingAttendance([]);
        }
        fetchAcademicData();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Verification review processing failed.");
    } finally {
      setProcessingReview(false);
    }
  };

  // Publish Wizard Submission (College Admin)
  const handlePublishResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishDept || !publishSem || !publishYear) {
      toast.error("All parameters are required to publish results.");
      return;
    }
    setPublishing(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = publishMode === 'results'
        ? `${API_BASE_URL}/api/academic/records/publish`
        : `${API_BASE_URL}/api/academic/attendance/publish`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: publishDept,
          semester: publishSem,
          academicYear: publishYear
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        setPublishDept('');
        setPublishYear('');
        setSubTab('records');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Publish trigger failed.");
    } finally {
      setPublishing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-120px)] antialiased text-slate-800">
      
      {/* ─── LEFT SUB-SIDEBAR ─────────────────────────────────── */}
      <aside className="w-full lg:w-64 bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-2 shadow-xl shadow-slate-100/30 h-fit">
        <div className="pb-3 border-b border-slate-100 mb-2 px-2">
          <h3 className="font-black text-slate-900 tracking-tight uppercase text-xs">Navigation</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{role.replace('_', ' ')} Dashboard</p>
        </div>
        
        {getSubTabs().map((tab) => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </aside>

      {/* ─── RIGHT CONTENT PANEL ─────────────────────────────── */}
      <main className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-100/30 min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-3" />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing academic records...</span>
          </div>
        ) : (
          <>
            {/* ==================================================== */}
            {/* 1. STUDENT DASHBOARD VIEW                            */}
            {/* ==================================================== */}
            {role === 'student' && (
              <>
                {subTab === 'dashboard' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">Academic Summary</h2>
                      <p className="text-xs text-slate-400 mt-1">Real-time breakdown of GPA, CGPA, Attendance and earned credits.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Current Sem Widget */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 p-5 rounded-2xl border border-indigo-100/50 flex flex-col justify-between shadow-sm">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Current Sem</span>
                          <span className="text-2xl font-black text-slate-900 mt-1 block">Semester {profile?.semester || 3}</span>
                        </div>
                      </div>

                      {/* CGPA Widget */}
                      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-2xl text-white flex flex-col justify-between shadow-lg shadow-indigo-100">
                        <Award className="w-5 h-5 text-indigo-200" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest block">Cumulative CGPA</span>
                          <div className="flex items-baseline mt-1">
                            <span className="text-3xl font-black">{analyticsData?.cgpa ? analyticsData.cgpa.toFixed(2) : '0.00'}</span>
                            <span className="text-[10px] font-bold opacity-75 ml-1">/ 10.0</span>
                          </div>
                        </div>
                      </div>

                      {/* GPA Widget */}
                      <div className="bg-gradient-to-br from-violet-50 to-violet-100/30 p-5 rounded-2xl border border-violet-100/50 flex flex-col justify-between shadow-sm">
                        <TrendingUp className="w-5 h-5 text-violet-600" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Latest Sem GPA</span>
                          <span className="text-2xl font-black text-slate-900 mt-1 block">
                            {analyticsData?.semesters && analyticsData.semesters.length > 0 
                              ? analyticsData.semesters[analyticsData.semesters.length - 1].gpa.toFixed(2) 
                              : '0.00'}
                          </span>
                        </div>
                      </div>

                      {/* Attendance Widget */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 p-5 rounded-2xl border border-emerald-100/50 flex flex-col justify-between shadow-sm">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Attendance</span>
                          <span className="text-2xl font-black text-slate-900 mt-1 block">
                            {attendanceRecords.length > 0
                              ? (attendanceRecords.reduce((acc, curr) => acc + curr.attendance_percentage, 0) / attendanceRecords.length).toFixed(1) + '%'
                              : '100%'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                      {/* Backlogs Widget */}
                      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Backlogs</span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full">Alert</span>
                        </div>
                        <div className="mt-6">
                          <span className="text-3xl font-black text-red-600">{analyticsData?.backlogs || 0}</span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-bold">Failed subjects remaining</span>
                        </div>
                      </div>

                      {/* Credits Earned */}
                      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Credits Earned</span>
                        <div className="mt-6">
                          <span className="text-3xl font-black text-indigo-600">
                            {academicRecords.filter(r => r.status === 'published' && !['U', 'RA', 'F'].includes(r.grade)).reduce((acc, curr) => acc + curr.credits, 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-bold">Earned toward degree</span>
                        </div>
                      </div>

                      {/* Credits Pending */}
                      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Credits Pending</span>
                        <div className="mt-6">
                          <span className="text-3xl font-black text-amber-500">
                            {academicRecords.filter(r => r.status === 'published' && ['U', 'RA', 'F'].includes(r.grade)).reduce((acc, curr) => acc + curr.credits, 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-bold">Credits from failed subjects</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {subTab === 'records' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Academic Marksheets</h2>
                        <p className="text-xs text-slate-400 mt-1">Official semester-wise results published by college administration.</p>
                      </div>
                      <select 
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold cursor-pointer"
                      >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {academicRecords.length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-sm">No published marksheet records.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Subject</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Internals</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Externals</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Total</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Grade</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Credits</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {academicRecords.map((rec) => {
                                const isFail = ['U', 'RA', 'F'].includes(rec.grade) || rec.result === 'Fail';
                                return (
                                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">{rec.subject_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.subject_code}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-600">
                                      Sem {rec.semester}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-600 font-mono">
                                      {rec.internal_mark}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-600 font-mono">
                                      {rec.external_mark}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-black text-slate-900 font-mono">
                                      {rec.total_mark}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-black ${
                                        isFail ? 'bg-red-50 text-red-600 border border-red-100/50' : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                                      }`}>
                                        {rec.grade}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-500 font-bold font-mono">
                                      {rec.credits}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${
                                        isFail ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                                      }`}>
                                        {rec.result || (isFail ? 'Fail' : 'Pass')}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'attendance' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Attendance Tracking</h2>
                      <p className="text-xs text-slate-400 mt-1">Detailed stats of classes conducted, attended and subject-wise averages.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {attendanceRecords.length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-sm">No published attendance details found.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Subject</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Classes Conducted</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Classes Attended</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Percentage</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Trend</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {attendanceRecords.map((att) => {
                                const isLow = att.attendance_percentage < 75;
                                return (
                                  <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">{att.subject_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{att.subject_code}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-600">
                                      Sem {att.semester}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-650 font-mono font-bold">
                                      {att.classes_conducted}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-650 font-mono font-bold">
                                      {att.classes_attended}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                      <span className={`text-sm font-black font-mono ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {att.attendance_percentage}%
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, att.attendance_percentage)}%` }}
                                          />
                                        </div>
                                        {isLow && (
                                          <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50 flex items-center gap-0.5">
                                            <AlertTriangle className="w-2.5 h-2.5" /> Low
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'results' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Semester Performance Reports</h2>
                      <p className="text-xs text-slate-400 mt-1">Consolidated transcripts showing credit allocations and GPAs.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {(!analyticsData?.semesters || analyticsData.semesters.length === 0) ? (
                        <div className="p-12 text-center text-slate-450 text-sm">No semester results recorded.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">GPA</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">CGPA</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Total Credits</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Credits Earned</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Credits Pending</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Arrears</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {analyticsData.semesters.map((sem: any) => (
                                <tr key={sem.semester} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                    Semester {sem.semester}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-black text-indigo-600 font-mono">
                                    {sem.gpa.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-black text-slate-800 font-mono">
                                    {sem.cgpa.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-650 font-bold font-mono">
                                    {sem.total_credits || 0}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-650 font-bold font-mono">
                                    {sem.credits_earned || 0}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-600 font-mono">
                                    {sem.credits_pending || 0}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-black ${
                                      sem.backlogs > 0 ? 'bg-red-55 text-red-600' : 'bg-emerald-55 text-emerald-600'
                                    }`}>
                                      {sem.backlogs || 0}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'cgpa' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">CGPA Progress Tracker</h2>
                      <p className="text-xs text-slate-400 mt-1">Growth chart showing CGPA curves over semesters.</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-250/50 flex flex-col items-center">
                      {(!analyticsData?.semesters || analyticsData.semesters.length === 0) ? (
                        <div className="p-12 text-slate-400 text-sm">No semesters records available to plot CGPA curves.</div>
                      ) : (
                        <div className="w-full max-w-lg mt-4">
                          <svg viewBox="0 0 500 200" className="w-full overflow-visible">
                            <defs>
                              <linearGradient id="cgpaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>
                            {/* Grid Lines */}
                            {[0, 2, 4, 6, 8, 10].map((y, i) => {
                              const yPos = 180 - (y * 16);
                              return (
                                <g key={i}>
                                  <line x1="40" y1={yPos} x2="480" y2={yPos} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4" />
                                  <text x="15" y={yPos + 4} className="text-[10px] font-bold fill-slate-450 font-mono">{y}</text>
                                </g>
                              );
                            })}

                            {/* Line Plot */}
                            {(() => {
                              const points = analyticsData.semesters.map((s: any, idx: number) => {
                                const total = analyticsData.semesters.length;
                                const x = 40 + (idx * (440 / Math.max(1, total - 1)));
                                const y = 180 - (s.cgpa * 16);
                                return { x, y, cgpa: s.cgpa, sem: s.semester };
                              });

                              const pathStr = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                              const fillPathStr = points.length > 0 
                                ? `${pathStr} L ${points[points.length-1].x} 180 L ${points[0].x} 180 Z` 
                                : '';

                              return (
                                <>
                                  {points.length > 1 && (
                                    <>
                                      <path d={fillPathStr} fill="url(#cgpaGrad)" />
                                      <path d={pathStr} fill="none" stroke="#4f46e5" strokeWidth="3" />
                                    </>
                                  )}
                                  {points.map((p: any, i: number) => (
                                    <g key={i}>
                                      <circle cx={p.x} cy={p.y} r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                                      <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-black fill-slate-800 font-mono">{p.cgpa.toFixed(2)}</text>
                                      <text x={p.x} y="195" textAnchor="middle" className="text-[9px] font-bold fill-slate-400">Sem {p.sem}</text>
                                    </g>
                                  ))}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'backlogs' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Active Backlogs List</h2>
                      <p className="text-xs text-slate-400 mt-1">Pending backlogs requiring registration and re-examination.</p>
                    </div>

                    <div className="bg-white border border-slate-250/60 rounded-2xl overflow-hidden shadow-sm">
                      {academicRecords.filter(r => r.status === 'published' && ['U', 'RA', 'F'].includes(r.grade)).length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-sm">Congratulations! No active backlogs.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Subject Code</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Subject Name</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Grade</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Total Marks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {academicRecords.filter(r => r.status === 'published' && ['U', 'RA', 'F'].includes(r.grade)).map((rec) => (
                                <tr key={rec.id} className="hover:bg-red-50/10 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-red-600">
                                    {rec.subject_code}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                    {rec.subject_name}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-slate-650">
                                    Semester {rec.semester}
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-black text-xs rounded">
                                      {rec.grade}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap font-mono font-black text-slate-900">
                                    {rec.total_mark}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Academic Analytics Dashboard</h2>
                      <p className="text-xs text-slate-400 mt-1">Breakdown distributions of grades and achievements.</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                      <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">Grades Allocation Count</h3>
                      <div className="flex flex-wrap gap-4 items-end justify-center min-h-[150px] pt-6">
                        {['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'F'].map(gr => {
                          const count = academicRecords.filter(r => r.grade === gr && r.status === 'published').length;
                          const maxCount = Math.max(1, ...['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'F'].map(g => academicRecords.filter(r => r.grade === g && r.status === 'published').length));
                          const heightPct = (count / maxCount) * 100;
                          return (
                            <div key={gr} className="flex flex-col items-center gap-2 w-12">
                              <span className="text-[10px] font-black text-slate-800 font-mono">{count}</span>
                              <div className="w-8 bg-slate-200 rounded-t-lg h-24 relative overflow-hidden">
                                <div 
                                  className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-500 ${
                                    ['U','RA','F'].includes(gr) ? 'bg-red-500' : 'bg-indigo-600'
                                  }`} 
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-450">{gr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {subTab === 'downloads' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Report Card Downloads</h2>
                        <p className="text-xs text-slate-400 mt-1">Generate print-ready transcripts and consolidated marksheets.</p>
                      </div>
                      <button
                        onClick={handlePrint}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-750 shadow-md shadow-indigo-150 flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" /> Print Transcript
                      </button>
                    </div>

                    {/* Styled Transcript for Print preview */}
                    <div id="printable-transcript" className="bg-white border border-slate-250 rounded-2xl p-8 max-w-3xl mx-auto shadow-sm print:shadow-none print:border-none print:p-0">
                      <div className="text-center border-b border-slate-200 pb-5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{profile?.college_name || 'SkillTrack Academy'}</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Consolidated Student Grade Transcript</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 my-6 text-xs border-b border-slate-100 pb-5">
                        <div>
                          <div className="flex py-1"><span className="w-24 font-bold text-slate-400">STUDENT NAME:</span><span className="font-black text-slate-800">{profile?.name}</span></div>
                          <div className="flex py-1"><span className="w-24 font-bold text-slate-400">REGISTER NO:</span><span className="font-bold text-slate-800 font-mono">{profile?.roll_no || 'N/A'}</span></div>
                          <div className="flex py-1"><span className="w-24 font-bold text-slate-400">EMAIL ID:</span><span className="font-bold text-slate-800">{profile?.email}</span></div>
                        </div>
                        <div>
                          <div className="flex py-1"><span className="w-24 font-bold text-slate-400">COLLEGE ID:</span><span className="font-bold text-slate-800 font-mono">{collegeId}</span></div>
                          <div className="flex py-1"><span className="w-24 font-bold text-slate-400">DEPARTMENT:</span><span className="font-black text-slate-850">{profile?.department_name || departmentId}</span></div>
                          <div className="flex py-1"><span className="w-24 font-bold text-slate-400">BATCH YEAR:</span><span className="font-bold text-slate-800 font-mono">{profile?.academic_year || '2024-2028'}</span></div>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-55">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-slate-600">SUBJECT</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600">SEMESTER</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600">MARKS</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600">GRADE</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600">CREDITS</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600">RESULT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {academicRecords.filter(r => r.status === 'published').map((rec) => (
                              <tr key={rec.id}>
                                <td className="px-4 py-3 font-bold text-slate-850">{rec.subject_name} ({rec.subject_code})</td>
                                <td className="px-4 py-3 text-center">{rec.semester}</td>
                                <td className="px-4 py-3 text-center font-bold">{rec.total_mark}</td>
                                <td className="px-4 py-3 text-center font-black">{rec.grade}</td>
                                <td className="px-4 py-3 text-center font-bold">{rec.credits}</td>
                                <td className="px-4 py-3 text-center font-black uppercase tracking-tighter">{rec.result || 'Pass'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center mt-8 pt-5 border-t border-slate-150">
                        <div className="text-xs">
                          <div className="flex py-1"><span className="font-bold text-slate-450 mr-2">TOTAL CREDITS EARNED:</span><span className="font-black text-indigo-600">{academicRecords.filter(r => r.status === 'published' && !['U', 'RA', 'F'].includes(r.grade)).reduce((acc, curr) => acc + curr.credits, 0)}</span></div>
                          <div className="flex py-1"><span className="font-bold text-slate-450 mr-2">CUMULATIVE CGPA:</span><span className="font-black text-slate-900">{(analyticsData?.cgpa || 0).toFixed(2)}</span></div>
                        </div>
                        <div className="text-center">
                          <div className="w-32 h-[1px] bg-slate-400 mx-auto mt-8 mb-1" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Office of Controller</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ==================================================== */}
            {/* 2. STAFF DASHBOARD VIEW                              */}
            {/* ==================================================== */}
            {role === 'staff' && (
              <>
                {subTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Staff Roster & Summary</h2>
                      <p className="text-xs text-slate-400 mt-1">Manage uploads, attendance entry logs, and subject performance dashboards.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between shadow-sm">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Assigned Class</span>
                          <span className="text-xl font-black text-slate-900 block mt-1">Semester {profile?.current_semester || profile?.semester || '3'}</span>
                          <span className="text-[10px] text-indigo-500 font-mono font-bold block mt-1">{profile?.academic_year || '2024-2028'} Batch</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between shadow-sm">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total Uploads</span>
                          <span className="text-2xl font-black text-slate-900 block mt-1">{academicRecords.length} Records</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Pending Reviews</span>
                          <span className="text-2xl font-black text-amber-500 block mt-1">{academicRecords.filter(r => r.status === 'pending').length} Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {subTab === 'students' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Assigned Student Roster</h2>
                        <p className="text-xs text-slate-400 mt-1"> Roster list locked to your assigned semester and academic year batch.</p>
                      </div>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search register no or name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white w-full sm:w-64"
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {directoryUsers.filter(u => u.role === 'student').length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-sm">No assigned students found in database.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Register No / Roll No</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Student Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Email Address</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Academic Year</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {directoryUsers
                                .filter(u => u.role === 'student' && (
                                  u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (u.roll_no && u.roll_no.toLowerCase().includes(searchQuery.toLowerCase()))
                                ))
                                .map((st) => (
                                  <tr key={st.uid || st.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-700">
                                      {st.roll_no || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                      {st.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                      {st.email}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs font-bold text-slate-650">
                                      Sem {st.semester || 3}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-xs font-mono text-indigo-600">
                                      {st.academic_year || '2024-2028'}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'attendance' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Attendance Roster Entry</h2>
                      <p className="text-xs text-slate-400 mt-1">Configure subjects and upload attendance stats for isolation-approved students.</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Subject Code</label>
                          <input
                            type="text"
                            placeholder="e.g. CS301"
                            value={attSubjectCode}
                            onChange={(e) => setAttSubjectCode(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Subject Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Database Systems"
                            value={attSubjectName}
                            onChange={(e) => setAttSubjectName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Semester</label>
                          <select
                            value={attSem}
                            onChange={(e) => setAttSem(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                          >
                            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Conducted Classes (Apply to all)</label>
                          <input
                            type="number"
                            value={commonConducted}
                            onChange={(e) => applyCommonConducted(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Roll No</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Student Name</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Conducted</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Attended</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Attendance %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {attendanceFormRecords.map((r, index) => {
                            const pct = r.classes_conducted > 0 ? ((r.classes_attended / r.classes_conducted) * 100).toFixed(1) : '0';
                            return (
                              <tr key={r.student_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-600">
                                  {r.roll_no}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                  {r.name}
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                  <input 
                                    type="number"
                                    value={r.classes_conducted}
                                    onChange={(e) => handleAttendanceRowChange(index, 'classes_conducted', Number(e.target.value))}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-xs font-mono font-bold"
                                  />
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                  <input 
                                    type="number"
                                    value={r.classes_attended}
                                    onChange={(e) => handleAttendanceRowChange(index, 'classes_attended', Number(e.target.value))}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-xs font-mono font-bold"
                                  />
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap font-black font-mono text-indigo-600">
                                  {pct}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={handleSaveAttendance}
                        disabled={attendanceFormRecords.length === 0}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-705 shadow-md shadow-indigo-150 transition-colors disabled:bg-indigo-300"
                      >
                        Submit Attendance For Review
                      </button>
                    </div>
                  </div>
                )}

                {subTab === 'upload' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Marksheets Upload System</h2>
                        <p className="text-xs text-slate-400 mt-1">Upload grade reports or enter details manually below.</p>
                      </div>
                      <button
                        onClick={() => setIsManualEntry(!isManualEntry)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                      >
                        {isManualEntry ? 'Upload Files Instead' : 'Manual Form Entry'}
                      </button>
                    </div>

                    {isManualEntry ? (
                      <form onSubmit={handleManualMarksSubmit} className="max-w-xl mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200/50 space-y-4">
                        <h3 className="font-black text-slate-900 text-sm">Add Academic Record</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Student Register No</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. E2E_ROLL_123"
                              value={manualRegNo}
                              onChange={(e) => setManualRegNo(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Semester</label>
                            <select
                              value={manualSem}
                              onChange={(e) => setManualSem(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                            >
                              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Subject Code</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. CS301"
                              value={manualSubCode}
                              onChange={(e) => setManualSubCode(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Subject Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Database Systems"
                              value={manualSubName}
                              onChange={(e) => setManualSubName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Internal Mark</label>
                            <input
                              type="number"
                              required
                              placeholder="Max 20"
                              value={manualInternal}
                              onChange={(e) => setManualInternal(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">External Mark</label>
                            <input
                              type="number"
                              required
                              placeholder="Max 80"
                              value={manualExternal}
                              onChange={(e) => setManualExternal(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Attendance %</label>
                            <input
                              type="number"
                              required
                              placeholder="e.g. 90"
                              value={manualAttendance}
                              onChange={(e) => setManualAttendance(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Credits</label>
                            <select
                              value={manualCredits}
                              onChange={(e) => setManualCredits(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                            >
                              {[1,2,3,4,5].map(c => <option key={c} value={c}>{c} Credits</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Grade</label>
                            <select
                              value={manualGrade}
                              onChange={(e) => setManualGrade(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                            >
                              {['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'F'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150"
                        >
                          Submit Record
                        </button>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 h-fit">
                          <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">Select Files</h3>
                          <form onSubmit={handleUploadFileSubmit} className="space-y-4">
                            <div className="border-2 border-dashed border-slate-250 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer relative flex flex-col items-center justify-center bg-white transition-colors">
                              <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv, .pdf"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                              />
                              <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-xs font-bold text-slate-800 block truncate w-full">
                                {uploadFile ? uploadFile.name : 'Choose File'}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1 block">Supports XLSX, CSV or PDF. Max 10MB.</span>
                            </div>
                            <button
                              type="submit"
                              disabled={!uploadFile || uploading}
                              className="w-full py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-705 shadow-md shadow-indigo-150 transition-colors disabled:bg-indigo-300 flex items-center justify-center gap-2"
                            >
                              {uploading ? 'Parsing marksheets...' : 'Parse and Preview'}
                            </button>
                          </form>
                        </div>

                        <div className="lg:col-span-2 bg-white border border-slate-200/60 p-5 rounded-2xl">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h3 className="font-black text-slate-950 text-sm">Upload Preview List</h3>
                              <p className="text-[10px] text-slate-400 font-medium">Verify auto-matched database students before saving.</p>
                            </div>
                            {uploadPreview.length > 0 && (
                              <button
                                onClick={handleConfirmImport}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 flex items-center gap-1.5 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Confirm and Save
                              </button>
                            )}
                          </div>

                          {uploadPreview.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                              Upload a grade file to render the verification mappings.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="min-w-full divide-y divide-slate-100 text-xs">
                                <thead className="bg-slate-55">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500">Reg No</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500">Student Profile Match</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500">Subject</th>
                                    <th className="px-4 py-3 text-center font-bold text-slate-500">Total Marks</th>
                                    <th className="px-4 py-3 text-center font-bold text-slate-500">Grade</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {uploadPreview.map((rec, idx) => (
                                    <tr key={idx} className={rec.matched ? 'hover:bg-slate-50/30' : 'bg-red-50/15'}>
                                      <td className="px-4 py-3 font-mono font-bold text-slate-650">{rec.register_no}</td>
                                      <td className="px-4 py-3">
                                        {rec.matched ? (
                                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {rec.student_name}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 text-red-650 font-bold">
                                            <AlertTriangle className="w-3.5 h-3.5" /> No match (Row skipped)
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 font-bold">{rec.subject_name} ({rec.subject_code})</td>
                                      <td className="px-4 py-3 text-center font-black">{rec.internal_mark + rec.external_mark}</td>
                                      <td className="px-4 py-3 text-center font-bold">{rec.grade}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {subTab === 'records' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Uploaded Records List</h2>
                        <p className="text-xs text-slate-400 mt-1">Review status details of marks sheets uploaded for review.</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {academicRecords.length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-sm">No uploaded records found.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Student</th>
                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Subject</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Total Marks</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Grade</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {academicRecords.map((rec) => (
                                <tr key={rec.id} className="hover:bg-slate-55/20 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-slate-900">{rec.student_name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.roll_no || rec.student_id}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-slate-900">{rec.subject_name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.subject_code}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap">Sem {rec.semester}</td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap font-black font-mono">{rec.total_mark}</td>
                                  <td className="px-6 py-4 text-center whitespace-nowrap font-black text-indigo-650">{rec.grade}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                                      rec.status === 'published' ? 'bg-emerald-50 text-emerald-700' : rec.status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {rec.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'results' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Semester GPAs Overview</h2>
                      <p className="text-xs text-slate-400 mt-1">GPAs lists of active students in your department.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {academicRecords.length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-sm">No published student results available.</div>
                      ) : (
                        <div className="p-6 text-center text-slate-450 text-xs">
                          Student GPAs are computed automatically once results are published. Visit the Analytics tab to view pass rates.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Assigned Subject analytics</h2>
                      <p className="text-xs text-slate-400 mt-1">Review comparative pass percentages and student distributions.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 p-6 rounded-2xl">
                      <h3 className="font-black text-slate-950 text-sm mb-6 uppercase tracking-wider">Pass Rate per Subject</h3>
                      {(!analyticsData || !Array.isArray(analyticsData)) ? (
                        <div className="p-12 text-center text-slate-400 text-xs">No active subject analytics.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {analyticsData.map((sub: any) => (
                            <div key={sub.subject_code} className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                              <span className="text-[10px] font-black font-mono text-indigo-600 uppercase tracking-widest">{sub.subject_code}</span>
                              <h4 className="font-black text-xs text-slate-900 mt-1 truncate">{sub.subject_name}</h4>
                              <div className="mt-6">
                                <div className="flex justify-between items-baseline text-xs mb-1.5">
                                  <span className="text-slate-450 font-bold">Pass Rate</span>
                                  <span className="font-black text-slate-900">{sub.pass_percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${sub.pass_percentage}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold block mt-2">Total Students: {sub.total_students}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ==================================================== */}
            {/* 3. HOD VIEW PANEL                                    */}
            {/* ==================================================== */}
            {role === 'hod' && (
              <>
                {subTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Department Overview</h2>
                      <p className="text-xs text-slate-400 mt-1">Overview analytics and approval trackers for HOD.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Users className="w-5 h-5 text-indigo-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total Students</span>
                          <span className="text-2xl font-black text-slate-900 block mt-1">
                            {directoryUsers.filter(u => u.role === 'student').length} Registered
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Average CGPA</span>
                          <span className="text-2xl font-black text-emerald-600 block mt-1">
                            {analyticsData?.avg_cgpa ? analyticsData.avg_cgpa.toFixed(2) : '0.00'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Department Backlogs</span>
                          <span className="text-2xl font-black text-red-550 block mt-1">
                            {analyticsData?.total_backlogs || 0} Backlogs
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {subTab === 'students' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Department Students Directory</h2>
                        <p className="text-xs text-slate-400 mt-1">Roster of all students enrolled in your department.</p>
                      </div>
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs w-64"
                      />
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Roll No</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Student Name</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Semester</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Academic Year</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {directoryUsers
                            .filter(u => u.role === 'student' && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((st) => (
                              <tr key={st.uid || st.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-650">{st.roll_no || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{st.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-450">{st.email}</td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">Sem {st.semester || 3}</td>
                                <td className="px-6 py-4 text-center whitespace-nowrap font-mono text-indigo-650">{st.academic_year}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'staff' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Department Staff Directory</h2>
                      <p className="text-xs text-slate-400 mt-1">Listing of academic staff and their course batches assignments.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Staff Name</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Assigned Year</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Assigned Semester</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {directoryUsers.filter(u => u.role === 'staff').map((st) => (
                            <tr key={st.uid || st.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{st.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-450">{st.email}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap font-mono text-indigo-650">{st.academic_year || 'All Years'}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">Sem {st.semester || 'All Semesters'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'approve' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Academic Verification Queue</h2>
                        <p className="text-xs text-slate-400 mt-1">Review pending marksheets and attendance uploaded by your department staff.</p>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button 
                          onClick={() => setVerificationMode('marks')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            verificationMode === 'marks' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'
                          }`}
                        >
                          Marksheets
                        </button>
                        <button 
                          onClick={() => setVerificationMode('attendance')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            verificationMode === 'attendance' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'
                          }`}
                        >
                          Attendance
                        </button>
                      </div>
                    </div>

                    {verificationMode === 'marks' ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-bold">{pendingMarks.length} pending marksheets</span>
                          {selectedPendingMarks.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleVerificationReview('rejected')} 
                                className="px-3 py-1.5 border border-red-200 text-red-650 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                              >
                                Reject Selected
                              </button>
                              <button 
                                onClick={() => handleVerificationReview('approved')}
                                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                              >
                                Approve Selected ({selectedPendingMarks.length})
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                          {pendingMarks.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs">No pending marksheets.</div>
                          ) : (
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="w-10 px-6 py-4">
                                    <input 
                                      type="checkbox"
                                      checked={selectedPendingMarks.length === pendingMarks.length}
                                      onChange={() => {
                                        if (selectedPendingMarks.length === pendingMarks.length) setSelectedPendingMarks([]);
                                        else setSelectedPendingMarks(pendingMarks.map(r => r.id));
                                      }}
                                    />
                                  </th>
                                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Student</th>
                                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Subject</th>
                                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Semester</th>
                                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Total Marks</th>
                                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Grade</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {pendingMarks.map((rec) => (
                                  <tr key={rec.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 text-center">
                                      <input 
                                        type="checkbox"
                                        checked={selectedPendingMarks.includes(rec.id)}
                                        onChange={() => {
                                          setSelectedPendingMarks(prev => 
                                            prev.includes(rec.id) ? prev.filter(x => x !== rec.id) : [...prev, rec.id]
                                          );
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">{rec.student_name}</div>
                                      <div className="text-[10px] text-slate-450 font-mono mt-0.5">{rec.roll_no}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">{rec.subject_name}</div>
                                      <div className="text-[10px] text-slate-450 font-mono mt-0.5">{rec.subject_code}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">Sem {rec.semester}</td>
                                    <td className="px-6 py-4 text-center font-black">{rec.total_mark}</td>
                                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{rec.grade}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-bold">{pendingAttendance.length} pending attendance records</span>
                          {selectedPendingAttendance.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleVerificationReview('rejected')} 
                                className="px-3 py-1.5 border border-red-200 text-red-655 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                              >
                                Reject Selected
                              </button>
                              <button 
                                onClick={() => handleVerificationReview('approved')}
                                className="px-3 py-1.5 bg-indigo-655 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                              >
                                Approve Selected ({selectedPendingAttendance.length})
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                          {pendingAttendance.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs">No pending attendance entries.</div>
                          ) : (
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="w-10 px-6 py-4">
                                    <input 
                                      type="checkbox"
                                      checked={selectedPendingAttendance.length === pendingAttendance.length}
                                      onChange={() => {
                                        if (selectedPendingAttendance.length === pendingAttendance.length) setSelectedPendingAttendance([]);
                                        else setSelectedPendingAttendance(pendingAttendance.map(r => r.id));
                                      }}
                                    />
                                  </th>
                                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Student</th>
                                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Subject</th>
                                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Conducted</th>
                                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Attended</th>
                                  <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Percentage</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {pendingAttendance.map((rec) => (
                                  <tr key={rec.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 text-center">
                                      <input 
                                        type="checkbox"
                                        checked={selectedPendingAttendance.includes(rec.id)}
                                        onChange={() => {
                                          setSelectedPendingAttendance(prev => 
                                            prev.includes(rec.id) ? prev.filter(x => x !== rec.id) : [...prev, rec.id]
                                          );
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">{rec.student_name}</div>
                                      <div className="text-[10px] text-slate-450 font-mono mt-0.5">{rec.roll_no}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">{rec.subject_name}</div>
                                      <div className="text-[10px] text-slate-450 font-mono mt-0.5">{rec.subject_code}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">{rec.classes_conducted}</td>
                                    <td className="px-6 py-4 text-center font-bold">{rec.classes_attended}</td>
                                    <td className="px-6 py-4 text-center font-black text-indigo-600">{rec.attendance_percentage}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {subTab === 'attendance_analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Department Attendance warning flags</h2>
                      <p className="text-xs text-slate-400 mt-1">List of students falling below standard 75% attendance criteria.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      {attendanceRecords.filter(a => a.status === 'published' && a.attendance_percentage < 75).length === 0 ? (
                        <div className="p-12 text-center text-slate-450 text-xs">All department students exceed attendance thresholds.</div>
                      ) : (
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-55">
                            <tr>
                              <th className="px-6 py-4 text-left font-bold text-slate-500">Student Roll No</th>
                              <th className="px-6 py-4 text-left font-bold text-slate-500">Student Name</th>
                              <th className="px-6 py-4 text-left font-bold text-slate-500">Subject</th>
                              <th className="px-6 py-4 text-center font-bold text-slate-500">Conducted / Attended</th>
                              <th className="px-6 py-4 text-center font-bold text-slate-500">Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {attendanceRecords.filter(a => a.status === 'published' && a.attendance_percentage < 75).map(att => (
                              <tr key={att.id} className="bg-red-50/10 hover:bg-red-50/20">
                                <td className="px-6 py-4 font-mono font-bold text-slate-650">{att.roll_no}</td>
                                <td className="px-6 py-4 font-bold text-slate-900">{att.student_name}</td>
                                <td className="px-6 py-4 font-bold">{att.subject_name} ({att.subject_code})</td>
                                <td className="px-6 py-4 text-center">{att.classes_conducted} / {att.classes_attended}</td>
                                <td className="px-6 py-4 text-center font-black text-red-600">{att.attendance_percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Department Performance Metrics</h2>
                      <p className="text-xs text-slate-400 mt-1">Review average CGPAs and achievement records.</p>
                    </div>

                    <div className="bg-white border border-slate-205 p-6 rounded-2xl">
                      <div className="text-center p-12 text-slate-400 text-xs">
                        Department comparative analysis graphs and CGPA charts can be structured here based on published records.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ==================================================== */}
            {/* 4. COLLEGE ADMIN VIEW PANEL                          */}
            {/* ==================================================== */}
            {role === 'admin' && (
              <>
                {subTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">College Admin Console</h2>
                      <p className="text-xs text-slate-400 mt-1">Manage departmental hierarchies, HODs, staff, and publish results.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Network className="w-5 h-5 text-indigo-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Departments</span>
                          <span className="text-xl font-black text-slate-900 block mt-1">{departments.length} Active</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Users className="w-5 h-5 text-emerald-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Staff Members</span>
                          <span className="text-xl font-black text-slate-900 block mt-1">
                            {directoryUsers.filter(u => u.role === 'staff').length} Active
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Users className="w-5 h-5 text-violet-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Students</span>
                          <span className="text-xl font-black text-slate-900 block mt-1">
                            {directoryUsers.filter(u => u.role === 'student').length} Registered
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Layers className="w-5 h-5 text-amber-500" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Approvals Queue</span>
                          <span className="text-xl font-black text-amber-550 block mt-1">
                            {academicRecords.filter(r => r.status === 'approved').length} Pending Publish
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {subTab === 'departments' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">College Departments</h2>
                      <p className="text-xs text-slate-400 mt-1">Departments configured under this college.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Department ID</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Department Name</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {departments.map((dept) => (
                            <tr key={dept.id}>
                              <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-indigo-600">{dept.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{dept.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'hod' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Head of Department (HOD) Roster</h2>
                      <p className="text-xs text-slate-400 mt-1">List of departments heads managed under this college.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">HOD Name</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Department</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {directoryUsers.filter(u => u.role === 'hod').map((h) => (
                            <tr key={h.uid || h.id}>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{h.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-450">{h.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-650">{h.department_id || h.departmentId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'staff' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">College Staff Management</h2>
                      <p className="text-xs text-slate-400 mt-1"> Roster of academic teachers and staff directory.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Staff Name</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Department</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {directoryUsers.filter(u => u.role === 'staff').map((s) => (
                            <tr key={s.uid || s.id}>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{s.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-450">{s.email}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap font-bold text-indigo-650">{s.department_id || s.departmentId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'students' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">College Students Roster</h2>
                      <p className="text-xs text-slate-400 mt-1">Directory of students registered in your college.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Roll No</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Name</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Department</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Semester</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {directoryUsers.filter(u => u.role === 'student').map((st) => (
                            <tr key={st.uid || st.id}>
                              <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-650">{st.roll_no || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{st.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-650">{st.department_id || st.departmentId}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">Sem {st.semester || 3}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'records' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Academic Records Directory</h2>
                      <p className="text-xs text-slate-400 mt-1">Global view of all published and pending academic records.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Student</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Subject</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Total Marks</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {academicRecords.map(rec => (
                            <tr key={rec.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-bold text-slate-900">{rec.student_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.roll_no}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold">{rec.subject_name} ({rec.subject_code})</td>
                              <td className="px-6 py-4 text-center font-black font-mono">{rec.total_mark}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                                  rec.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {rec.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'publish' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">Academic Result Publishing Wizard</h2>
                        <p className="text-xs text-slate-400 mt-1">Publish results to calculate GPAs, CGPAs and release report cards.</p>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button 
                          onClick={() => setPublishMode('results')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            publishMode === 'results' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'
                          }`}
                        >
                          Semester Results
                        </button>
                        <button 
                          onClick={() => setPublishMode('attendance')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            publishMode === 'attendance' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'
                          }`}
                        >
                          Attendance
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handlePublishResults} className="max-w-xl mx-auto bg-slate-50 p-8 rounded-3xl border border-slate-200/60 space-y-6">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Publish {publishMode === 'results' ? 'Semester Results' : 'Attendance'} Records
                      </h3>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Department</label>
                        <select
                          required
                          value={publishDept}
                          onChange={(e) => setPublishDept(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                        >
                          <option value="">Choose Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Semester</label>
                          <select
                            required
                            value={publishSem}
                            onChange={(e) => setPublishSem(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                              <option key={s} value={s}>Semester {s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Academic Year</label>
                          <select
                            required
                            value={publishYear}
                            onChange={(e) => setPublishYear(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold"
                          >
                            <option value="">Year/Batch</option>
                            {['2023-2027', '2024-2028', '2025-2029', '2026-2030'].map(yr => (
                              <option key={yr} value={yr}>{yr}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={publishing}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 disabled:bg-indigo-300"
                      >
                        {publishing ? 'Publishing and recalculating GPAs...' : 'Publish Records Now'}
                      </button>
                    </form>
                  </div>
                )}

                {subTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">College-Wide Analytics</h2>
                      <p className="text-xs text-slate-400 mt-1">Compare departmental academic CGPAs averages and pass rates.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 p-6 rounded-2xl">
                      <h3 className="font-black text-slate-950 text-sm mb-6 uppercase tracking-wider">Average CGPA by Department</h3>
                      {(!analyticsData || !Array.isArray(analyticsData)) ? (
                        <div className="p-12 text-center text-slate-400 text-xs">No active college analytics records.</div>
                      ) : (
                        <div className="space-y-4">
                          {analyticsData.map((d: any) => (
                            <div key={d.department_id} className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-baseline text-xs font-bold">
                                <span className="text-slate-900">{d.department_name || d.department_id} ({d.total_students} students)</span>
                                <span className="font-mono text-indigo-600">Avg: {(d.avg_cgpa || 0).toFixed(2)} / 10.0</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(d.avg_cgpa || 0) * 10}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ==================================================== */}
            {/* 5. SUPER ADMIN VIEW PANEL                            */}
            {/* ==================================================== */}
            {role === 'super_admin' && (
              <>
                {subTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Global Super Admin Console</h2>
                      <p className="text-xs text-slate-400 mt-1">High-level view of all registered colleges and global pass percentages.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Building2 className="w-5 h-5 text-indigo-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total Colleges</span>
                          <span className="text-2xl font-black text-slate-900 block mt-1">{colleges.length} Colleges</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Users className="w-5 h-5 text-emerald-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Global Registered Users</span>
                          <span className="text-2xl font-black text-slate-900 block mt-1">{directoryUsers.length} Users</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <Award className="w-5 h-5 text-violet-650" />
                        <div className="mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Top College</span>
                          <span className="text-xl font-black text-violet-650 block mt-1 truncate">
                            {analyticsData && analyticsData.length > 0 ? analyticsData[0].college_name : 'Test College'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {subTab === 'colleges' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Registered Colleges</h2>
                      <p className="text-xs text-slate-400 mt-1">Directory list of academic colleges on the SkillTrack platform.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">College ID</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">College Name</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {colleges.map((col) => (
                            <tr key={col.id}>
                              <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-indigo-600">{col.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{col.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-450">{col.location || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {subTab === 'analytics' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Global Academic Comparisons</h2>
                      <p className="text-xs text-slate-400 mt-1">Compare average CGPAs and performance indices across colleges.</p>
                    </div>

                    <div className="bg-white border border-slate-200/60 p-6 rounded-2xl">
                      <h3 className="font-black text-slate-950 text-sm mb-6 uppercase tracking-wider">Average CGPA by College</h3>
                      {(!analyticsData || !Array.isArray(analyticsData)) ? (
                        <div className="p-12 text-center text-slate-400 text-xs">No global comparison data available.</div>
                      ) : (
                        <div className="space-y-4">
                          {analyticsData.map((col: any) => (
                            <div key={col.college_id} className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-baseline text-xs font-bold">
                                <span className="text-slate-900">{col.college_name || col.college_id} ({col.total_students} students)</span>
                                <span className="font-mono text-indigo-600">Avg CGPA: {(col.avg_cgpa || 0).toFixed(2)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="h-full bg-indigo-650 rounded-full" style={{ width: `${(col.avg_cgpa || 0) * 10}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTab === 'reports' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Global Platform Reports</h2>
                      <p className="text-xs text-slate-400 mt-1">Generate consolidated files and statistics reports.</p>
                    </div>

                    <div className="bg-white border border-slate-200 p-6 rounded-2xl">
                      <div className="text-center p-12 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Office reports and PDF transcript exports can be generated from the global colleges metrics dashboard.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AcademicRecords;

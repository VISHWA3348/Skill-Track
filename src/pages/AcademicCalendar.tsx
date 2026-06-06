import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  ArrowRight, 
  History, 
  Save, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  Undo2, 
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEntry {
  id: string;
  college_id: string;
  academic_year: string;
  semester: number;
  semester_start_date: string;
  semester_end_date: string;
  promotion_date: string | null;
  status: string; // 'active', 'completed', 'scheduled'
  created_at: string;
}

interface EligibleSemester {
  semester: number;
  academicYear: string;
  endDate: string;
  eligibleCount: number;
}

interface StudentRecord {
  id: string;
  name: string;
  roll_no: string;
  email: string;
  semester: number;
  year: number;
}

interface PromotionLog {
  id: string;
  student_id: string;
  student_name: string;
  student_roll_no: string;
  student_email: string;
  old_year: number;
  new_year: number;
  old_semester: number;
  new_semester: number;
  promotion_date: string;
  triggered_by: string;
}

const AcademicCalendar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'override' | 'history'>('calendar');
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [eligibleSemesters, setEligibleSemesters] = useState<EligibleSemester[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PromotionLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [triggeringEngine, setTriggeringEngine] = useState(false);
  
  // Selection states for manual overrides
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [overrideActionLoading, setOverrideActionLoading] = useState(false);

  // Editable fields for calendar configuration
  const [editedEntries, setEditedEntries] = useState<Record<string, {
    academic_year: string;
    semester_start_date: string;
    semester_end_date: string;
    status: string;
  }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch calendar entries
      const calRes = await fetch('/api/admin/academic-calendar');
      const calData = await calRes.json();
      if (calData.success) {
        setCalendarEntries(calData.data);
        
        // Initialize editable states
        const initialEdits: Record<string, any> = {};
        calData.data.forEach((entry: CalendarEntry) => {
          initialEdits[entry.id] = {
            academic_year: entry.academic_year,
            semester_start_date: entry.semester_start_date ? entry.semester_start_date.substring(0, 10) : '',
            semester_end_date: entry.semester_end_date ? entry.semester_end_date.substring(0, 10) : '',
            status: entry.status
          };
        });
        setEditedEntries(initialEdits);
      }

      // Fetch eligible promotion details
      const eligibleRes = await fetch('/api/admin/promote/eligible');
      const eligibleData = await eligibleRes.json();
      if (eligibleData.success) {
        setEligibleSemesters(eligibleData.data.eligibleSemesters);
        setStudents(eligibleData.data.students);
      }

      // Fetch history logs
      const historyRes = await fetch('/api/admin/promote/history');
      const historyData = await historyRes.json();
      if (historyData.success) {
        setHistoryLogs(historyData.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load academic calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (entryId: string, field: string, value: string) => {
    setEditedEntries(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value
      }
    }));
  };

  const handleSaveCalendar = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(editedEntries).map(([id, values]) => {
        // Convert yyyy-MM-dd to full ISO Date string for database
        const startIso = values.semester_start_date ? new Date(values.semester_start_date).toISOString() : '';
        const endIso = values.semester_end_date ? new Date(values.semester_end_date).toISOString() : '';

        return {
          id,
          academic_year: values.academic_year,
          semester_start_date: startIso,
          semester_end_date: endIso,
          status: values.status
        };
      });

      const res = await fetch('/api/admin/academic-calendar/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: payload })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Academic calendar dates saved successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save academic calendar');
      }
    } catch (err: any) {
      toast.error('Server error: Failed to save calendar');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCalendar = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/academic-calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Semesters generated successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to generate calendar');
      }
    } catch (err: any) {
      toast.error('Server error: Failed to generate calendar');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTriggerAutoEngine = async () => {
    setTriggeringEngine(true);
    try {
      const res = await fetch('/api/admin/promote/trigger-auto-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        const { promotedCount, errors } = data.data;
        if (errors.length > 0) {
          toast.warning(`Engine completed with warnings. Promoted ${promotedCount} students. Check logs.`);
        } else {
          toast.success(`Success! Automatically promoted ${promotedCount} students.`);
        }
        fetchData();
      } else {
        toast.error(data.error || 'Failed to run promotion engine');
      }
    } catch (err: any) {
      toast.error('Server error: Failed to trigger promotion engine');
    } finally {
      setTriggeringEngine(false);
    }
  };

  const handleManualPromote = async (studentId: string) => {
    if (!studentId) return;
    setOverrideActionLoading(true);
    try {
      const res = await fetch('/api/admin/promote/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Student successfully promoted to next semester');
        setSelectedStudentId('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to promote student');
      }
    } catch (err) {
      toast.error('Server error during manual promotion');
    } finally {
      setOverrideActionLoading(false);
    }
  };

  const handleRollback = async (studentId: string) => {
    if (!studentId) return;
    if (!window.confirm('Are you sure you want to roll back the last promotion for this student?')) return;
    
    setOverrideActionLoading(true);
    try {
      const res = await fetch('/api/admin/promote/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Student promotion rolled back successfully');
        setSelectedStudentId('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to roll back promotion');
      }
    } catch (err) {
      toast.error('Server error during rollback');
    } finally {
      setOverrideActionLoading(false);
    }
  };

  // Derived stats
  const activeSemester = calendarEntries.find(c => c.status === 'active');
  const totalEligibleCount = eligibleSemesters.reduce((acc, curr) => acc + curr.eligibleCount, 0);

  const filteredStudents = students.filter(student => {
    const searchLower = studentSearchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      (student.roll_no || '').toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower)
    );
  });

  const selectedStudentObj = students.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 🚀 Header Summary Dashboard Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-200" />
            Academic Calendar Dashboard
          </h2>
          <p className="text-blue-100 mt-2 font-medium max-w-xl">
            Configure semesters, set deadlines, and monitor automatic progression. Manual overrides allow rollbacks and individual student promotions.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white px-5 py-3 rounded-2xl font-bold border border-white/20 backdrop-blur-md"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Dashboard</span>
        </button>
      </div>

      {/* 📊 Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Academic Year</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">
              {activeSemester ? activeSemester.academic_year : 'Not Configured'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Semester</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">
              {activeSemester ? `Semester ${activeSemester.semester}` : 'No Active Semester'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 font-black">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Promotion Date</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">
              {activeSemester ? new Date(activeSemester.semester_end_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${totalEligibleCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Students Due For Auto-Promotion</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">
              {totalEligibleCount} Students
            </p>
          </div>
        </div>
      </div>

      {/* 📑 Tabbed Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full max-w-lg border border-slate-200/40">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all ${activeTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Calendar Config
        </button>
        <button
          onClick={() => setActiveTab('override')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all ${activeTab === 'override' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Manual Override
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Promotion Logs
        </button>
      </div>

      {/* 📦 Tab Content Panels */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4" />
          <span className="text-sm font-bold text-slate-500">Loading Configuration Data...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: CALENDAR CONFIGURATION */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Semester Term Configurations</h3>
                  <p className="text-xs text-slate-400 mt-1">Set academic years, start dates, and end dates for each term.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  {calendarEntries.length === 0 && (
                    <button
                      onClick={handleGenerateCalendar}
                      disabled={isGenerating}
                      className="bg-indigo-600 text-white px-5 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all text-sm font-bold disabled:bg-indigo-300"
                    >
                      {isGenerating ? 'Generating...' : 'Auto-Generate Semesters'}
                    </button>
                  )}
                  {calendarEntries.length > 0 && (
                    <button
                      onClick={handleSaveCalendar}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all text-sm font-bold disabled:bg-blue-300"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                  )}
                </div>
              </div>

              {calendarEntries.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">No Calendar Entries Found</h4>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      Click the button above to auto-generate the semester structure for your college program duration.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateCalendar}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all text-sm font-bold disabled:bg-indigo-300"
                  >
                    Generate Semesters Structure
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Semester</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Year</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">End Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Promotion Executed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calendarEntries.map(entry => {
                        const edits = editedEntries[entry.id] || {
                          academic_year: entry.academic_year,
                          semester_start_date: '',
                          semester_end_date: '',
                          status: entry.status
                        };

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                              Semester {entry.semester}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={edits.academic_year}
                                onChange={(e) => handleFieldChange(entry.id, 'academic_year', e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-blue-500 w-36"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                value={edits.semester_start_date}
                                onChange={(e) => handleFieldChange(entry.id, 'semester_start_date', e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-blue-500"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                value={edits.semester_end_date}
                                onChange={(e) => handleFieldChange(entry.id, 'semester_end_date', e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-blue-500"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={edits.status}
                                onChange={(e) => handleFieldChange(entry.id, 'status', e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-blue-500 bg-white"
                              >
                                <option value="active">Active</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {entry.promotion_date ? (
                                <span className="flex items-center gap-1 text-green-600 font-bold">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{new Date(entry.promotion_date).toLocaleDateString()}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400 font-medium">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Not Promoted</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL OVERRIDES */}
          {activeTab === 'override' && (
            <div className="space-y-8">
              {/* Promotion Engine Checker Trigger Card */}
              {eligibleSemesters.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-amber-900">Term Deadlines Passed</h4>
                      <p className="text-sm text-amber-700 mt-1 max-w-xl">
                        Some semesters have completed their end dates but automatic promotion has not executed. You can trigger the scheduler engine immediately to process these promotions.
                      </p>
                      <div className="flex gap-4 mt-3 flex-wrap">
                        {eligibleSemesters.map(sem => (
                          <div key={sem.semester} className="bg-white/80 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800">
                            Semester {sem.semester}: {sem.eligibleCount} Students
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleTriggerAutoEngine}
                    disabled={triggeringEngine}
                    className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-amber-200 transition-all shrink-0 disabled:bg-amber-400"
                  >
                    <RefreshCw className={`w-4 h-4 ${triggeringEngine ? 'animate-spin' : ''}`} />
                    <span>Run Promotion Engine Now</span>
                  </button>
                </div>
              )}

              {/* Student Manual override actions */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Individual Student Overrides</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manually push individual students to the next semester term or roll back accidental promotions.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Search and Select Student */}
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">Search Active Student</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by name, roll no, or email..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 border border-slate-200 rounded-2xl w-full focus:outline-none focus:border-blue-500 font-medium text-sm"
                      />
                      <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    </div>

                    <div className="border border-slate-100 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No active students match search</div>
                      ) : (
                        filteredStudents.map(student => (
                          <button
                            key={student.id}
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center transition-colors ${selectedStudentId === student.id ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                          >
                            <div>
                              <p className="font-bold">{student.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{student.roll_no || 'No Roll No'} • {student.email}</p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 block">
                                Sem {student.semester}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Year {student.year}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Override Actions Detail Panel */}
                  <div className="bg-slate-50 rounded-3xl p-6 flex flex-col justify-between border border-slate-200/40">
                    {selectedStudentObj ? (
                      <div className="space-y-6 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Selected Student</span>
                          <h4 className="text-2xl font-black text-slate-900 mt-1">{selectedStudentObj.name}</h4>
                          
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Semester</span>
                              <span className="text-lg font-black text-slate-800">Semester {selectedStudentObj.semester}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Year</span>
                              <span className="text-lg font-black text-slate-800">Year {selectedStudentObj.year}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mt-8">
                          <button
                            onClick={() => handleManualPromote(selectedStudentObj.id)}
                            disabled={overrideActionLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all disabled:bg-blue-300"
                          >
                            <UserCheck className="w-5 h-5" />
                            <span>Promote to Sem {selectedStudentObj.semester + 1}</span>
                          </button>

                          <button
                            onClick={() => handleRollback(selectedStudentObj.id)}
                            disabled={overrideActionLoading}
                            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 active:scale-95 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            <Undo2 className="w-5 h-5 text-red-500" />
                            <span>Roll Back Last Promotion</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
                        <UserCheck className="w-12 h-12 text-slate-300 mb-2" />
                        <p className="text-sm font-bold">No Student Selected</p>
                        <p className="text-xs max-w-xs mt-1">Select a student from the list on the left to configure manual promotion or rollbacks.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROMOTION LOGS */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 lg:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Promotion History Logs</h3>
                <p className="text-xs text-slate-400 mt-1">Logs of all semester updates, including system-triggered and manual overrides.</p>
              </div>

              {historyLogs.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-400">
                  <History className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-bold">No Promotion History Found</p>
                  <p className="text-xs">Once students are promoted, records will populate here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Roll Number</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Old Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">New Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Promotion Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Trigger Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div>
                              <p className="font-bold text-slate-900">{log.student_name || 'Unknown'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{log.student_email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                            {log.student_roll_no || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            Sem {log.old_semester} (Yr {log.old_year})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                              <span>Sem {log.new_semester} (Yr {log.new_year})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(log.promotion_date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${log.triggered_by === 'auto_engine' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                              {log.triggered_by === 'auto_engine' ? 'System Scheduler' : 'Manual Override'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AcademicCalendar;

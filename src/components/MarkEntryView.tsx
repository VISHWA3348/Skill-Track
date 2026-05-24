import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Save, ChevronLeft, Search, CheckCircle2, AlertCircle, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface MarkEntryViewProps {
  onBack: () => void;
}

export default function MarkEntryView({ onBack }: MarkEntryViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [semester, setSemester] = useState('1');
  const [marksData, setMarksData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [subjRes, studentsRes] = await Promise.all([
          fetch('/api/admin/academic/subjects', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/staff/academic/students', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (subjRes.ok) {
          const res = await subjRes.json();
          setSubjects(res.data || []);
        }
        if (studentsRes.ok) {
          const res = await studentsRes.json();
          setStudents(res.data || []);
          
          // Initialize marks data
          const initialMarks: Record<string, any> = {};
          (res.data || []).forEach((s: any) => {
            initialMarks[s.uid] = {
              internal_marks: '',
              attendance_percentage: '',
              grade: 'O',
              result_status: 'Pass'
            };
          });
          setMarksData(initialMarks);
        }
      } catch (e) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSave = async () => {
    if (!selectedSubject) return toast.error("Please select a subject");
    
    setSaving(true);
    try {
      const records = Object.entries(marksData).map(([student_id, data]) => ({
        student_id,
        ...data,
        internal_marks: parseFloat(data.internal_marks) || 0,
        attendance_percentage: parseFloat(data.attendance_percentage) || 0
      }));

      const res = await fetch('/api/staff/academic/marks/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subject_id: selectedSubject,
          semester: parseInt(semester),
          records
        })
      });

      if (res.ok) {
        toast.success("Marks saved successfully!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      toast.error("Error saving marks");
    } finally {
      setSaving(false);
    }
  };

  const updateMark = (studentId: string, field: string, value: any) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  if (loading) return <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Records
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Select Subject</label>
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose Subject...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Semester</label>
          <select 
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          >
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Search Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Name or Roll No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-8 py-5">Student Information</th>
                <th className="px-6 py-5 w-40 text-center">Internal Marks (100)</th>
                <th className="px-6 py-5 w-40 text-center">Attendance %</th>
                <th className="px-6 py-5 w-32 text-center">Grade</th>
                <th className="px-8 py-5 w-32 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((student) => (
                <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{student.roll_no}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <input 
                      type="number" 
                      max="100"
                      min="0"
                      value={marksData[student.uid]?.internal_marks || ''}
                      onChange={(e) => updateMark(student.uid, 'internal_marks', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-6 py-5">
                    <input 
                      type="number" 
                      max="100"
                      min="0"
                      value={marksData[student.uid]?.attendance_percentage || ''}
                      onChange={(e) => updateMark(student.uid, 'attendance_percentage', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-6 py-5">
                    <select 
                      value={marksData[student.uid]?.grade || 'O'}
                      onChange={(e) => updateMark(student.uid, 'grade', e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border-none rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {['O', 'A+', 'A', 'B+', 'B', 'C', 'U'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td className="px-8 py-5">
                    <select 
                      value={marksData[student.uid]?.result_status || 'Pass'}
                      onChange={(e) => updateMark(student.uid, 'result_status', e.target.value)}
                      className={`w-full px-2 py-2 border-none rounded-lg text-center font-black text-[10px] uppercase tracking-tighter focus:ring-2 focus:ring-blue-500 ${
                        marksData[student.uid]?.result_status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                      <option value="Arrear">Arrear</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

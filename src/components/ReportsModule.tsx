import { useState, useEffect } from 'react';
import { db, handleApiError, OperationType } from '../api/localApi';
import { collection, onSnapshot, query, where } from '../api/localApi';
import { FileText, Download, Trophy, Award, Briefcase, Search, Filter, FileDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentData {
  id: string;
  name: string;
  department: string;
  collegeId: string;
  year: string;
  certCount: number;
  activityCount: number;
  score: number;
}

export default function ReportsModule() {
  const { profile, isAdmin, isHOD, isSuperAdmin } = useAuth();
  const [reportData, setReportData] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Fetch students
    let studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    if (!isSuperAdmin) {
      studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('collegeId', '==', profile.collegeId));
    }

    let unsubCerts: (() => void) | null = null;
    let unsubActivities: (() => void) | null = null;

    const unsubStudents = onSnapshot(studentsQuery, (studentSnap) => {
      // Fetch all verified/approved certificates
      const certsQuery = query(collection(db, 'certificates'), where('status', 'in', ['verified', 'approved', 'hod_approved']));
      
      if (unsubCerts) unsubCerts();
      unsubCerts = onSnapshot(certsQuery, (certSnap) => {
        // Fetch all approved career activities
        const activitiesQuery = query(collection(db, 'careerActivities'), where('status', '==', 'approved'));
        
        if (unsubActivities) unsubActivities();
        unsubActivities = onSnapshot(activitiesQuery, (activitySnap) => {
          
          const students = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const certs = certSnap.docs.map(doc => doc.data() as any).filter(c => !c.is_deleted);
          const activities = activitySnap.docs.map(doc => doc.data());

          const combined = students.map((s: any) => {
            const sCerts = certs.filter((c: any) => c.userId === s.id).length;
            const sActivities = activities.filter((a: any) => a.userId === s.id || a.studentId === s.id).length;
            return {
              id: s.rollNo || s.id,
              name: s.name,
              department: s.departmentId || 'N/A',
              collegeId: s.collegeId,
              year: s.year || 'N/A',
              certCount: sCerts,
              activityCount: sActivities,
              score: sCerts + sActivities
            };
          });

          // Filter by department if HOD
          let finalData = combined;
          if (isHOD) {
            finalData = combined.filter(s => s.department === profile.departmentId);
          }

          setReportData(finalData.sort((a, b) => b.score - a.score));
          setLoading(false);
        }, (error) => {
          handleApiError(error, OperationType.GET, 'careerActivities');
        });
      }, (error) => {
        handleApiError(error, OperationType.GET, 'certificates');
      });
    }, (error) => {
      handleApiError(error, OperationType.GET, 'users');
    });

    return () => {
      unsubStudents();
      if (unsubCerts) unsubCerts();
      if (unsubActivities) unsubActivities();
    }; 
  }, [profile, isSuperAdmin, isHOD]);

  const departments = ['All', ...new Set(reportData.map(d => d.department))];

  const filteredData = reportData.filter(d => 
    (filterDept === 'All' || d.department === filterDept) &&
    (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportCSV = () => {
    const csv = [
      ['Rank', 'Student ID', 'Name', 'Department', 'Certifications', 'Activities', 'Total Score'],
      ...filteredData.map((d, i) => [i + 1, d.id, d.name, d.department, d.certCount, d.activityCount, d.score])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `student_report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Student Performance & Ranking Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = filteredData.map((d, i) => [
      i + 1,
      d.id,
      d.name,
      d.department,
      d.certCount,
      d.activityCount,
      d.score
    ]);

    autoTable(doc, {
      head: [['Rank', 'ID', 'Name', 'Dept', 'Certs', 'Activities', 'Score']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`student_report_${new Date().toLocaleDateString()}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Ranking</h1>
          <p className="text-slate-500">Generate performance reports and student rankings.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-all"
          >
            <Download className="w-5 h-5" />
            CSV
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
          >
            <FileDown className="w-5 h-5" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search students..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="text-slate-400 w-5 h-5" />
            <select 
              className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white min-w-[150px]"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Student & Rank</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 text-center">Certs</th>
                <th className="px-6 py-4 text-center">Activities</th>
                <th className="px-6 py-4 text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((data, i) => (
                <tr key={data.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                        i === 0 ? 'bg-yellow-400 text-white shadow-sm shadow-yellow-200' : 
                        i === 1 ? 'bg-slate-400 text-white shadow-sm shadow-slate-200' :
                        i === 2 ? 'bg-orange-400 text-white shadow-sm shadow-orange-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        #{i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{data.name}</div>
                        <div className="text-xs font-mono text-slate-500">{data.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{data.department}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">
                      <Award className="w-3 h-3" /> {data.certCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">
                      <Briefcase className="w-3 h-3" /> {data.activityCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-slate-900">{data.score}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No data available for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

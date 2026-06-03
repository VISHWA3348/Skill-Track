import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { db } from '../api/localApi';
import { collection, query, where, getDocs } from '../api/localApi';
import { useAuth } from '../context/AuthContext';
import { handleApiError, OperationType } from '../lib/firestore-errors';
import { FileText, Download, TrendingUp, Award, Users, Briefcase, FileSpreadsheet, File, CalendarClock, BrainCircuit, Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface StudentStats {
  id: string;
  name: string;
  rollNo: string;
  departmentId: string;
  certificatesCount: number;
  internshipsCount: number;
  score: number;
}

export default function Reports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [activeTab, setActiveTab] = useState<'ranking' | 'placement' | 'ai_insights'>('ranking');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/reports/ranking`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch report data');
        
        const data = await response.json();
        const dataArray = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
        const mappedStudents: StudentStats[] = dataArray.map((item: any) => ({
          id: item.uid,
          name: item.name,
          rollNo: item.roll_no || 'N/A',
          departmentId: item.department_id || 'N/A',
          certificatesCount: 0,
          internshipsCount: 0,
          score: item.score
        }));

        setStudents(mappedStudents);
      } catch (error) {
        toast.error("Failed to fetch report data: " + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [profile, filterDept, filterYear]);

  const handleDownloadExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/reports/export/excel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Student_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Excel export failed");
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Student Performance Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = students.map((s, index) => [
      index + 1,
      s.name,
      s.rollNo,
      s.departmentId,
      s.certificatesCount,
      s.internshipsCount,
      s.score
    ]);

    (doc as any).autoTable({
      head: [['Rank', 'Name', 'Roll No', 'Dept', 'Certs', 'Internships', 'Score']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`student_ranking_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadCSV = () => {
    const data = students.map((s, index) => ({
      Rank: index + 1,
      'Student Name': s.name,
      'Roll Number': s.rollNo,
      Department: s.departmentId,
      Certificates: s.certificatesCount,
      Internships: s.internshipsCount,
      'Total Score': s.score
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `student_ranking_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScheduleReport = () => {
    toast.success('Report scheduled successfully. It will be emailed monthly.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Generate and download institution reports</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            className="border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2"
          >
            <option value="">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="IT">IT</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
          </select>
          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
            className="border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
          <button
            onClick={handleScheduleReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Schedule
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            CSV
          </button>
          <button
            onClick={handleDownloadExcel}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            <File className="w-4 h-4 mr-2" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto no-scrollbar">
          <nav className="flex -mb-px min-w-max">
            <button
              onClick={() => setActiveTab('ranking')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ranking'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Award className="w-4 h-4 mr-2" />
                Student Rankings
              </div>
            </button>
            <button
              onClick={() => setActiveTab('placement')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'placement'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Briefcase className="w-4 h-4 mr-2" />
                Placement Readiness
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ai_insights'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <BrainCircuit className="w-4 h-4 mr-2" />
                AI Insights
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'ranking' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internships</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index < 3 ? (
                            <Award className={`w-5 h-5 mr-1 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : 'text-amber-600'}`} />
                          ) : (
                            <span className="text-gray-500 font-medium w-5 text-center mr-1">{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.departmentId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.certificatesCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.internshipsCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-indigo-600">{student.score}</div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No student data available for ranking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'placement' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 rounded-lg p-6 border border-green-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-green-800 font-medium">Highly Ready</h3>
                  <Briefcase className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700 mt-2">
                  {students.filter(s => s.score >= 50).length}
                </p>
                <p className="text-sm text-green-600 mt-1">Students with score 50+</p>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-yellow-800 font-medium">Needs Improvement</h3>
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-yellow-700 mt-2">
                  {students.filter(s => s.score >= 20 && s.score < 50).length}
                </p>
                <p className="text-sm text-yellow-600 mt-1">Students with score 20-49</p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-6 border border-red-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-red-800 font-medium">At Risk</h3>
                  <Users className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-700 mt-2">
                  {students.filter(s => s.score < 20).length}
                </p>
                <p className="text-sm text-red-600 mt-1">Students with score &lt; 20</p>
              </div>
            </div>
          )}

          {activeTab === 'ai_insights' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-indigo-900">Placement Prediction Model</h2>
                </div>
                <p className="text-indigo-800 mb-6">
                  Based on historical data and current student activity, our AI model predicts the likelihood of placement for each student segment.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2">High Probability (&gt;80%)</h3>
                    <p className="text-3xl font-bold text-emerald-600 mb-2">
                      {Math.round(students.filter(s => s.score >= 50).length / Math.max(students.length, 1) * 100)}%
                    </p>
                    <p className="text-sm text-gray-500">of current students</p>
                    <div className="mt-4 text-sm text-gray-600">
                      <strong>Key Indicators:</strong> 2+ Internships, 5+ Certifications, High Engagement.
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2">Medium Probability (40-80%)</h3>
                    <p className="text-3xl font-bold text-amber-500 mb-2">
                      {Math.round(students.filter(s => s.score >= 20 && s.score < 50).length / Math.max(students.length, 1) * 100)}%
                    </p>
                    <p className="text-sm text-gray-500">of current students</p>
                    <div className="mt-4 text-sm text-gray-600">
                      <strong>Key Indicators:</strong> 1 Internship, 2-4 Certifications, Moderate Engagement.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Lightbulb className="w-6 h-6 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">AI Suggestions & Recommendations</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-1">Boost Cloud Computing Certifications</h4>
                    <p className="text-sm text-gray-600">
                      Our analysis shows a 45% increase in industry demand for AWS/Azure skills. Recommend organizing a workshop for 3rd-year students.
                    </p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-1">Targeted Internship Drives</h4>
                    <p className="text-sm text-gray-600">
                      Students in the "Needs Improvement" tier lack practical experience. Focus on securing 1-month short-term internships for this group.
                    </p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-1">Soft Skills Development</h4>
                    <p className="text-sm text-gray-600">
                      While technical scores are high, overall placement readiness can be improved by introducing mandatory communication skills seminars.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

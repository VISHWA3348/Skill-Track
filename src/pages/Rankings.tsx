import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from '../api/localApi';
import { db } from '../api/localApi';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Award, Search, Filter, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface StudentRank {
  uid: string;
  name: string;
  rollNo: string;
  departmentId: string;
  collegeId: string;
  score: number;
  certificatesCount: number;
  activitiesCount: number;
}

export default function Rankings() {
  const { profile } = useAuth();
  const [rankings, setRankings] = useState<StudentRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(profile?.role === 'hod' || profile?.role === 'staff' ? profile.departmentId : 'all');

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/reports/ranking`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch rankings');
        
        const data = await response.json();
        const mappedRankings: StudentRank[] = data.map((item: any) => ({
          uid: item.uid,
          name: item.name,
          rollNo: item.roll_no || 'N/A',
          departmentId: item.department_id || 'N/A',
          score: item.score,
          certificatesCount: 0, 
          activitiesCount: 0
        }));

        setRankings(mappedRankings);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [profile]);

  const filteredRankings = rankings.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         r.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'all' || r.departmentId === selectedDept;
    return matchesSearch && matchesDept;
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-slate-400" />;
      case 2: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-slate-400 font-bold w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Student Rankings</h1>
          <p className="text-slate-500">Top performers based on certifications and activities.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search student..."
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {profile?.role !== 'hod' && profile?.role !== 'staff' && (
            <select 
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">All Departments</option>
              {/* In a real app, fetch departments dynamically */}
            </select>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Certs</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Activities</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Calculating rankings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRankings.length > 0 ? (
                filteredRankings.map((student, index) => (
                  <motion.tr 
                    key={student.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{student.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{student.rollNo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{student.departmentId}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.certificatesCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {student.activitiesCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-lg font-black text-slate-900">{student.score}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

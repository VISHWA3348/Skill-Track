import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtual } from '../hooks/useVirtual';
import { 
  Users, Search, Filter, AlertTriangle, TrendingDown, 
  ArrowUpRight, Mail, Phone, BookOpen, Target, Activity,
  ChevronRight, BrainCircuit, ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function HODStudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/hod/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setStudents(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const yearMap: Record<string, string[]> = {
    '1': ['I', 'I Year', 'I Year PG'],
    '2': ['II', 'II Year', 'II Year PG'],
    '3': ['III', 'III Year'],
    '4': ['IV', 'IV Year']
  };

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.roll_no || s.rollNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    let matchesYear = false;
    if (yearFilter === 'all') {
      matchesYear = true;
    } else {
      const allowedYears = yearMap[yearFilter] || [];
      const currentYear = s.academic_year || s.academicYear || s.year || '';
      matchesYear = allowedYears.includes(currentYear);
    }
    return matchesSearch && matchesYear;
  });

  const [cols, setCols] = useState(3);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) setCols(3);
      else if (window.innerWidth >= 768) setCols(2);
      else setCols(1);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < filtered.length; i += cols) {
      result.push(filtered.slice(i, i + cols));
    }
    return result;
  }, [filtered, cols]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { startIndex, endIndex, topPadding, bottomPadding } = useVirtual({
    itemCount: rows.length,
    rowHeight: 380,
    containerRef,
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-indigo-100">
               <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <div>
               <h2 className="text-3xl font-black text-slate-900">Student Deep-Dive</h2>
               <p className="text-slate-500 font-medium">Predictive performance and academic monitoring</p>
            </div>
         </div>
         <div className="flex flex-wrap gap-4">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="ID or Name..." 
                  className="pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <select 
               className="px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
               value={yearFilter}
               onChange={(e) => setYearFilter(e.target.value)}
            >
               <option value="all">All Academic Years</option>
               <option value="1">1st Year</option><option value="2">2nd Year</option>
               <option value="3">3rd Year</option><option value="4">4th Year</option>
            </select>
         </div>
      </div>

      <div ref={containerRef} style={{ position: 'relative' }}>
         {topPadding > 0 && <div style={{ height: `${topPadding}px` }} />}
         {rows.slice(startIndex, endIndex).map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
               {row.map(s => (
                  <motion.div 
                     whileHover={{ y: -8 }}
                     key={s.uid} 
                     className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
                  >
                     {s.placementScore < 40 && (
                        <div className="absolute top-0 right-0 px-6 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-3xl flex items-center gap-2">
                           <ShieldAlert className="w-3 h-3" /> Risk Profile
                        </div>
                     )}

                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
                           {s.name.charAt(0)}
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900">{s.name}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {s.roll_no || s.rollNo} • {s.academic_year || s.academicYear || s.year}
                           </p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-[24px]">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Score</span>
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                           </div>
                           <p className="text-2xl font-black text-slate-900">{(s.placementScore/10).toFixed(1)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[24px]">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certs</span>
                              <Activity className="w-3 h-3 text-indigo-500" />
                           </div>
                           <p className="text-2xl font-black text-slate-900">{s.certsCount}</p>
                        </div>
                     </div>

                     <div className="space-y-4 mb-10">
                        <div className="flex items-center justify-between text-xs font-bold">
                           <span className="text-slate-500">Placement Readiness</span>
                           <span className={s.placementScore > 70 ? 'text-emerald-600' : 'text-amber-600'}>{s.placementScore}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${s.placementScore}%` }}
                              className={`h-full ${s.placementScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                           />
                        </div>
                     </div>

                     <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                           <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center" title="Email"><Mail className="w-4 h-4 text-blue-600" /></div>
                           <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-white flex items-center justify-center" title="Call"><Phone className="w-4 h-4 text-emerald-600" /></div>
                        </div>
                        <Link 
                           to={`/student/${s.uid}/profile`}
                           className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                        >
                           Analyze Profile <ChevronRight className="w-4 h-4" />
                        </Link>
                     </div>
                  </motion.div>
               ))}
            </div>
         ))}
         {bottomPadding > 0 && <div style={{ height: `${bottomPadding}px` }} />}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { CheckCircle, ShieldCheck, Database, RefreshCw, Cpu, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const SystemStatus: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | System Status';
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [latency, setLatency] = useState(48);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLatency(Math.floor(Math.random() * 20) + 35);
      setRefreshing(false);
    }, 800);
  };

  const systems = [
    { name: 'API Server', uptime: '99.98%', latency: `${latency}ms`, status: 'Operational', icon: Cpu },
    { name: 'Supabase Database Connection', uptime: '99.99%', latency: '12ms', status: 'Operational', icon: Database },
    { name: 'Cloudinary Storage Sync', uptime: '100%', latency: '110ms', status: 'Operational', icon: Globe },
    { name: 'Redis Cache Layer', uptime: '99.99%', latency: '2ms', status: 'Operational', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-6 rounded-3xl mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none animate-pulse">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-950 dark:text-white">All Systems Operational</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Everything is running smoothly. Uptime is calculated over the past 90 days.</p>
              </div>
            </div>
            
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-gray-900 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* Systems Grid */}
          <div className="space-y-6 mb-12">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white px-1">Component Status</h2>
            <div className="grid gap-4">
              {systems.map((sys, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-2.5 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl border border-gray-100 dark:border-gray-700">
                      <sys.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{sys.name}</h3>
                      <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                        <span>Latency: {sys.latency}</span>
                        <span>Uptime: {sys.uptime}</span>
                      </div>
                    </div>
                  </div>
                  
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-xs font-black">
                    {sys.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Incident Log Mock */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Past Incidents</h2>
            <p className="text-xs text-gray-400 mb-6">Uptime history log for the last 3 incidents reported.</p>
            
            <div className="space-y-6">
              <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">May 24, 2026</span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1">Scheduled Database Maintenance</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  The primary PostgreSQL instance underwent optimization and index reconstruction. Total downtime was 2 minutes during the off-peak period (4:00 AM IST).
                </p>
              </div>
              <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">April 12, 2026</span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1">Minor Announcement Queue Delay</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  A high volume of student registrations caused notifications to HOD boards to queue. Solved by increasing Redis Cloud concurrent job worker limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SystemStatus;

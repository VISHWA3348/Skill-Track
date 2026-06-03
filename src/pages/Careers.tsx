import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Briefcase, MapPin, Clock, Users, ArrowRight, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const Careers: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Careers';
  }, []);

  const [applyingFor, setApplyingFor] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');

  const roles = [
    { title: 'Senior Frontend Engineer (React/TS)', dept: 'Engineering', location: 'Bangalore, India', type: 'Full-Time' },
    { title: 'Full Stack Node Developer', dept: 'Engineering', location: 'Remote (India)', type: 'Full-Time' },
    { title: 'Enterprise Account Manager', dept: 'Sales', location: 'Bangalore, India', type: 'Full-Time' },
    { title: 'Technical Support Specialist', dept: 'Operations', location: 'Bangalore, India', type: 'Full-Time' },
  ];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Application for ${applyingFor} submitted successfully! Our recruiting team will contact you.`);
    setName('');
    setEmail('');
    setResumeUrl('');
    setApplyingFor(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4"
            >
              Build the Future of <span className="text-indigo-600 dark:text-indigo-400">Education Tech</span>
            </motion.h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join our team to design, secure, and scale verification systems that empower millions of students worldwide.
            </p>
          </div>

          {/* Culture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 text-center">
            <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl w-fit mb-4 mx-auto">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">People First</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Flexible hours, health packages, and support systems to help you balance life and work.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-4 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">High Ownership</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Every engineer, designer, and salesperson owns their results, driving product features end-to-end.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit mb-4 mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Growth Budget</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Receive annual allowances for courses, textbooks, developer tools, and workspace hardware upgrades.
              </p>
            </div>
          </div>

          {/* Open Roles */}
          <div className="space-y-6 mb-20">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Open Positions</h2>
            <div className="grid gap-4">
              {roles.map((role, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-100 dark:hover:border-slate-700 transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2">
                      <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {role.location}</span>
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {role.type}</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold uppercase">{role.dept}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setApplyingFor(role.title)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Application Form Modal */}
          {applyingFor && (
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl max-w-md w-full relative shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Apply for Position</h3>
                <p className="text-xs text-indigo-500 font-semibold mb-6">{applyingFor}</p>
                
                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jane@gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Resume Link (Dropbox/Drive)</label>
                    <input 
                      type="url" 
                      required 
                      value={resumeUrl} 
                      onChange={(e) => setResumeUrl(e.target.value)}
                      placeholder="https://"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setApplyingFor(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                    >
                      Submit Application
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;

import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { BookOpen, ChevronRight, FileText, Settings, ShieldCheck, User } from 'lucide-react';
import { motion } from 'motion/react';

const Documentation: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Documentation';
  }, []);

  const [activeSection, setActiveSection] = useState<'intro' | 'start' | 'roles' | 'verify'>('intro');

  const navItems = [
    { id: 'intro', name: 'Introduction', icon: BookOpen },
    { id: 'start', name: 'Getting Started', icon: Settings },
    { id: 'roles', name: 'User Roles & RBAC', icon: User },
    { id: 'verify', name: 'Certificate Approvals', icon: ShieldCheck },
  ] as const;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white px-2">User Guides</h2>
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeSection === item.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Doc Content Area */}
          <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 md:p-10 min-h-[400px]">
            {activeSection === 'intro' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">Introduction to Skill Track</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Skill Track is a comprehensive student certificate tracking, verification, career development, and academic management platform. It allows educational institutions to onboard departments, generate sign-up codes, and verify student certifications under a structured three-tier workflow.
                </p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Core Goals</h2>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400 pl-2">
                  <li><strong>Security:</strong> Immutable logs of uploads, modifications, and credentials.</li>
                  <li><strong>Frictionless Verification:</strong> Quick QR-code verification checks for recruiting partners.</li>
                  <li><strong>Academic Syncing:</strong> Keep HODs and students aligned with GPS geotags, announcements, and GPA trackers.</li>
                </ul>
              </motion.div>
            )}

            {activeSection === 'start' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">Getting Started</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Onboarding your institution onto Skill Track is structured to be secure and simple. 
                </p>
                <div className="space-y-4 mt-6">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Step 1: Admin Onboarding</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Super Admins configure the initial College Admin accounts and setup invite code patterns.</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Step 2: Department Setup</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">College Admins onboard departments and assign HOD profiles.</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Step 3: Student Registration</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Students register using verified department codes, automatically setting their class, college, and default roles.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'roles' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">User Roles & Access</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Skill Track enforces strict Role-Based Access Control (RBAC) across five separate tiers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">Super Admin</h4>
                    <p className="text-xs text-gray-500 mt-1">Global settings, database backups, system wide broadcast setups, college creation.</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">College Admin</h4>
                    <p className="text-xs text-gray-500 mt-1">Department management, staff creation, job placements, statistics exports.</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">HOD</h4>
                    <p className="text-xs text-gray-500 mt-1">Verify student logs, monitor department AI stats, check academic performance profiles.</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">Student</h4>
                    <p className="text-xs text-gray-500 mt-1">Upload achievements, compile resumes, view leaderboard, fetch QR profile.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'verify' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">Certificate Approvals</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  To prevent fraudulent certificate uploads, Skill Track utilizes a rigid multi-tier validation chain:
                </p>
                <div className="relative border-l border-indigo-100 dark:border-slate-800 pl-6 space-y-6 mt-6">
                  <div className="relative">
                    <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-400 border-4 border-white dark:border-gray-950" />
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">1. Student Upload</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Student submits certificate with event title, type, date, GPS geotag, and file attachment.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-400 border-4 border-white dark:border-gray-950" />
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">2. Staff Verification</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Department staff audits the submission details and flags/approves it for the HOD.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-400 border-4 border-white dark:border-gray-950" />
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">3. HOD Final Sign-off</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">The HOD signs off, changing the certificate status to "Verified". The student receives points on the leaderboard.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Documentation;

import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Users, GraduationCap, Building2, Briefcase, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const SolutionsPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Solutions';
  }, []);

  const [activeTab, setActiveTab] = useState<'student' | 'staff' | 'admin' | 'enterprise'>('student');

  const tabs = [
    { id: 'student', name: 'For Students', icon: Users },
    { id: 'staff', name: 'For Staff & HODs', icon: GraduationCap },
    { id: 'admin', name: 'For College Admin', icon: Building2 },
    { id: 'enterprise', name: 'For Enterprises', icon: Briefcase },
  ] as const;

  const solutions = {
    student: {
      title: 'Showcase Your Verifiable Success',
      desc: 'Build an immutable record of your academic and extracurricular achievements that stands out to recruiters.',
      bullets: [
        'Organize certifications, awards, and internship records in one place.',
        'Generate public-facing portfolios and resumes synced to database records.',
        'Automatically receive AI skill gap analysis and recommendations.',
        'Verify your profile via a unique profile QR code.'
      ],
      cta: 'Sign Up as Student',
      link: '/login'
    },
    staff: {
      title: 'Streamline Verification & Approval workflows',
      desc: 'Remove manual paperwork and email trails. Manage department stats and student records with dynamic controls.',
      bullets: [
        'Three-tier approval system for department and college-wide achievements.',
        'Track student GPA/CGPA and attendance histories in one click.',
        'Access AI-powered student weakness reports and analytics.',
        'Post opportunities and announcements to target classes.'
      ],
      cta: 'Access Portal',
      link: '/login'
    },
    admin: {
      title: 'Coordinate Multi-Campus Institutions',
      desc: 'Get global analytics, system health audits, department onboarding setups, and security controls.',
      bullets: [
        'Onboard colleges and departments with automated signup configurations.',
        'Manage HOD/Staff access and role permissions safely.',
        'Retrieve global academic statistics, rankings, and audit logs.',
        'Export verified credentials as Excel sheets for audit records.'
      ],
      cta: 'Contact Sales',
      link: '/contact'
    },
    enterprise: {
      title: 'Accelerate Talent Sourcing with Zero Fraud',
      desc: 'Recruit with confidence. Verify applicant achievements against digital signature matches directly.',
      bullets: [
        'Scan QR codes to inspect authentic, institution-signed credentials.',
        'Reduce validation times from weeks to single seconds.',
        'API configurations for third-party background verification tools.',
        'Filter eligible students based on verifiable skill portfolios.'
      ],
      cta: 'Request Access',
      link: '/contact'
    }
  };

  const currentSol = solutions[activeTab];

  return (
    <div className="min-h-screen bg-white transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
            >
              Tailored <span className="text-indigo-600">Solutions</span>
            </motion.h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your profile type to explore how Skill Track optimizes certificate tracking and career building for you.
            </p>
          </div>

          {/* Tabs Navigation */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all border ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Display Solutions */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{currentSol.title}</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">{currentSol.desc}</p>
              
              <ul className="space-y-4 mb-8">
                {currentSol.bullets.map((b, i) => (
                  <li key={i} className="flex items-start space-x-3 text-sm text-gray-700">
                    <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Link 
                to={currentSol.link}
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <span>{currentSol.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {/* Visual Panel Mock */}
            <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col justify-between aspect-video relative overflow-hidden">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                {React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-6 h-6" })}
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Skill Track Module</p>
                <p className="text-xl font-bold text-gray-900 mt-1 mb-2">Verifiable Credential Ledger</p>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full w-[88%] animate-pulse" />
                </div>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SolutionsPage;

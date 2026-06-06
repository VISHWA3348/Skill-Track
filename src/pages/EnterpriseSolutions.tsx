import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Building2, Shield, Settings, Server, Users, ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const EnterpriseSolutions: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Enterprise';
  }, []);

  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Enterprise access request submitted! Our institutional onboarding manager will call you.');
      setOrgName('');
      setContactName('');
      setEmail('');
      setSubmitting(false);
    }, 1500);
  };

  const benefits = [
    { title: 'SSO & IAM Integrations', desc: 'Sync student and staff login profiles directly using Azure AD, SAML 2.0, or Google Workspace configurations.' },
    { title: 'Multi-Campus Partitioning', desc: 'Isolate data, students, and staff records safely between multiple campuses under a single university umbrella.' },
    { title: 'Automated Placement matching', desc: 'Allow placement cells to search verified skills, certifications, and grades automatically to shortlist matching student portfolios.' },
    { title: 'High Availability & Backups', desc: 'Daily database backup exports, Redis-cached analytics, and dedicated storage clusters with 99.99% uptime SLAs.' },
  ];

  return (
    <div className="min-h-screen bg-white transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
            >
              Enterprise-Grade Onboarding for <br/>
              <span className="text-indigo-600">Universities & Recruiters</span>
            </motion.h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Secure, scalable multi-campus portfolios with automated verification checks, analytics dashboards, and student placement शॉर्टलिस्ट matches.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {benefits.map((b, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl flex items-start space-x-5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl flex-shrink-0">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Request Info Panel */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Request Institution Demo</h2>
            
            <form onSubmit={handleRequest} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Institution Name</label>
                  <input 
                    type="text" 
                    required 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Representative Name</label>
                  <input 
                    type="text" 
                    required 
                    value={contactName} 
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Work Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jenkins@university.edu"
                  className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full flex justify-center items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <span>{submitting ? 'Submitting Request...' : 'Submit Request'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EnterpriseSolutions;

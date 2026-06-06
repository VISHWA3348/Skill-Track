import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Shield, Lock, Eye, Key, Database, FileSpreadsheet, Server, AlertOctagon } from 'lucide-react';
import { motion } from 'motion/react';

const SecurityPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Security';
  }, []);

  const securityPillars = [
    {
      icon: Lock,
      title: 'Data Encryption',
      desc: 'All communication is forced over HTTPS with SSL/TLS encryption. Sensitive data in the database, including password hashes, are secured usingbcrypt hashes.'
    },
    {
      icon: Key,
      title: 'Role-Based Access Control',
      desc: 'Fine-grained permissions restrict operations (upload, approve, view, delete) to authorized profiles, preventing horizontal privilege escalation.'
    },
    {
      icon: Database,
      title: 'Tamper-Proof Storage',
      desc: 'Extracurricular files and certificates are stored in highly available Cloudinary instances. Critical verification checks use database SHA hashes to guarantee document integrity.'
    },
    {
      icon: FileSpreadsheet,
      title: 'Detailed Audit Trails',
      desc: 'Every security event, document deletion, backup restore, or credential upload creates an entry in our immutable audit logs, capturing actor IDs and timestamps.'
    }
  ];

  return (
    <div className="min-h-screen bg-white transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
            >
              Enterprise-Grade <span className="text-emerald-600">Security</span>
            </motion.h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              How Skill Track protects student data, ensures academic integrity, and validates credentials.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {securityPillars.map((p, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <p.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Standards & Compliance */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Compliance & Framework Standards</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <h3 className="font-bold text-gray-900 mb-2">SOC2 Ready</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  System architecture conforms to SOC2 trust principles for security, availability, and processing integrity.
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <h3 className="font-bold text-gray-900 mb-2">GDPR Compliant</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Provides full control over user profiles, allowing students to access, export, or request deletion of data.
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <h3 className="font-bold text-gray-900 mb-2">ISO 27001 Aligned</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Implements information security controls that align with international ISO standards for data management.
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

export default SecurityPage;

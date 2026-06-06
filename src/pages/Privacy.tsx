import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Shield, Lock, Eye, Mail, Users } from 'lucide-react';
import { motion } from 'motion/react';

const Privacy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Privacy Policy';
  }, []);

  return (
    <div className="min-h-screen bg-white transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600">
              Your privacy is our priority. Learn how we handle and protect your data at Skill Track.
            </p>
          </motion.div>

          <div className="space-y-12">
            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">User Data Collection</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                We collect essential information required to provide our certification services, including full name, email address, educational institution details, and professional credentials. This data is used solely for identity verification and certificate management.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Certificate Storage Policy</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                All certificates and academic records are stored in a secure, encrypted environment. We implement advanced hashing and verification protocols to ensure that once a record is issued, it remains tamper-proof and verifiable by authorized parties only.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Email Usage</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Your email address is used for critical system notifications, account recovery, and certificate issuance alerts. We do not sell your contact information to third parties, and you can manage your communication preferences within your account settings.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Security Statement</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Skill Track employs industry-standard security measures, including SSL encryption, multi-factor authentication, and regular security audits. We are committed to protecting your data against unauthorized access, alteration, or destruction.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                  <Eye className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Role-Based Access Privacy</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Our system enforces strict Role-Based Access Control (RBAC). Only authorized administrators and verify-capable roles can view specific academic records, ensuring that sensitive data is only accessible to those with a legitimate need-to-know.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;

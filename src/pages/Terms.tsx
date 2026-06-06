import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { FileText, Gavel, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const Terms: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Terms of Service';
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
              Terms of Service
            </h1>
            <p className="text-lg text-gray-600">
              Please read these terms carefully before using the Skill Track platform.
            </p>
          </motion.div>

          <div className="space-y-12">
            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Platform Usage Terms</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                By accessing the Skill Track platform, you agree to comply with all applicable laws and regulations. You are granted a limited, non-exclusive right to use the platform for certificate tracking, verification, and professional development purposes.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <Gavel className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">User Responsibilities</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Users are responsible for maintaining the confidentiality of their account credentials and for all activities that occur under their account. You must provide accurate and truthful information during registration and throughout your use of the platform.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Certificate Authenticity Rules</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Only certificates issued by authorized institutions and verified through our system are considered authentic. Any attempt to forge, alter, or misrepresent digital credentials will result in immediate account termination and potential legal action.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Misuse Policy</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Misuse of the platform, including but not limited to unauthorized data scraping, system interference, or harassment of other users, is strictly prohibited. Skill Track reserves the right to suspend or terminate access for any user found in violation of these policies.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;

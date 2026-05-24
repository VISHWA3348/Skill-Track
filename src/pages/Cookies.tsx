import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Cookie, Settings, BarChart3, Database } from 'lucide-react';
import { motion } from 'motion/react';

const Cookies: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Cookie Policy
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Understanding how we use cookies to improve your experience.
            </p>
          </motion.div>

          <div className="space-y-12">
            <section className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Cookie className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cookie Usage</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                ZinoinTech uses cookies and similar tracking technologies to track the activity on our service and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier.
              </p>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Database className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We use session cookies to operate our service. These cookies are essential for maintaining your login state and ensuring secure access to your personal dashboard and academic records during your visit.
              </p>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Settings className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preference Storage</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Preference cookies are used to remember your settings and various preferences, such as your theme choice (Light/Dark mode) and language settings, to provide a more personalized and consistent experience.
              </p>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Usage</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We may use analytics cookies to monitor and analyze the use of our service. This helps us understand how users interact with the platform, identify areas for improvement, and optimize performance.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cookies;

import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { HelpCircle, Search, Users, GraduationCap, Building2, Briefcase, Mail, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const HelpCenter: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Help Center';
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: Users, name: 'Student Guides', count: '12 articles', desc: 'Portfolios, resumes, certificate uploads.' },
    { icon: GraduationCap, name: 'Staff & HOD Guides', count: '8 articles', desc: 'Verifications, approvals, department settings.' },
    { icon: Building2, name: 'Institution Setup', count: '10 articles', desc: 'College onboarding, invite codes, role configurations.' },
    { icon: Briefcase, name: 'Enterprise API', count: '6 articles', desc: 'Recruiter integrations, verification badges.' },
  ];

  const popularArticles = [
    'How do I upload a geotagged certification?',
    'Why is my certificate status showing "pending"?',
    'How does the three-tier approval workflow operate?',
    'How can I export student reports as Excel spreadsheets?',
    'Configuring the invite code system for a new department.',
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero / Search */}
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6"
            >
              How can we <span className="text-indigo-600 dark:text-indigo-400">help you?</span>
            </motion.h1>
            
            {/* Search Input Mock */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search support articles, user guides, or APIs..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400 text-gray-900 dark:text-white transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {categories.map((c, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl hover:shadow-md transition-shadow">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-4">
                  <c.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{c.name}</h3>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{c.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Popular Articles & Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Popular Articles</h2>
              <div className="space-y-4">
                {popularArticles.map((art, i) => (
                  <div key={i} className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                    <HelpCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{art}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Need More Help Column */}
            <div className="bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-8 rounded-3xl h-fit">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Still Need Help?</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                If you cannot find the answer you are looking for, contact our support team. We are ready to help.
              </p>
              
              <div className="space-y-4">
                <a href="mailto:zinointech@gmail.com" className="flex items-center space-x-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Mail className="w-5 h-5" />
                  <span>zinointech@gmail.com</span>
                </a>
                <a href="tel:+919113063448" className="flex items-center space-x-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Phone className="w-5 h-5" />
                  <span>+91 9113063448</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;

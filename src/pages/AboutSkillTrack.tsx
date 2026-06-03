import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Award, Compass, Heart, Globe, Calendar, Users, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const AboutSkillTrack: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | About Us';
  }, []);

  const stats = [
    { label: 'Students Empowered', value: '150,000+' },
    { label: 'Institutions Onboarded', value: '120+' },
    { label: 'Verified Achievements', value: '500,000+' },
    { label: 'System Uptime', value: '99.99%' },
  ];

  const values = [
    { icon: Compass, title: 'Student First', desc: 'Every feature is built to empower students to build verifiable professional credentials and accelerate careers.' },
    { icon: Award, title: 'Absolute Integrity', desc: 'Leveraging modern verification algorithms and cryptographically secure audit logs to prevent credential fraud.' },
    { icon: Globe, title: 'Open Standards', desc: 'Interoperable architecture that supports seamless student, staff, and institutional partner workflows.' },
    { icon: Heart, title: 'Continuous Growth', desc: 'Helping departments pinpoint skill gaps and offering students tailored AI recommendations.' },
  ];

  const milestones = [
    { year: '2024', title: 'Platform Launch', desc: 'Introduced core student porting and certificate verification capabilities.' },
    { year: '2025', title: 'Multi-College Scaling', desc: 'Extended support for state universities with localized role-based access controls.' },
    { year: '2026', title: 'AI Integration', desc: 'Introduced AI skill gap analysis and automated placement company requirements matching.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden mb-20 px-4">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6"
            >
              Empowering Academic & <br/>
              <span className="text-indigo-600 dark:text-indigo-400">Verifiable Careers</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed"
            >
              Skill Track is a comprehensive student certificate tracking, verification, career development, and academic management platform. We believe achievements should be secure, portable, and immediately verifiable.
            </motion.p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="bg-slate-50 dark:bg-slate-900/40 py-16 mb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-4xl md:text-5xl font-black text-indigo-600 dark:text-indigo-400">{stat.value}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission / Vision */}
        <section className="max-w-7xl mx-auto px-4 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Our mission is to eliminate credential inflation and streamline the verification process for students, colleges, and global recruiters. By providing a single source of truth for student extracurriculars, portfolios, and courses, we foster institutional integrity.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Through our multi-tier approval chains and automated fraud checking, administrators can confidently back student credentials, while students present verified records for job placements.
              </p>
            </div>
            <div className="bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-8 rounded-3xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Vision</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We envision a world where every skill and certification obtained is universally understood, cryptographically tamper-proof, and accessible in one single click. We seek to bridges the gap between educational institutions and global enterprises, enabling merit-based hires.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-7xl mx-auto px-4 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Core Values</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">The principles that guide our product and team.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-6">
                  <v.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Journey</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">How we built the tracking and verification ecosystem.</p>
          </div>
          <div className="relative border-l border-indigo-100 dark:border-slate-800 ml-4 md:ml-32">
            {milestones.map((m, i) => (
              <div key={i} className="mb-12 last:mb-0 relative pl-8">
                <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-400 border-4 border-white dark:border-gray-950 flex items-center justify-center shadow-md" />
                <div className="md:absolute md:-left-36 md:top-1 md:w-28 text-left md:text-right">
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{m.year}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{m.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutSkillTrack;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Layout, Users, Shield, GraduationCap } from 'lucide-react';

const previews = [
  {
    title: 'Student Dashboard',
    desc: 'Manage your certifications, track skill growth, construct a resume, and showcase achievements with a unique portfolio QR code.',
    image: '/screenshots/student-dash.png',
    icon: Users,
    color: 'bg-indigo-600'
  },
  {
    title: 'Staff Dashboard',
    desc: 'Review submitted certifications, save student marks and attendance, and verify student records under a secure workflow.',
    image: '/screenshots/staff-dash.png',
    icon: Layout,
    color: 'bg-blue-600'
  },
  {
    title: 'HOD Dashboard',
    desc: 'Approve department-wide certificates, view student performance indexes, and access AI-driven academic analysis.',
    image: '/screenshots/hod-dash.png',
    icon: GraduationCap,
    color: 'bg-teal-600'
  },
  {
    title: 'Admin Dashboard',
    desc: 'Onboard departments, list staff members, manage internship placements, and export spreadsheet academic reports.',
    image: '/screenshots/admin-dash.png',
    icon: Shield,
    color: 'bg-purple-600'
  },
  {
    title: 'Super Admin Dashboard',
    desc: 'Configure multi-campus colleges, manage system roles, track fraud logs, and perform full database backups.',
    image: '/screenshots/super-admin-dash.png',
    icon: Shield,
    color: 'bg-slate-900'
  }
];

const DashboardPreview: React.FC = () => {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % previews.length);
  const prev = () => setCurrent((prev) => (prev - 1 + previews.length) % previews.length);

  return (
    <section id="preview" className="py-24 bg-gray-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">Experience the Interface</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A powerful, intuitive dashboard designed for every role in your institution.
          </p>
        </div>

        <div className="relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 bg-white rounded-[3rem] p-8 lg:p-12 shadow-2xl border border-gray-100 overflow-hidden">
            {/* Content Side */}
            <div className="w-full lg:w-1/3 order-2 lg:order-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className={`inline-flex p-3 rounded-2xl ${previews[current].color} text-white`}>
                    {React.createElement(previews[current].icon, { className: "w-6 h-6" })}
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">{previews[current].title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {previews[current].desc}
                  </p>
                  
                  <div className="flex items-center space-x-4 pt-6">
                    <button 
                      onClick={prev}
                      className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={next}
                      className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Image Side */}
            <div className="w-full lg:w-2/3 order-1 lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={current}
                    src={previews[current].image}
                    alt={previews[current].title}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6 }}
                    className="w-full h-auto object-cover"
                  />
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center space-x-2 mt-8">
            {previews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-3 h-3 rounded-full transition-all ${current === i ? 'bg-indigo-600 w-8' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;

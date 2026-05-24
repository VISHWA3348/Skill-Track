import React from 'react';
import { Award, Briefcase, Bell, Key, BarChart3, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';

const Features: React.FC = () => {
  const features = [
    {
      title: 'Certificate Management',
      desc: 'Upload, store, and verify academic and professional certifications in one secure place.',
      icon: Award,
      color: 'bg-indigo-500',
    },
    {
      title: 'Career Tracking',
      desc: 'Log internships, workshops, and extracurricular activities to build a comprehensive portfolio.',
      icon: Briefcase,
      color: 'bg-blue-500',
    },
    {
      title: 'Real-time Updates',
      desc: 'Get instant notifications on your approval status and departmental announcements.',
      icon: Bell,
      color: 'bg-purple-500',
    },
    {
      title: 'Role-Based Access',
      desc: 'Strict RBAC ensuring students, staff, and admins stay within their authorized domains.',
      icon: Key,
      color: 'bg-emerald-500',
    },
    {
      title: 'Reports & Analytics',
      desc: 'Generate data-driven insights on student performance and departmental growth.',
      icon: BarChart3,
      color: 'bg-orange-500',
    },
    {
      title: 'Fraud Detection',
      desc: 'Advanced metadata and EXIF analysis to detect tampered or fraudulent uploads.',
      icon: Fingerprint,
      color: 'bg-red-500',
    },
  ];

  return (
    <section id="features" className="py-24 bg-gray-900 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Enterprise Features</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Built for scalability and security in modern educational environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-10 rounded-[2.5rem] hover:bg-gray-800 hover:border-gray-600 transition-all group"
            >
              <div className={`w-16 h-16 ${feature.color} text-white rounded-3xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 leading-tight">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

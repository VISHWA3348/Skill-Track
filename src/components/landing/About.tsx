import React from 'react';
import { Database, FileSearch, Trash2, TrendingDown, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';

const About: React.FC = () => {
  const problems = [
    {
      title: 'Fragmented Data',
      desc: 'Information spread across multiple physical and digital locations.',
      icon: Database,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Lost Certificates',
      desc: 'Physical records are easily damaged or misplaced over time.',
      icon: Trash2,
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Missing Tracking',
      desc: 'Difficulty in monitoring individual student progress and milestones.',
      icon: FileSearch,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Placement Gap',
      desc: 'Unverified skills and inconsistent records lead to poor placements.',
      icon: TrendingDown,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <section id="about" className="py-24 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Text Content */}
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                Addressing the Key Challenges in <br />
                <span className="text-indigo-600">Educational Record Management</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Traditional methods of tracking student certifications and career activities are slow, insecure, and prone to error. Our platform bridges the gap between students, faculty, and industry needs.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Unified achievement tracking for every student.',
                  'Secure, tamper-proof digital storage.',
                  'Streamlined approval workflows for faculty.',
                  'Real-time career analytics and reporting.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start space-x-3 text-gray-700 font-medium">
                    <CheckSquare className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Problem Cards Grid */}
          <div className="lg:w-1/2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {problems.map((problem, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all group"
                >
                  <div className={`w-14 h-14 ${problem.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <problem.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{problem.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">
                    {problem.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

import React from 'react';
import { motion } from 'motion/react';
import { Users, FileCheck, School, Trophy } from 'lucide-react';

const stats = [
  { id: 1, label: 'Verified Certificates', value: '10k+', icon: FileCheck, color: 'text-indigo-600' },
  { id: 2, label: 'Active Students', value: '5000+', icon: Users, color: 'text-blue-600' },
  { id: 3, label: 'Partner Colleges', value: '100+', icon: School, color: 'text-purple-600' },
  { id: 4, label: 'Skill Endorsements', value: '25k+', icon: Trophy, color: 'text-emerald-600' },
];

const Stats: React.FC = () => {
  return (
    <section id="stats" className="py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all"
            >
              <div className={`inline-flex p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 ${stat.color} mb-6`}>
                {React.createElement(stat.icon, { className: "w-8 h-8" })}
              </div>
              <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">{stat.value}</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;

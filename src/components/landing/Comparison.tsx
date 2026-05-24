import React from 'react';
import { motion } from 'motion/react';
import { Check, X, Shield, Zap, TrendingUp } from 'lucide-react';

const Comparison: React.FC = () => {
  const comparisonData = [
    { feature: 'Verification Speed', traditional: '2-4 Weeks', skilltrack: 'Instant', icon: Zap },
    { feature: 'Data Security', traditional: 'Manual Filing', skilltrack: 'Cryptographic', icon: Shield },
    { feature: 'Student Accessibility', traditional: 'Limited/Physical', skilltrack: '24/7 Digital', icon: TrendingUp },
    { feature: 'Reporting & Analytics', traditional: 'Static/Manual', skilltrack: 'Real-time AI', icon: Zap },
  ];

  return (
    <section id="comparison" className="py-24 bg-white dark:bg-gray-950 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">Traditional vs <span className="text-indigo-600 dark:text-indigo-400">SkillTrack</span></h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            See how we compare against traditional paper-based and manual systems.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-[3rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl">
          <div className="grid grid-cols-3 bg-indigo-600 p-8 text-white">
            <div className="text-lg font-bold">Feature</div>
            <div className="text-lg font-bold text-center">Traditional System</div>
            <div className="text-lg font-bold text-center">SkillTrack</div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {comparisonData.map((row, i) => (
              <motion.div 
                key={row.feature}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="grid grid-cols-3 p-8 items-center hover:bg-white dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    {React.createElement(row.icon, { className: "w-5 h-5" })}
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{row.feature}</span>
                </div>
                <div className="text-center flex flex-col items-center">
                  <span className="text-gray-500 dark:text-gray-400 mb-2">{row.traditional}</span>
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-center flex flex-col items-center">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 mb-2">{row.skilltrack}</span>
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 text-center">
            <p className="text-indigo-900 dark:text-indigo-300 font-semibold mb-6">
              Switch to SkillTrack and increase your administrative efficiency by up to 85%.
            </p>
            <button className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">
              Start Modernizing Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Comparison;

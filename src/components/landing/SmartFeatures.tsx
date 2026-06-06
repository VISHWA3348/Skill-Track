import React from 'react';
import { motion } from 'motion/react';
import { Cpu, ShieldAlert, TrendingUp, Workflow, Zap, Search } from 'lucide-react';

const features = [
  {
    title: 'AI Fraud Detection',
    desc: 'Advanced algorithms to detect tampered or forged certificates instantly.',
    icon: ShieldAlert,
    color: 'from-red-500 to-orange-500'
  },
  {
    title: 'Smart Ranking',
    desc: 'Automated skill-based ranking based on verified achievements and activities.',
    icon: TrendingUp,
    color: 'from-blue-500 to-indigo-500'
  },
  {
    title: 'Automated Workflows',
    desc: 'Streamline the approval process with intelligent verification routing.',
    icon: Workflow,
    color: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Career Growth Insights',
    desc: 'Predictive analytics to help students identify skill gaps and opportunities.',
    icon: Cpu,
    color: 'from-emerald-500 to-teal-500'
  }
];

const SmartFeatures: React.FC = () => {
  return (
    <section id="smart-features" className="py-24 bg-white transition-colors relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
          >
            Powered by <span className="text-indigo-600">Intelligence</span>
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the future of academic management with our smart feature suite designed for the modern era.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-[2rem] bg-gray-50 border border-gray-100 hover:border-indigo-500 transition-all hover:shadow-2xl"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                {React.createElement(feature.icon, { className: "w-7 h-7" })}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SmartFeatures;

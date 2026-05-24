import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Eye, Database, CheckCircle2 } from 'lucide-react';

const securityFeatures = [
  {
    title: 'End-to-End Validation',
    desc: 'Every certificate is cryptographically signed and verified against institutional records.',
    icon: ShieldCheck
  },
  {
    title: 'Role-Based Access',
    desc: 'Granular permissions ensure that only authorized personnel can issue or approve records.',
    icon: Lock
  },
  {
    title: 'Secure Cloud Storage',
    desc: 'Enterprise-grade encryption for all data stored in our distributed cloud network.',
    icon: Database
  },
  {
    title: 'Audit Logs',
    desc: 'Comprehensive tracking of every action taken within the system for full transparency.',
    icon: Eye
  }
];

const Security: React.FC = () => {
  return (
    <section id="security" className="py-24 bg-indigo-600 dark:bg-indigo-950 transition-colors relative overflow-hidden">
      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-4xl lg:text-5xl font-extrabold text-white mb-8"
            >
              Enterprise-Grade <br /> 
              <span className="text-indigo-200">Security & Privacy</span>
            </motion.h2>
            <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
              We understand the critical nature of academic records. SkillTrack is built on a foundation of zero-trust security architecture.
            </p>
            
            <div className="space-y-4">
              {['GDPR Compliant', 'SOC2 Type II Ready', '256-bit Encryption', '99.99% Availability'].map((item) => (
                <div key={item} className="flex items-center space-x-3 text-white font-semibold">
                  <CheckCircle2 className="w-6 h-6 text-indigo-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {securityFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-white text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  {React.createElement(f.icon, { className: "w-6 h-6" })}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Security;

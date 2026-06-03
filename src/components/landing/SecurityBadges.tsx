import React from 'react';
import { ShieldCheck, Lock, Eye, CheckCircle, Database, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';

const badges = [
  { icon: ShieldCheck, title: 'SOC2 Ready', desc: 'Compliant with security audit trust principles.' },
  { icon: CheckCircle, title: 'GDPR Compliant', desc: 'Allows complete user control over profile data.' },
  { icon: Lock, title: 'SSL Secured', desc: 'Forced HTTPS TLS connections across endpoints.' },
  { icon: Eye, title: 'Role Based Security', desc: 'RBAC enforces authorization isolation.' },
  { icon: FileSpreadsheet, title: 'Audit Logging', desc: 'Every data change is recorded in immutable audit logs.' },
  { icon: Database, title: 'Encrypted Storage', desc: 'Passwords and sensitive keys are securely hashed.' }
];

const SecurityBadges: React.FC = () => {
  return (
    <section className="py-16 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Trust &amp; Compliance</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Built into Every Layer</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((b, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl text-center flex flex-col items-center"
            >
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl mb-3">
                {React.createElement(b.icon, { className: "w-5 h-5" })}
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{b.title}</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecurityBadges;

import React from 'react';
import { Shield, Brain, TrendingUp, Lock, School, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'motion/react';

const reasons = [
  { icon: Shield, title: 'Faster Verification', desc: 'Accelerates verification workflows from weeks to seconds with custom QR codes and automated digital signatures.' },
  { icon: Brain, title: 'AI Powered Insights', desc: 'Identifies student skill gaps and offers personalized career path recommendations based on achievements.' },
  { icon: TrendingUp, title: 'Placement Tracking', desc: 'Matches corporate job descriptions against verified student portfolios to streamline shortlisting.' },
  { icon: Lock, title: 'Secure Storage', desc: 'Stores uploaded certificates in tamper-proof cloud buckets, using SHA cryptographical checks.' },
  { icon: School, title: 'Multi College Support', desc: 'Enforces data isolation protocols allowing state universities to coordinate hundreds of campuses safely.' },
  { icon: Cpu, title: 'Enterprise Ready', desc: 'Exposes high-performance REST APIs and SAML Single Sign-On (SSO) for easy third-party integrations.' },
];

const WhyChoose: React.FC = () => {
  return (
    <section className="py-24 bg-gray-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">Why Choose Skill Track?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A secure, automated credential tracking system tailored for institutions, HODs, students, and recruiters.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((r, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6">
                {React.createElement(r.icon, { className: "w-6 h-6" })}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{r.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;

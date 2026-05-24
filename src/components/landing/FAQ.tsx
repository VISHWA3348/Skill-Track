import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: "How does certificate verification work?",
    a: "Every certificate issued through SkillTrack contains a unique cryptographic hash and a QR code. When scanned or searched, our system verifies the record against the institution's encrypted database instantly."
  },
  {
    q: "Is my student data secure?",
    a: "Yes, we use enterprise-grade AES-256 encryption for data at rest and TLS for data in transit. We also implement strict Role-Based Access Control (RBAC) to ensure only authorized personnel can access sensitive information."
  },
  {
    q: "Can multiple colleges use the same platform?",
    a: "Absolutely. SkillTrack is a multi-tenant platform, meaning each college has its own isolated workspace, branding, and data storage while benefiting from our centralized verification network."
  },
  {
    q: "Is there mobile support available?",
    a: "Yes, SkillTrack is fully responsive and works perfectly on smartphones, tablets, and desktops. We also offer a dedicated mobile view for students to access their portfolios on the go."
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Everything you need to know about the SkillTrack platform.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 lg:p-8 text-left flex justify-between items-center group"
              >
                <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {faq.q}
                </span>
                <div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all ${openIndex === i ? 'rotate-180 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : ''}`}>
                  <ChevronDown className="w-6 h-6" />
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 lg:px-8 pb-8 text-lg text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-700 pt-6">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

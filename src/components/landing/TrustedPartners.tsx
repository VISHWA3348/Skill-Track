import React from 'react';
import { School } from 'lucide-react';

const partners = [
  'Anna University',
  'Indian Institute of Technology',
  'National Institute of Technology',
  'PSG College of Technology',
  'RV College of Engineering',
  'Vellore Institute of Technology',
  'Madras Institute of Technology',
];

const TrustedPartners: React.FC = () => {
  return (
    <section className="bg-white dark:bg-gray-950 py-10 border-y border-gray-100 dark:border-gray-900/50 overflow-hidden transition-colors">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-loop {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 text-center mb-6">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Trusted by Leading Institutions</p>
      </div>

      <div className="relative w-full overflow-hidden flex items-center">
        {/* Infinite Scroll Wrapper */}
        <div className="animate-marquee-loop flex space-x-16 items-center">
          {[...partners, ...partners, ...partners].map((partner, index) => (
            <div key={index} className="flex items-center space-x-3 text-slate-400 dark:text-slate-600 select-none">
              <div className="p-2 bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100/50 dark:border-slate-800 rounded-xl">
                <School className="w-5 h-5 text-indigo-600/70 dark:text-indigo-400/70" />
              </div>
              <span className="text-sm font-semibold tracking-tight whitespace-nowrap text-gray-800 dark:text-gray-300">{partner}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedPartners;

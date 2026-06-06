import React from 'react';
import { Briefcase, BarChart2, Cpu, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const pillars = [
  {
    icon: Briefcase,
    title: 'Internship Tracking',
    desc: 'Verify and record student work experience directly from corporate partners. Capture internship duration and skills gained.'
  },
  {
    icon: BarChart2,
    title: 'Placement Analytics',
    desc: 'Provides placement cells with interactive data on eligible cohorts, active job postings, and college-wide hiring rates.'
  },
  {
    icon: Cpu,
    title: 'Skill Gap Analysis',
    desc: 'Automatically cross-references students portfolios against current industry requirements to highlight areas for training.'
  },
  {
    icon: FileText,
    title: 'Automated Resume Building',
    desc: 'Generates premium resumes directly linked to verified academic and certification records, ensuring zero verification lag.'
  }
];

const PlacementSuccess: React.FC = () => {
  return (
    <section className="py-24 bg-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Info */}
          <div className="w-full lg:w-1/2 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">Hiring Ready</span>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">Accelerate Student <br/>Placement Success</h2>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Connect placement cell analytics with student portfolio achievements. Skill Track makes sure that student skills and certifications are verified before application submission, reducing recruiter audit times.
            </p>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span>Verified student resume download links</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span>Custom recruiter dashboards with portfolio views</span>
              </div>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {pillars.map((p, index) => (
              <div key={index} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl hover:shadow-md transition-shadow">
                <div className="p-2.5 bg-white text-indigo-600 rounded-xl w-fit mb-4 border border-gray-100">
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlacementSuccess;

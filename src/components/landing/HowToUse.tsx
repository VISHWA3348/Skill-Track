import React from 'react';
import { UserPlus, CloudUpload, ClipboardCheck, ShieldCheck, FilePieChart } from 'lucide-react';
import { motion } from 'motion/react';

const HowToUse: React.FC = () => {
  const steps = [
    {
      title: 'Registrations',
      desc: 'Student registers and logs in with secure local credentials.',
      icon: UserPlus,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Upload Evidence',
      desc: 'Securely upload certificates and log career activities.',
      icon: CloudUpload,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Staff Review',
      desc: 'Dedicated staff members verify the authenticity of records.',
      icon: ClipboardCheck,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'HOD Approval',
      desc: 'Final departmental approval locks the verified achievement.',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Smart Reports',
      desc: 'Generate comprehensive career growth and skill reports.',
      icon: FilePieChart,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">The Workflow Made Simple</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A seamless, secure process from student submission to administrative approval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Connection Line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-[2px] bg-gray-100 z-0 group-hover:bg-indigo-100 transition-colors"></div>
              )}
              
              <div className={`w-24 h-24 ${step.color} rounded-full flex items-center justify-center mb-6 relative z-10 shadow-lg group-hover:scale-110 transition-transform border-4 border-white`}>
                <step.icon className="w-10 h-10" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white text-gray-400 rounded-full flex items-center justify-center text-xs font-bold border border-gray-100 shadow-sm leading-none">
                  {i + 1}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-4">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowToUse;

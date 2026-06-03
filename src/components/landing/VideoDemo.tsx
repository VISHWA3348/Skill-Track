import React, { useState } from 'react';
import { Play, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const VideoDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-24 bg-white dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-[3rem] text-white p-8 md:p-16 flex flex-col lg:flex-row items-center gap-12 overflow-hidden relative shadow-2xl">
          {/* Details */}
          <div className="w-full lg:w-1/2 space-y-6 relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Introduction Video</span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">Watch Skill Track <br/>in Action</h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Discover how Skill Track automates credentials, enforces role-based approvals, and creates customizable student portfolios in under two minutes.
            </p>
            <div className="pt-4">
              <button 
                onClick={() => setIsOpen(true)}
                className="flex items-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <Play className="w-5 h-5 fill-slate-900 text-slate-900" />
                <span>Play Demo Video</span>
              </button>
            </div>
          </div>

          {/* Visual Video Cover */}
          <div className="w-full lg:w-1/2 relative">
            <div 
              className="relative aspect-video rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden group cursor-pointer shadow-2xl"
              onClick={() => setIsOpen(true)}
            >
              <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center">
                {/* Pulse Play button */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-75" />
                  <div className="relative p-5 bg-indigo-600 text-white rounded-full shadow-xl">
                    <Play className="w-8 h-8 fill-white" />
                  </div>
                </div>
              </div>
              
              {/* Fake player UI */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-400">
                <span>0:00 / 2:30</span>
                <span className="bg-slate-900/80 px-2 py-0.5 rounded">1080p</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full relative shadow-2xl"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-white">
                <span className="text-sm font-bold">Skill Track Tour</span>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* HTML5 Video or Mock explanation screen */}
              <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full mb-4">
                  <ShieldAlert className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold mb-2">Simulated Interactive Product Demo</h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                  In production environments, this frame mounts a secure CDN-delivered HTML5 player or YouTube embed showcasing the full student onboarding and verification flow.
                </p>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Close Video
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default VideoDemo;

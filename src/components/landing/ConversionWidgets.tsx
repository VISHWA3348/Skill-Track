import React, { useState, useEffect } from 'react';
import { MessageCircle, Phone, ArrowRight, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const ConversionWidgets: React.FC = () => {
  const [showSticky, setShowSticky] = useState(false);
  const [closedSticky, setClosedSticky] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400 && !closedSticky) {
        setShowSticky(true);
      } else {
        setShowSticky(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [closedSticky]);

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed bottom-6 right-6 z-[90] flex flex-col space-y-3">
        {/* WhatsApp Button */}
        <a
          href="https://wa.me/919113063448"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="Chat on WhatsApp"
        >
          <MessageCircle className="w-6 h-6 fill-white text-emerald-500" />
        </a>

        {/* Contact Button */}
        <button
          onClick={() => navigate('/contact')}
          className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="Contact Support"
        >
          <Phone className="w-6 h-6" />
        </button>
      </div>

      {/* Sticky Bottom CTA Banner */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-[80] bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] py-4 px-6 transition-colors"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
                <p className="text-xs sm:text-sm font-semibold text-gray-900">
                  Ready to optimize certificate verification for your campus?
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/contact')}
                  className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Demo</span>
                </button>
                <button
                  onClick={() => navigate('/enterprise')}
                  className="flex items-center space-x-1 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  <span>Request Access</span>
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center space-x-1 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setShowSticky(false);
                    setClosedSticky(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors ml-2"
                  title="Close banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ConversionWidgets;

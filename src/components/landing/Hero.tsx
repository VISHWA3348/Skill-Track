import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';

const Hero: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user && profile) {
      navigate(`/dashboard/${profile.role.replace('_', '-')}-dashboard`);
    } else {
      navigate('/login');
    }
  };

  return (
    <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-[600px] h-[600px] bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-[120px] opacity-70"></div>
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-[600px] h-[600px] bg-blue-50 dark:bg-blue-900/10 rounded-full blur-[120px] opacity-70"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mb-8 border border-indigo-100 dark:border-indigo-800 shadow-sm backdrop-blur-md">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
              Trusted by 50+ Institutions Worldwide
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl lg:text-8xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-8"
          >
            The Operating System for <br className="hidden lg:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-blue-500 animate-gradient">
              Student Achievement
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg lg:text-2xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto mb-12 leading-relaxed"
          >
            Empower your institution with SkillTrack. A unified platform to securely issue, verify, and analyze student credentials while driving career growth through real-time insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <button
              onClick={handleCTA}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-200 dark:shadow-none flex items-center justify-center group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            <button
              onClick={() => document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center"
            >
              Watch Platform Demo
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-16 flex flex-col items-center"
          >
            <div className="flex -space-x-3 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-950 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-950 bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                +2k
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <span>Rated 4.9/5 by Academic Leaders</span>
            </div>
          </motion.div>

          {/* Stats Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 p-1 bg-white/30 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-gray-800/20 shadow-2xl overflow-hidden"
          >
            <div className="p-10 flex flex-col items-center group transition-all">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">99.9%</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Uptime Secure</p>
            </div>
            <div className="p-10 flex flex-col items-center group border-y md:border-y-0 md:border-x border-gray-100 dark:border-gray-800 transition-all">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Instant</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Verification</p>
            </div>
            <div className="p-10 flex flex-col items-center group transition-all">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-10 h-10" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Enterprise</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Ready Solution</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

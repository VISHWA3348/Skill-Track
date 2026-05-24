import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CTABanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-white dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[3rem] bg-indigo-600 dark:bg-indigo-900 p-12 lg:p-24 overflow-hidden text-center shadow-2xl"
        >
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-white/10 text-indigo-100 mb-8 border border-white/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Available for Institutions Worldwide
            </div>
            
            <h2 className="text-4xl lg:text-6xl font-extrabold text-white mb-8 tracking-tight">
              Ready to modernize student achievement tracking?
            </h2>
            
            <p className="text-xl text-indigo-100 mb-12 leading-relaxed">
              Join 100+ forward-thinking colleges and universities. Get started with SkillTrack today and empower your students with verified digital credentials.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-10 py-5 bg-white text-indigo-600 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center group"
              >
                Get Started Now
                <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                className="w-full sm:w-auto px-10 py-5 bg-transparent text-white border-2 border-white/30 rounded-2xl font-bold text-xl hover:bg-white/10 transition-all flex items-center justify-center"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTABanner;

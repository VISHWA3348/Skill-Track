import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const Contact: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success('Message sent! We will get back to you soon.');
    }, 1500);
  };

  return (
    <section id="contact" className="py-24 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl shadow-gray-200/50 border border-gray-100">
          <div className="flex flex-col lg:flex-row">
            {/* Info Panel */}
            <div className="lg:w-1/3 bg-indigo-600 p-12 lg:p-16 text-white flex flex-col justify-between">
              <div>
                <h2 className="text-4xl font-extrabold mb-6 tracking-tight leading-tight">Get in Touch</h2>
                <p className="text-indigo-100 text-lg mb-12 leading-relaxed opacity-80 font-medium">
                  Have questions about our system? Our team is here to help you scale your educational records.
                </p>
                
                <div className="space-y-8">
                  <div className="flex items-center space-x-4 group">
                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1 leading-none">Support Email</p>
                      <p className="text-lg font-bold">support@SkillTrack.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 group">
                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1 leading-none">Phone Support</p>
                      <p className="text-lg font-bold">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 group">
                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1 leading-none">Office Location</p>
                      <p className="text-lg font-bold">Bangalore, IN</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                <p className="text-sm font-medium italic opacity-90 leading-relaxed text-indigo-50">
                  "The goal of education is the advancement of knowledge and the dissemination of truth."
                </p>
              </div>
            </div>

            {/* Form Panel */}
            <div className="lg:w-2/3 p-12 lg:p-20">
              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                        <input
                          required
                          type="text"
                          placeholder="John Doe"
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                        <input
                          required
                          type="email"
                          placeholder="john@example.com"
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Your Message</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tell us how we can help..."
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium resize-none"
                      ></textarea>
                    </div>
                    <button
                      disabled={isSubmitting}
                      className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-extrabold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-70 group"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-12"
                  >
                    <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-green-100">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-4">Message Sent Successfully!</h3>
                    <p className="text-lg text-gray-600 max-w-sm mb-8 leading-relaxed">
                      Thank you for reaching out. A team member will contact you within 24 business hours.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;

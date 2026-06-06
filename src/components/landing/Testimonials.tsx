import React from 'react';
import { motion } from 'motion/react';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    content: "SkillTrack has transformed how we manage student achievements. The instant verification feature has saved us hundreds of hours of manual work.",
    author: "Dr. Sarah Chen",
    role: "Dean of Academic Affairs",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    content: "Building my digital portfolio was so easy. I can now share my verified certificates with employers directly through the platform.",
    author: "Alex Rivera",
    role: "Computer Science Student",
    avatar: "https://i.pravatar.cc/150?u=alex"
  },
  {
    content: "The analytics provided by SkillTrack give us a clear view of our department's performance and skill trends among students.",
    author: "Prof. James Wilson",
    role: "HOD, Electronics",
    avatar: "https://i.pravatar.cc/150?u=james"
  }
];

const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 bg-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">Trusted by the Community</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hear from the educators and students who use SkillTrack every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2.5rem] bg-gray-50 border border-gray-100 relative flex flex-col justify-between hover:shadow-xl transition-all"
            >
              <div className="absolute top-8 right-8 text-indigo-600/10">
                <Quote className="w-16 h-16" />
              </div>
              
              <div>
                <div className="flex text-yellow-400 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-lg text-gray-700 italic mb-8 relative z-10 leading-relaxed">
                  "{t.content}"
                </p>
              </div>

              <div className="flex items-center space-x-4 border-t border-gray-100 pt-6">
                <img src={t.avatar} alt={t.author} className="w-12 h-12 rounded-full border-2 border-indigo-100" />
                <div>
                  <h4 className="font-bold text-gray-900">{t.author}</h4>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

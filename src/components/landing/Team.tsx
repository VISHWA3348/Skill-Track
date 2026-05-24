import React from 'react';
import { Linkedin, Instagram, Twitter, Github } from 'lucide-react';
import { motion } from 'motion/react';

const Team: React.FC = () => {
  const team = [
    {
      name: 'Seeman P',
      role: 'Project Director',
      image: 'img/seeman.jpg',
      linkedin: 'https://www.linkedin.com/in/seeman-seeman-3b5468380?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
      instagram: 'https://www.instagram.com/dhe._spyro._?igsh=MXh3NHFudXVieDBkeA%3D%3D&utm_source=qr',
    },
    {
      name: 'RaviBalan K',
      role: 'Computer Science Student',
      image: 'img/ravibalan.jpg',
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
    },
    {
      name: 'Vignesh S',
      role: 'Computer Science Student',
      image: 'img/vignesh.jpg',
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
    },
  ];

  return (
    <section id="team" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Meet the Visionaries</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Driven by a passion for education and cutting-edge technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {team.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-50/50 transition-all text-center group"
            >
              <div className="relative mb-8 inline-block">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[20px] opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full object-cover relative z-10 border-4 border-white shadow-xl group-hover:scale-105 transition-transform"
                />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{member.name}</h3>
              <p className="text-indigo-600 font-semibold mb-6 uppercase tracking-widest text-xs">{member.role}</p>
              
              <div className="flex justify-center space-x-4">
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-gray-50 text-gray-400 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href={member.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-gray-50 text-gray-400 rounded-full hover:bg-pink-50 hover:text-pink-600 transition-all border border-transparent hover:border-pink-100"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;

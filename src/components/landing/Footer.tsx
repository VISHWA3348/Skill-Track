import React from 'react';
import { GraduationCap, Linkedin, Instagram, Mail, MapPin, Phone, ExternalLink, Shield, CheckCircle } from 'lucide-react';

import { Link } from 'react-router-dom';

const Footer: React.FC = () => {


  const footerLinks = {
    platform: [
      { name: 'Features', href: '/features' },
      { name: 'Solutions', href: '/solutions' },
      { name: 'Security', href: '/security' },
      { name: 'Enterprise', href: '/enterprise' },
    ],
    resources: [
      { name: 'Documentation', href: '/docs' },
      { name: 'API Reference', href: '/api-docs' },
      { name: 'Help Center', href: '/help-center' },
      { name: 'System Status', href: '/status', tag: 'Live' },
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  };

  const socialLinks = [
    { icon: Linkedin, href: 'https://www.linkedin.com/company/zinoin/', label: 'LinkedIn' },
    { icon: Instagram, href: 'https://www.instagram.com/zinoingroup?igsh=MTJvNmR0azIwbmhhNw==', label: 'Instagram' },
    { icon: Mail, href: 'mailto:zinointech@gmail.com', label: 'Email' },
  ];

  return (
    <footer className="bg-gray-50 pt-24 pb-12 transition-colors border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a 
              href="https://zinoin.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center space-x-2.5 mb-8 group cursor-pointer"
            >
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                Skill Track
              </span>
            </a>
            <p className="text-lg text-gray-600 mb-8 max-w-sm leading-relaxed">
              The world's most trusted platform for student certification and career activity tracking. Empowering the next generation of professionals.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="p-3 rounded-xl bg-white text-gray-400 hover:text-indigo-600 border border-gray-200 hover:border-indigo-600 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">{title}</h3>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('/') ? (
                      <Link 
                        to={link.href}
                        className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center group"
                      >
                        <span>{link.name}</span>
                      </Link>
                    ) : (
                      <a 
                        href={link.href} 
                        className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center group"
                      >
                        <span>{link.name}</span>
                        {link.tag && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full flex items-center">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse" />
                            {link.tag}
                          </span>
                        )}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-y border-gray-200 mb-12">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Office</p>
              <p className="text-sm font-semibold text-gray-900">2/124, Nayandahalli, Bangalore, India</p>
            </div>
          </div>
          <a href="tel:+919113063448" className="flex items-center space-x-4 group">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Call Us</p>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">+91 9113063448</p>
            </div>
          </a>
          <a href="mailto:zinointech@gmail.com" className="flex items-center space-x-4 group">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</p>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">zinointech@gmail.com</p>
            </div>
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <div className="flex flex-col md:flex-row items-center md:space-x-4 space-y-2 md:space-y-0 text-center md:text-left">
            <p>© 2026 Skill Track. All rights reserved.</p>
            <a 
              href="https://zinoin.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Powered by ZinoinTech
            </a>
          </div>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <div className="hidden sm:flex items-center text-emerald-600 font-bold">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              All Systems Operational
            </div>
            <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-indigo-600 transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

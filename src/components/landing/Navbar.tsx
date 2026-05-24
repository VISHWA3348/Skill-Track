import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, X, GraduationCap, ArrowRight, ChevronDown, Sun, Moon, Shield, BarChart2, BookOpen, Users, Building, HelpCircle, Layout, Bell, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Navbar: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = {
    features: {
      label: 'Features',
      items: [
        { name: 'Certificate Management', desc: 'Securely issue and track digital credentials.', icon: Shield, href: '#features' },
        { name: 'Academic Tracking', desc: 'Monitor student progress in real-time.', icon: BookOpen, href: '#about' },
        { name: 'Advanced Analytics', desc: 'Data-driven insights for departments.', icon: BarChart2, href: '#career-insights' },
        { name: 'Broadcast System', desc: 'Seamless communication across the campus.', icon: Bell, href: '#notifications' },
      ]
    },
    solutions: {
      label: 'Solutions',
      items: [
        { name: 'For Students', desc: 'Build your professional digital portfolio.', icon: Users, href: '#how-it-works' },
        { name: 'For Staff & HODs', desc: 'Streamline approvals and tracking.', icon: Building, href: '#team' },
        { name: 'For College Admin', desc: 'Enterprise-grade institution management.', icon: Layout, href: '#stats' },
        { name: 'AI Fraud Detection', desc: 'Tamper-proof record verification.', icon: Cpu, href: '#security' },
      ]
    },
    resources: {
      label: 'Resources',
      items: [
        { name: 'Documentation', desc: 'Learn how to integrate and use.', icon: BookOpen, href: '#faq' },
        { name: 'API Reference', desc: 'Build on top of our platform.', icon: Cpu, href: '#contact' },
        { name: 'Help Center', desc: 'Get support and find answers.', icon: HelpCircle, href: '#faq' },
      ]
    }
  };

  const getDashboardPath = () => {
    if (!profile) return '/login';
    return `/dashboard/${profile.role.replace('_', '-')}-dashboard`;
  };

  const NavItem = ({ label, items, id }: { label: string, items: any[], id: string }) => (
    <div 
      className="relative group"
      onMouseEnter={() => setActiveDropdown(id)}
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <button className="flex items-center space-x-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-2">
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === id ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {activeDropdown === id && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 z-[100]"
          >
            <div className="grid gap-4">
              {items.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-start space-x-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group/item"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
                    setActiveDropdown(null);
                  }}
                >
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                    {React.createElement(item.icon, { className: "w-5 h-5" })}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg py-3' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            role="button"
            aria-label="ZinoinTech Home"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className={`text-2xl font-bold tracking-tight ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
              Zinoin<span className="text-indigo-600 dark:text-indigo-400">Tech</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-10">
            <NavItem label="Features" items={menuItems.features.items} id="features" />
            <NavItem label="Solutions" items={menuItems.solutions.items} id="solutions" />
            <NavItem label="Resources" items={menuItems.resources.items} id="resources" />
            
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {user ? (
              <button
                onClick={() => navigate(getDashboardPath())}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-0 left-0 w-full h-screen bg-white dark:bg-gray-900 z-[100] overflow-y-auto lg:hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="text-xl font-bold dark:text-white text-gray-900">ZinoinTech</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(menuItems).map(([key, section]) => (
                  <div key={key} className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">{section.label}</h3>
                    <div className="grid gap-1">
                      {section.items.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          className="flex items-center space-x-4 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            {React.createElement(item.icon, { className: "w-5 h-5" })}
                          </div>
                          <span className="text-base font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full flex justify-center items-center space-x-2 bg-indigo-600 text-white py-4 rounded-2xl text-lg font-bold hover:bg-indigo-700 transition-all"
                  >
                    <span>{user ? 'Go to Dashboard' : 'Get Started Free'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  {!user && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/login');
                      }}
                      className="w-full py-4 text-gray-600 dark:text-gray-400 font-bold"
                    >
                      Sign In to Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Stats from '../components/landing/Stats';
import About from '../components/landing/About';
import SmartFeatures from '../components/landing/SmartFeatures';
import DashboardPreview from '../components/landing/DashboardPreview';
import HowToUse from '../components/landing/HowToUse';
import Features from '../components/landing/Features';
import Security from '../components/landing/Security';
import Comparison from '../components/landing/Comparison';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import Contact from '../components/landing/Contact';
import CTABanner from '../components/landing/CTABanner';
import Footer from '../components/landing/Footer';
import { motion, useScroll, useSpring } from 'motion/react';

const LandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative bg-white dark:bg-gray-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-500">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-indigo-600 z-[100] origin-left shadow-[0_0_10px_rgba(79,70,229,0.5)]"
        style={{ scaleX }}
      />

      <Navbar />
      
      <main>
        <Hero />
        <Stats />
        <About />
        <SmartFeatures />
        <DashboardPreview />
        <HowToUse />
        <Features />
        <Security />
        <Comparison />
        <Testimonials />
        <FAQ />
        <Contact />
        <CTABanner />
      </main>

      <Footer />

      {/* Modern Gradient Overlays for smoother transitions */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white dark:from-gray-950 to-transparent pointer-events-none z-40 opacity-20 transition-colors duration-500"></div>
    </div>
  );
};

export default LandingPage;

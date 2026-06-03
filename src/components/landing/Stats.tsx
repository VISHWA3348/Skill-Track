import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Users, FileCheck, School, Trophy } from 'lucide-react';

const CountUp: React.FC<{ end: number; duration?: number; suffix?: string; decimals?: number }> = ({ end, duration = 1500, suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let frameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = progress * end;
      setCount(current);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        frameId = window.requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [end, duration]);

  const formatted = count.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span ref={elementRef}>{formatted}{suffix}</span>;
};

const stats = [
  { id: 1, label: 'Students Registered', end: 12500, suffix: '+', icon: Users, color: 'text-indigo-600' },
  { id: 2, label: 'Certificates Verified', end: 45000, suffix: '+', icon: FileCheck, color: 'text-blue-600' },
  { id: 3, label: 'Colleges Onboarded', end: 120, suffix: '+', icon: School, color: 'text-purple-600' },
  { id: 4, label: 'Placement Success', end: 94.8, suffix: '%', decimals: 1, icon: Trophy, color: 'text-emerald-600' },
];

const Stats: React.FC = () => {
  return (
    <section id="stats" className="py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all"
            >
              <div className={`inline-flex p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 ${stat.color} mb-6`}>
                {React.createElement(stat.icon, { className: "w-8 h-8" })}
              </div>
              <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                <CountUp end={stat.end} suffix={stat.suffix} decimals={stat.decimals || 0} />
              </h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;

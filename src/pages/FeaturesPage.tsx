import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Shield, QrCode, FileText, Activity, Users, Settings, Cpu, MapPin, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const FeaturesPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | Features';
  }, []);

  const features = [
    {
      icon: Shield,
      title: 'Digital Credentials',
      desc: 'Securely upload, store, and manage certificate files (PDFs, JPGs, PNGs). Every file is processed safely to guarantee permanence.'
    },
    {
      icon: QrCode,
      title: 'QR Code Verification',
      desc: 'Generate secure, unique QR codes for every student profile and certificate. Recruiters can scan the QR code to verify records instantly.'
    },
    {
      icon: FileText,
      title: 'Resume Builder',
      desc: 'An interactive builder that syncs details directly from academic records and verified certifications to compile high-quality resumes.'
    },
    {
      icon: Activity,
      title: 'Career Activity Log',
      desc: 'Enables students to log internships, projects, sports, workshops, and achievements. Supports metadata fields for rich descriptions.'
    },
    {
      icon: Users,
      title: 'Role-Based Dashboards',
      desc: 'Bespoke interfaces for Super Admins, College Admins, HODs, Staff, and Students. Enhances permissions and access control.'
    },
    {
      icon: Settings,
      title: 'Approval System',
      desc: 'Three-tier verification workflow. Certifications are first checked by Staff, then approved by HODs, ensuring high credibility.'
    },
    {
      icon: Cpu,
      title: 'AI Insights & Scans',
      desc: 'Automated skill gap scanning, career recommendation algorithms, and AI resume summarizers powered by local models.'
    },
    {
      icon: MapPin,
      title: 'GPS Geotag Verification',
      desc: 'Ensures verification authenticity by capturing geotagged GPS metadata during activity log creation to prevent fake submissions.'
    }
  ];

  return (
    <div className="min-h-screen bg-white transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
            >
              Enterprise-Grade <span className="text-indigo-600">Features</span>
            </motion.h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore the advanced features powering the Skill Track certificate tracking, verification, and academic management system.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {features.map((f, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Interactive Feature Focus */}
          <div className="bg-indigo-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest bg-indigo-500 px-3 py-1 rounded-full">Coming Soon</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">Smart API Verification Embeds</h2>
              <p className="text-indigo-100 leading-relaxed mb-6">
                Universities can soon place verified badges directly on their websites or student portal headers. Employers can verify records from external corporate tools using our fast, structured JSON payloads.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2 text-indigo-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">CORS Protected</span>
                </div>
                <div className="flex items-center space-x-2 text-indigo-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Webhooks Integration</span>
                </div>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-12 translate-x-12">
              <Cpu className="w-96 h-96" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FeaturesPage;

import React, { useEffect, useState } from 'react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { Cpu, Terminal, Key, ShieldCheck, Check } from 'lucide-react';
import { motion } from 'motion/react';

const ApiDocumentation: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Skill Track | API Reference';
  }, []);

  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/auth/login',
      desc: 'Authenticate user and retrieve JSON Web Token (JWT) along with role permissions.',
      req: `{\n  "email": "user@example.com",\n  "password": "••••••••"\n}`,
      res: `{\n  "token": "eyJhbGciOi...",\n  "user": {\n    "uid": "user_123",\n    "email": "user@example.com",\n    "role": "student"\n  }\n}`
    },
    {
      method: 'GET',
      path: '/api/verify/:certId',
      desc: 'Verify digital certificate validity and fetch associated student metadata without authentication.',
      req: `// GET Request to:\n// https://api.skilltrack.in/api/verify/cert_789`,
      res: `{\n  "success": true,\n  "data": {\n    "id": "cert_789",\n    "eventName": "Hackathon 2026",\n    "studentName": "John Doe",\n    "status": "verified",\n    "gpsVerified": true\n  }\n}`
    },
    {
      method: 'GET',
      path: '/api/public/resume/:id',
      desc: 'Retrieve verified public resume builder payload for external recruiter matching.',
      req: `// GET Request to:\n// https://api.skilltrack.in/api/public/resume/user_123`,
      res: `{\n  "success": true,\n  "data": {\n    "name": "John Doe",\n    "skills": ["React", "TypeScript"],\n    "verifiedCertifications": [\n      { "title": "Advanced SQL", "issuer": "Oracle" }\n    ]\n  }\n}`
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Cpu className="w-8 h-8" />
            </div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4"
            >
              Developer <span className="text-indigo-600 dark:text-indigo-400">API Reference</span>
            </motion.h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Integrate Skill Track verification checks and student portfolio data directly into your HR portals and databases.
            </p>
          </div>

          {/* Quickstart details */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Key className="w-5 h-5 mr-2 text-indigo-500" />
                API Authentication
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Most API requests require a valid JSON Web Token (JWT) sent in the HTTP headers. You can retrieve a token by hitting the login endpoint.
              </p>
              <pre className="p-4 bg-gray-950 text-gray-300 rounded-xl text-xs font-mono">
                Authorization: Bearer &lt;your_jwt_token&gt;
              </pre>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-emerald-500" />
                Rate Limits & CORS
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Standard institution API keys are limited to 1,000 requests per minute. Background check crawlers are subject to CORS protection and should register origin domains in the Admin Settings panel.
              </p>
            </div>
          </div>

          {/* Endpoints */}
          <div className="space-y-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Endpoint Reference</h2>
            {endpoints.map((ep, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black ${ep.method === 'POST' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{ep.method}</span>
                  <code className="text-sm font-mono font-bold text-gray-900 dark:text-white">{ep.path}</code>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-6">{ep.desc}</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center"><Terminal className="w-3.5 h-3.5 mr-1" /> Payload Request</span>
                      <button 
                        onClick={() => copyToClipboard(ep.req, `${i}-req`)}
                        className="text-[10px] font-semibold text-indigo-500 hover:underline flex items-center"
                      >
                        {copied === `${i}-req` ? <Check className="w-3 h-3 mr-1" /> : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-4 bg-gray-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">{ep.req}</pre>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center"><Terminal className="w-3.5 h-3.5 mr-1" /> Response Payload</span>
                      <button 
                        onClick={() => copyToClipboard(ep.res, `${i}-res`)}
                        className="text-[10px] font-semibold text-indigo-500 hover:underline flex items-center"
                      >
                        {copied === `${i}-res` ? <Check className="w-3 h-3 mr-1" /> : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-4 bg-gray-950 text-indigo-300 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">{ep.res}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApiDocumentation;

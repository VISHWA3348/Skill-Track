import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Mail, 
  Linkedin, 
  Github, 
  Globe, 
  Award, 
  Briefcase, 
  Layers, 
  User, 
  FileCheck,
  ChevronRight,
  Download,
  Share2
} from 'lucide-react';

interface PublicResumeData {
  user: any;
  profile: any;
  skills: any[];
  projects: any[];
  experience: any[];
  certs: any[];
}

const ResumePublicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/public/resume/${id}`);
        if (!response.ok) throw new Error('Resume not found or private');
        const result = await response.json();
        setData(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Resume Not Found</h1>
          <p className="text-slate-500 font-medium mb-8">{error || 'This resume might be private or doesn\'t exist.'}</p>
          <a href="/" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const { user, profile, skills, projects, experience, certs } = data;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
      {/* Dynamic Header/Actions */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <h2 className="font-black text-slate-900 tracking-tighter">CertTrack Resume</h2>
          <div className="flex gap-2">
            <button className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all no-print">
                <Share2 className="w-5 h-5" />
            </button>
            <button 
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all no-print"
            >
                <Download className="w-4 h-4" />
                PDF
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .bg-slate-50 { background: white !important; }
          .rounded-[2.5rem] { border-radius: 0 !important; shadow: none !important; border: none !important; }
          aside { width: 30% !important; background: #0f172a !important; -webkit-print-color-adjust: exact; }
          main { width: 70% !important; }
          section { page-break-inside: avoid; }
          .shadow-2xl { box-shadow: none !important; }
          .pt-24 { pt-0 !important; padding-top: 0 !important; }
        }
      `}} />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row min-h-[1000px]">
          
          {/* Sidebar Section */}
          <aside className="w-full md:w-80 bg-slate-900 text-white p-10 flex flex-col">
            <div className="mb-10 text-center md:text-left">
              {user.profile_photo ? (
                <img src={user.profile_photo} alt={user.name} className="w-32 h-32 rounded-3xl object-cover mb-6 border-4 border-slate-800 shadow-2xl mx-auto md:mx-0" />
              ) : (
                <div className="w-32 h-32 rounded-3xl bg-blue-600 flex items-center justify-center text-4xl font-black shadow-2xl mb-6 mx-auto md:mx-0">
                  {user.name.charAt(0)}
                </div>
              )}
              <h1 className="text-3xl font-black tracking-tight mb-2 leading-tight">{user.name}</h1>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">{profile.headline || 'Professional'}</p>
            </div>

            <div className="space-y-10">
              {/* Contact */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Contact Info</h4>
                <a href={`mailto:${user.email}`} className="flex items-center gap-3 text-sm font-medium hover:text-blue-400 transition-colors group">
                    <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-900 transition-colors"><Mail className="w-4 h-4" /></div>
                    {user.email}
                </a>
                {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" className="flex items-center gap-3 text-sm font-medium hover:text-blue-400 transition-colors group">
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-900 transition-colors"><Linkedin className="w-4 h-4" /></div>
                        LinkedIn
                    </a>
                )}
                {profile.github_url && (
                    <a href={profile.github_url} target="_blank" className="flex items-center gap-3 text-sm font-medium hover:text-blue-400 transition-colors group">
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-900 transition-colors"><Github className="w-4 h-4" /></div>
                        GitHub
                    </a>
                )}
                {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" className="flex items-center gap-3 text-sm font-medium hover:text-blue-400 transition-colors group">
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-900 transition-colors"><Globe className="w-4 h-4" /></div>
                        Portfolio
                    </a>
                )}
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span key={skill.id} className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs font-bold border border-slate-700">
                        {skill.skill_name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Languages */}
              {profile.languages && JSON.parse(profile.languages).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Languages</h4>
                    <div className="space-y-2">
                        {JSON.parse(profile.languages).map((lang: string, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs font-bold">
                                <span>{lang}</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
              )}
            </div>

            <div className="mt-auto pt-10 text-center">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Verified by CertTrack</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8 md:p-16 bg-white">
            
            {/* About */}
            <section className="mb-16">
              <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <User className="w-4 h-4" /> Professional Summary
              </h2>
              <div className="relative">
                  <div className="absolute -left-6 top-0 bottom-0 w-1 bg-slate-100 rounded-full" />
                  <p className="text-lg text-slate-700 font-medium leading-relaxed italic pl-4">
                    {profile.summary || 'Aspiring professional looking for growth opportunities.'}
                  </p>
              </div>
            </section>

            {/* Experience */}
            <section className="mb-16">
              <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <Briefcase className="w-4 h-4" /> Experience
              </h2>
              <div className="space-y-12">
                {experience.map(exp => (
                  <div key={exp.id} className="relative pl-10 border-l-2 border-slate-100">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-blue-600 rounded-full" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                        <h3 className="text-xl font-black text-slate-900">{exp.role}</h3>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest mt-2 md:mt-0">
                            {exp.duration}
                        </span>
                    </div>
                    <p className="text-lg font-bold text-slate-500 mb-4">{exp.company_name}</p>
                    <p className="text-slate-600 font-medium leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Projects */}
            <section className="mb-16">
              <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <Layers className="w-4 h-4" /> Key Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map(proj => (
                  <div key={proj.id} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all group">
                    <h3 className="text-xl font-black text-slate-900 mb-2">{proj.project_name}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {proj.technologies.split(',').map((t, i) => (
                            <span key={i} className="text-[10px] font-black bg-white text-blue-600 px-2 py-1 rounded-md border border-slate-200 uppercase">
                                {t.trim()}
                            </span>
                        ))}
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                        {proj.description}
                    </p>
                    <div className="flex gap-4">
                        {proj.github_url && <a href={proj.github_url} target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-2"><Github className="w-4 h-4" /> Code</a>}
                        {proj.live_url && <a href={proj.live_url} target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4" /> Live</a>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Certifications */}
            <section>
              <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <FileCheck className="w-4 h-4" /> Verified Certifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certs.map(cert => (
                  <div key={cert.id} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900">{cert.event_name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cert.type}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                  </div>
                ))}
              </div>
            </section>

          </main>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            Generated by CertTrack Enterprise Verification System &copy; 2026
        </footer>
      </div>
    </div>
  );
};

export default ResumePublicView;

import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  User, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Plus, 
  Trash2, 
  Download, 
  Share2, 
  Save, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  Layout,
  Layers,
  ChevronRight,
  ExternalLink,
  Linkedin,
  Github,
  Globe,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface ResumeProfile {
  headline: string;
  summary: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  languages: string;
  interests: string;
  template_name: string;
  public_visibility: number;
}

interface Project {
  id: string;
  project_name: string;
  description: string;
  technologies: string;
  github_url: string;
  live_url: string;
}

interface Experience {
  id: string;
  company_name: string;
  role: string;
  duration: string;
  description: string;
}

interface Skill {
  id: string;
  skill_name: string;
  skill_level: string;
  auto_detected: number;
}

const ResumeBuilderView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ResumeProfile>({
    headline: '',
    summary: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    languages: '[]',
    interests: '[]',
    template_name: 'modern',
    public_visibility: 1
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [scoreData, setScoreData] = useState<{ score: number, suggestions: string[] }>({ score: 0, suggestions: [] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchResumeData();
  }, []);

  const fetchResumeData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const res = await fetch(`${API_BASE_URL}/api/resume/full-profile`, { headers });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const { profile, projects, experience, skills, scoreInfo } = result.data;
          if (profile) setProfile(profile);
          if (projects) setProjects(projects);
          if (experience) setExperience(experience);
          if (skills) setSkills(skills);
          if (scoreInfo) setScoreData(scoreInfo);
        }
      } else {
        toast.error('Failed to load resume data');
      }
    } catch (error) {
      toast.error('Failed to load resume data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profile)
      });
      if (response.ok) {
        toast.success('Profile saved successfully');
        fetchResumeData();
      }
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success('Project added');
        fetchResumeData();
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      toast.error('Failed to add project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        toast.success('Project removed');
        fetchResumeData();
      }
    } catch (error) {
      toast.error('Failed to remove project');
    }
  };

  const handleAddExperience = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/experience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success('Experience added');
        fetchResumeData();
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      toast.error('Failed to add experience');
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/experience/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        toast.success('Experience removed');
        fetchResumeData();
      }
    } catch (error) {
      toast.error('Failed to remove experience');
    }
  };

  const handleDetectSkills = async () => {
    toast.promise(
      fetch(`${API_BASE_URL}/api/resume/ai/detect-skills`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json()),
      {
        loading: 'AI is analyzing your certificates and projects...',
        success: (data) => {
          fetchResumeData();
          return `Detected ${data.data.length} skills! Added ${data.added.length} new ones.`;
        },
        error: 'Failed to analyze skills'
      }
    );
  };

  const handleGenerateSummary = async () => {
    toast.promise(
      fetch(`${API_BASE_URL}/api/resume/ai/generate-summary`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json()),
      {
        loading: 'AI is generating your professional summary...',
        success: (data) => {
          setProfile({ ...profile, summary: data.summary });
          return 'Summary generated! Click Save to keep it.';
        },
        error: 'Failed to generate summary'
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              AI Resume Builder
            </h2>
            <p className="text-slate-500 mt-1 font-medium">Build a professional, ATS-friendly resume in minutes.</p>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-center px-4 border-r border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resume Score</p>
              <p className={`text-3xl font-black ${getScoreColor(scoreData.score)}`}>{scoreData.score}%</p>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900">Keep it up!</p>
              <p className="text-xs text-slate-500 font-medium">Complete more sections to reach 100%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'profile', name: 'Profile Details', icon: <User className="w-5 h-5" /> },
            { id: 'skills', name: 'Skills & Tech', icon: <Star className="w-5 h-5" /> },
            { id: 'experience', name: 'Work Experience', icon: <Briefcase className="w-5 h-5" /> },
            { id: 'projects', name: 'Key Projects', icon: <Layers className="w-5 h-5" /> },
            { id: 'templates', name: 'Resume Style', icon: <Layout className="w-5 h-5" /> },
            { id: 'preview', name: 'Live Preview', icon: <Sparkles className="w-5 h-5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-2' 
                : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                <span>{tab.name}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
            </button>
          ))}

          {/* AI Suggestions Box */}
          {scoreData.suggestions.length > 0 && (
            <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
              <h4 className="text-amber-800 font-bold text-sm flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" />
                Improvement Tips
              </h4>
              <ul className="space-y-2">
                {scoreData.suggestions.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-700 font-medium flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-400 rounded-full" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 min-h-[600px]">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900">Personal Information</h3>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Professional Headline</label>
                  <input 
                    type="text" 
                    value={profile.headline}
                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                    placeholder="e.g. Full Stack Developer | UI/UX Enthusiast"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">LinkedIn URL</label>
                  <input 
                    type="url" 
                    value={profile.linkedin_url}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">GitHub URL</label>
                  <input 
                    type="url" 
                    value={profile.github_url}
                    onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Portfolio/Website</label>
                  <input 
                    type="url" 
                    value={profile.portfolio_url}
                    onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Professional Summary</label>
                  <button 
                    onClick={handleGenerateSummary}
                    className="text-xs font-black text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI GENERATE
                  </button>
                </div>
                <textarea 
                  rows={6}
                  value={profile.summary}
                  onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                  placeholder="Tell your professional story..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Technical Skills</h3>
                  <p className="text-sm text-slate-500 font-medium">Skills detected from your certificates and projects.</p>
                </div>
                <button 
                  onClick={handleDetectSkills}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Sync Skills
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const skill_name = (form.elements.namedItem('skill_name') as HTMLInputElement).value;
                  const skill_level = (form.elements.namedItem('skill_level') as HTMLSelectElement).value;
                  
                  const res = await fetch(`${API_BASE_URL}/api/resume/skills`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ skill_name, skill_level })
                  });
                  if (res.ok) {
                    toast.success('Skill added');
                    fetchResumeData();
                    form.reset();
                  }
                }} className="col-span-1 md:col-span-2 flex gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <input name="skill_name" placeholder="Skill name (e.g. React.js)" className="flex-1 px-4 py-2 rounded-lg border border-slate-200" required />
                  <select name="skill_level" className="px-4 py-2 rounded-lg border border-slate-200 bg-white">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Expert</option>
                  </select>
                  <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                    <Plus className="w-6 h-6" />
                  </button>
                </form>

                <div className="col-span-1 md:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {skills.map(skill => (
                    <div key={skill.id} className="relative group p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition-all hover:shadow-md">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{skill.skill_name}</span>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{skill.skill_level}</span>
                      </div>
                      {skill.auto_detected === 1 && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-3 h-3 text-blue-500" />
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          fetch(`${API_BASE_URL}/api/resume/skills/${skill.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                          }).then(() => fetchResumeData());
                        }}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-2xl font-bold text-slate-900">Key Projects</h3>
              
              <form onSubmit={handleAddProject} className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="project_name" placeholder="Project Name" className="px-4 py-3 rounded-xl border border-slate-200" required />
                  <input name="technologies" placeholder="Technologies (comma separated)" className="px-4 py-3 rounded-xl border border-slate-200" required />
                  <input name="github_url" type="url" placeholder="GitHub Repository" className="px-4 py-3 rounded-xl border border-slate-200" />
                  <input name="live_url" type="url" placeholder="Live Demo URL" className="px-4 py-3 rounded-xl border border-slate-200" />
                </div>
                <textarea name="description" rows={3} placeholder="Describe what you built..." className="w-full px-4 py-3 rounded-xl border border-slate-200" required />
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Project to Resume
                </button>
              </form>

              <div className="grid grid-cols-1 gap-4">
                {projects.map(proj => (
                  <div key={proj.id} className="p-6 border border-slate-200 rounded-3xl hover:border-blue-200 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-black text-slate-900">{proj.project_name}</h4>
                      <button onClick={() => handleDeleteProject(proj.id)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed font-medium">{proj.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {proj.technologies.split(',').map((t, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      {proj.github_url && <a href={proj.github_url} target="_blank" className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-slate-900"><Github className="w-4 h-4" /> Repo</a>}
                      {proj.live_url && <a href={proj.live_url} target="_blank" className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-slate-900"><Globe className="w-4 h-4" /> Demo</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-2xl font-bold text-slate-900">Work & Internships</h3>
              
              <form onSubmit={handleAddExperience} className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="company_name" placeholder="Company/Organization" className="px-4 py-3 rounded-xl border border-slate-200" required />
                  <input name="role" placeholder="Your Role (e.g. Intern)" className="px-4 py-3 rounded-xl border border-slate-200" required />
                  <input name="duration" placeholder="Duration (e.g. June 2023 - Aug 2023)" className="col-span-1 md:col-span-2 px-4 py-3 rounded-xl border border-slate-200" required />
                </div>
                <textarea name="description" rows={3} placeholder="What did you achieve?" className="w-full px-4 py-3 rounded-xl border border-slate-200" required />
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Experience
                </button>
              </form>

              <div className="space-y-4">
                {experience.map(exp => (
                  <div key={exp.id} className="p-6 border border-slate-200 rounded-3xl hover:border-blue-200 transition-all flex justify-between items-center group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-black text-slate-900">{exp.role}</h4>
                        <span className="text-xs font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg">{exp.duration}</span>
                      </div>
                      <p className="font-bold text-slate-500 text-sm mb-2">{exp.company_name}</p>
                      <p className="text-sm text-slate-600 line-clamp-2 font-medium">{exp.description}</p>
                    </div>
                    <button onClick={() => handleDeleteExperience(exp.id)} className="ml-4 text-red-400 hover:text-red-600 p-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-2xl font-bold text-slate-900">Select Template</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { id: 'modern', name: 'Modern Professional', desc: 'Clean layout with a stylish sidebar for skills.' },
                  { id: 'minimal', name: 'Minimal ATS', desc: 'High machine readability, perfect for big companies.' },
                  { id: 'corporate', name: 'Executive Corporate', desc: 'Traditional academic style with clean typography.' },
                  { id: 'creative', name: 'Creative Tech', desc: 'Vibrant badges and modern spacing for startups.' },
                ].map(tmp => (
                  <button
                    key={tmp.id}
                    onClick={() => {
                      setProfile({ ...profile, template_name: tmp.id });
                      handleSaveProfile();
                    }}
                    className={`p-6 rounded-3xl text-left transition-all border-2 ${
                      profile.template_name === tmp.id 
                      ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-50' 
                      : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <h4 className="text-lg font-black text-slate-900 mb-1">{tmp.name}</h4>
                    <p className="text-xs text-slate-500 font-medium mb-4">{tmp.desc}</p>
                    <div className={`h-32 rounded-xl bg-white border border-slate-100 overflow-hidden relative`}>
                        {/* Fake Preview */}
                        <div className="p-4 space-y-2">
                            <div className="w-1/2 h-2 bg-slate-200 rounded-full" />
                            <div className="w-1/3 h-1.5 bg-slate-100 rounded-full" />
                            <div className="grid grid-cols-4 gap-1 pt-4">
                                <div className="h-4 bg-blue-100 rounded" />
                                <div className="h-4 bg-blue-100 rounded" />
                                <div className="h-4 bg-blue-100 rounded" />
                            </div>
                        </div>
                        {profile.template_name === tmp.id && (
                            <div className="absolute inset-0 bg-blue-600/5 flex items-center justify-center">
                                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                            </div>
                        )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl text-white shadow-2xl">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Resume is Ready!
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 font-medium italic">Share your progress with the world.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => window.open(`/resume/${localStorage.getItem('uid')}`, '_blank')}
                        className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => window.open(`/resume/${localStorage.getItem('uid')}`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                        <Download className="w-5 h-5" />
                        Download PDF
                    </button>
                </div>
              </div>

              {/* Public Link Card */}
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h4 className="text-blue-900 font-bold mb-1 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Public Resume Link
                    </h4>
                    <code className="text-xs text-blue-600 font-mono bg-white px-3 py-1 rounded-lg border border-blue-200">
                        certtrack.com/resume/{localStorage.getItem('uid') || 'vishwa'}
                    </code>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Public Visibility</span>
                    <button 
                        onClick={() => {
                            setProfile({ ...profile, public_visibility: profile.public_visibility === 1 ? 0 : 1 });
                            handleSaveProfile();
                        }}
                        className={`w-14 h-8 rounded-full p-1 transition-all ${profile.public_visibility === 1 ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${profile.public_visibility === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
              </div>

              {/* Mini Preview Box */}
              <div className="border-4 border-slate-100 rounded-[2rem] p-8 min-h-[800px] shadow-inner bg-slate-50/30 overflow-hidden relative">
                 <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {profile.template_name} template preview
                 </div>
                 
                 {/* Real layout simulation */}
                 <div className="bg-white shadow-2xl rounded-2xl min-h-full overflow-hidden flex">
                    {/* Template Rendering Logic (simplified for preview) */}
                    <div className="w-1/3 bg-slate-900 p-8 text-white">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl mb-6" />
                        <h1 className="text-xl font-black mb-1">Your Name</h1>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-8">{profile.headline || 'Headline'}</p>
                        
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {skills.slice(0, 8).map(s => (
                                        <span key={s.id} className="text-[9px] bg-white/10 px-2 py-1 rounded font-bold">{s.skill_name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Connect</h4>
                                {profile.linkedin_url && <div className="flex items-center gap-2 text-[9px] font-medium"><Linkedin className="w-3 h-3 text-blue-400"/> LinkedIn</div>}
                                {profile.github_url && <div className="flex items-center gap-2 text-[9px] font-medium"><Github className="w-3 h-3 text-slate-400"/> GitHub</div>}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-10 bg-white">
                        <section className="mb-10">
                            <h2 className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                                <User className="w-3 h-3" /> Professional Summary
                            </h2>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4">
                                {profile.summary || 'Write a summary to see it here...'}
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-[10px] font-black text-blue-600 uppercase mb-6 tracking-widest flex items-center gap-2">
                                <Briefcase className="w-3 h-3" /> Experience
                            </h2>
                            <div className="space-y-6">
                                {experience.map(exp => (
                                    <div key={exp.id}>
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="text-sm font-black text-slate-900">{exp.role}</h4>
                                            <span className="text-[9px] font-bold text-slate-400">{exp.duration}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{exp.company_name}</p>
                                        <p className="text-[10px] text-slate-600 font-medium">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-[10px] font-black text-blue-600 uppercase mb-6 tracking-widest flex items-center gap-2">
                                <Layers className="w-3 h-3" /> Key Projects
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                {projects.map(proj => (
                                    <div key={proj.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <h4 className="text-xs font-black text-slate-900 mb-1">{proj.project_name}</h4>
                                        <p className="text-[9px] text-slate-500 font-bold mb-2 uppercase tracking-tighter">{proj.technologies}</p>
                                        <p className="text-[9px] text-slate-600 font-medium line-clamp-2">{proj.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilderView;

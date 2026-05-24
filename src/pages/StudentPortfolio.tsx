import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Award, Briefcase, Download, ArrowLeft, Shield, MapPin, Calendar, Mail, Phone, ExternalLink, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { exportPortfolioToPDF } from '../services/portfolioExport';

export default function StudentPortfolio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/students/${id}/profile`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          setData(result.data);
        } else {
          toast.error("Failed to load portfolio");
        }
      } catch (error) {
        toast.error("Error fetching data");
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [id]);

  const handleDownloadResume = async () => {
    try {
      const response = await fetch(`/api/students/${id}/resume`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to generate resume');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Resume downloaded successfully");
    } catch (error) {
      toast.error("Failed to download resume");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!data) return <div className="flex items-center justify-center min-h-screen text-red-500">Student not found</div>;

  const { profile, certifications, activities, score } = data;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-blue-600 h-48 w-full"></div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
        >
          {/* Header/Profile Info */}
          <div className="p-8 sm:flex items-center justify-between">
            <div className="sm:flex items-center space-x-6">
              <div className="h-32 w-32 rounded-2xl bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {(profile.profile_photo || profile.profilePhoto) ? (
                  <img 
                    src={profile.profile_photo || profile.profilePhoto} 
                    alt={profile.name} 
                    className="h-full w-full object-cover" 
                    onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       target.onerror = null;
                       target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(profile.name || 'User') + "&background=random";
                    }}
                  />
                ) : (
                  <User className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <div className="mt-4 sm:mt-0">
                <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-blue-600 font-medium">{profile.role?.toUpperCase()}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center"><Mail className="h-4 w-4 mr-1"/> {profile.email}</span>
                  <span className="flex items-center"><MapPin className="h-4 w-4 mr-1"/> {profile.city || 'Location N/A'}</span>
                  <span className="flex items-center"><Shield className="h-4 w-4 mr-1"/> Score: {score}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 sm:mt-0 flex flex-wrap gap-3">
              <button 
                onClick={() => exportPortfolioToPDF(profile, certifications, activities)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <FileText className="h-4 w-4 mr-2" /> Export PDF
              </button>
              <button 
                onClick={handleDownloadResume}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download className="h-4 w-4 mr-2" /> Resume
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 border-t border-gray-100">
            {/* Left Column: Details */}
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Intelligence</h2>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-gray-400 uppercase">Current CGPA</span>
                       <span className="text-xl font-black text-blue-600">{data.academic?.cgpa || '0.00'}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Attendance</span>
                      <span className="font-bold">{data.academic?.attendance_percentage || 0}%</span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: `${data.academic?.attendance_percentage || 0}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Active Arrears</span>
                      <span className={`font-bold ${data.academic?.arrears > 0 ? 'text-red-500' : 'text-gray-900'}`}>{data.academic?.arrears || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Current Semester</span>
                      <span className="font-bold">{data.academic?.semester || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Verified Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {data.skills?.map((sk: any) => (
                    <span key={sk.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 uppercase tracking-tight">
                      {sk.skill_name}
                    </span>
                  ))}
                  {(!data.skills || data.skills.length === 0) && <p className="text-xs text-gray-400 italic">No skills listed.</p>}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold">College</label>
                    <p className="text-sm font-medium text-gray-700">{profile.college_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold">Department</label>
                    <p className="text-sm font-medium text-gray-700">{profile.department_id || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold">Roll No</label>
                      <p className="text-sm font-medium text-gray-700">{profile.roll_no || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold">Year</label>
                      <p className="text-sm font-medium text-gray-700">{profile.year || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Middle & Right Column: Certs & Activities */}
            <div className="md:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-yellow-500" /> Certifications
                  </h2>
                  <span className="text-sm text-gray-500">{certifications.length} verified</span>
                </div>
                
                <div className="space-y-4">
                  {certifications.length > 0 ? certifications.map((c: any) => (
                    <div key={c.id} className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition bg-white shadow-sm">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-gray-800">{c.event_name}</h3>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full font-bold uppercase">{c.type}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{c.event_college_name}</p>
                      <div className="flex items-center mt-3 text-xs text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" /> {new Date(c.date).toLocaleDateString()}
                        {c.prize_position && <span className="ml-3 font-bold text-yellow-600">🏆 {c.prize_position}</span>}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      No certifications listed yet.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-blue-500" /> Career Activities
                  </h2>
                  <span className="text-sm text-gray-500">{activities.length} completed</span>
                </div>
                
                <div className="space-y-4">
                  {activities.length > 0 ? activities.map((a: any) => (
                    <div key={a.id} className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 transition bg-white shadow-sm">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-gray-800">{a.organization}</h3>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full font-bold uppercase">{a.type}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.details}</p>
                      <div className="flex items-center mt-3 text-xs text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" /> {a.duration}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      No career activities listed yet.
                    </div>
                  )}
                </div>
              </section>

              {data.remarks && data.remarks.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-purple-500" /> Academic Feedback
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {data.remarks.map((r: any) => (
                      <div key={r.id} className="p-4 rounded-xl border border-purple-100 bg-purple-50/30">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-purple-600 uppercase tracking-widest">{r.remark_type}</span>
                          <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 font-medium italic">"{r.remark}"</p>
                        <p className="text-xs font-bold text-gray-900 mt-3">— Prof. {r.staff_name}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

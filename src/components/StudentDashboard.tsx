import React, { useState, useEffect } from 'react';
import { db } from '../api/localApi';
import { collection, query, where, onSnapshot, orderBy } from '../api/localApi';
import { Award, Briefcase, GraduationCap, Building2, Calendar, MapPin, Trophy, User, Mail, Hash, LogOut, ExternalLink, Clock, Info, Globe } from 'lucide-react';
import { motion } from 'motion/react';

interface Student {
  id: string;
  name: string;
  department: string;
  year: string;
  contact: string;
  password?: string;
  photoURL?: string;
  academicYear?: string;
  academic_year?: string;
  class?: string;
  section?: string;
}

interface Certification {
  docId: string;
  studentId: string;
  eventName: string;
  level: string;
  position: string;
  date: string;
  fileUrl: string;
}

interface CareerActivity {
  docId: string;
  studentId: string;
  type: 'Internship' | 'Workshop' | 'Online Course' | 'Project';
  organization: string;
  duration: string;
  details: string;
}

interface StudentDashboardProps {
  student: Student;
  onLogout: () => void;
}

export default function StudentDashboard({ student, onLogout }: StudentDashboardProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [activities, setActivities] = useState<CareerActivity[]>([]);

  useEffect(() => {
    const qCerts = query(collection(db, 'certifications'), where('studentId', '==', student.id), orderBy('date', 'desc'));
    const unsubCerts = onSnapshot(qCerts, (snap) => {
      setCertifications(snap.docs.map(doc => ({ ...doc.data(), docId: doc.id })) as Certification[]);
    });

    const qActivities = query(collection(db, 'careerActivities'), where('studentId', '==', student.id));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(doc => ({ ...doc.data(), docId: doc.id })) as CareerActivity[]);
    });

    return () => {
      unsubCerts();
      unsubActivities();
    };
  }, [student.id]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Internship': return Building2;
      case 'Workshop': return GraduationCap;
      case 'Online Course': return Globe;
      case 'Project': return Briefcase;
      default: return Info;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Internship': return 'text-blue-600 bg-blue-50';
      case 'Workshop': return 'text-orange-600 bg-orange-50';
      case 'Online Course': return 'text-emerald-600 bg-emerald-50';
      case 'Project': return 'text-purple-600 bg-purple-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <Award className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl text-slate-900 hidden sm:block">Student Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-900">{student.name}</p>
              <p className="text-xs text-slate-500">{student.id}</p>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 text-slate-600 hover:text-red-600 font-semibold text-sm transition-colors px-4 py-2 rounded-xl hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>
 
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="px-8 pb-8 -mt-12">
            <div className="flex flex-col md:flex-row items-end gap-6 mb-6">
              <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-xl">
                <div className="w-full h-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-100">
                  {student.photoURL ? (
                    <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 pb-2">
                <h1 className="text-3xl font-bold text-slate-900">{student.name}</h1>
                <p className="text-slate-500 font-medium">
                  {student.department} • {student.academicYear || student.academic_year || `${student.year} Year`}
                  {student.section ? ` (${student.section})` : ''}
                </p>
              </div>
            </div>
 
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <Hash className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID</p>
                  <p className="font-mono font-bold text-slate-900">{student.id}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="font-bold text-slate-900">{student.department}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <GraduationCap className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year & Section</p>
                  <p className="font-bold text-slate-900">
                    {student.academicYear || student.academic_year || `${student.year} Year`}
                    {student.section ? ` - ${student.section}` : ''}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <GraduationCap className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree</p>
                  <p className="font-bold text-slate-900">{student.class || 'N/A'}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</p>
                  <p className="font-bold text-slate-900 truncate max-w-[150px]">{student.contact || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Certifications */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                My Certifications
              </h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                {certifications.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {certifications.map((cert) => (
                <motion.div 
                  key={cert.docId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900">{cert.eventName}</h3>
                      <p className="text-sm text-slate-500">{cert.level} Level</p>
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg text-xs font-bold">
                      {cert.position}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {cert.date}
                    </div>
                    {cert.fileUrl && (
                      <a 
                        href={cert.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Certificate
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
              {certifications.length === 0 && (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  No certifications recorded yet.
                </div>
              )}
            </div>
          </section>

          {/* Career Activities */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                Career Activities
              </h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                {activities.length}
              </span>
            </div>

            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getTypeIcon(activity.type);
                const colors = getTypeColor(activity.type);
                return (
                  <motion.div 
                    key={activity.docId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${colors} p-3 rounded-xl`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colors}`}>
                            {activity.type}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {activity.duration}
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900">{activity.organization}</h3>
                        {activity.details && (
                          <p className="text-sm text-slate-500 line-clamp-2 mt-2">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {activities.length === 0 && (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  No career activities recorded yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

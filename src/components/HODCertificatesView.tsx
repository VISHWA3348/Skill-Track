import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Clock, MapPin, Search, Filter,
  Download, Eye, CheckCircle2, XCircle, AlertTriangle,
  Calendar, User, FileText, ExternalLink, QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function HODCertificatesView() {
  const { profile } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [remark, setRemark] = useState('');

  const fetchCerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/certifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // HOD already gets filtered data from backend if isolation is active
        setCertificates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/certifications/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, remark })
      });
      if (res.ok) {
        toast.success(`Certificate ${status} successfully`);
        setShowDetailModal(false);
        fetchCerts();
        setRemark('');
      }
    } catch (e) {
      toast.error("Failed to update certificate");
    }
  };

  const filtered = certificates.filter(c => {
    const matchesSearch = c.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Strategic Certificate Review</h1>
          <p className="text-slate-500 font-medium">Verified achievements oversight and audit</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search achievements..."
              className="pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm font-bold text-slate-700"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="staff_approved">Staff Approved</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(cert => (
          <motion.div
            layout
            key={cert.id}
            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`p-3 rounded-2xl ${cert.status === 'pending' ? 'bg-amber-50 text-amber-600' : cert.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${cert.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    cert.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {cert.status.replace('_', ' ')}
                </span>
                {cert.fraudFlag && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase tracking-widest animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Flagged
                  </span>
                )}
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{cert.eventName}</h3>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black">
                {cert.studentName.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-500">{cert.studentName}</span>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                {new Date(cert.date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                {cert.eventCollegeName}
              </div>
            </div>

            <button
              onClick={() => { setSelectedCert(cert); setShowDetailModal(true); }}
              className="w-full py-4 bg-slate-50 text-slate-700 rounded-2xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> Review Details
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showDetailModal && selectedCert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{selectedCert.eventName}</h2>
                  <p className="text-slate-500 font-medium">Achievement verification for {selectedCert.studentName}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><XCircle className="w-8 h-8 text-slate-400" /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="aspect-[4/3] bg-slate-100 rounded-[32px] overflow-hidden border-4 border-slate-50 shadow-inner group relative">
                    <img src={selectedCert.fileUrl} className="w-full h-full object-contain" alt="Certificate" />
                    <a href={selectedCert.fileUrl} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black gap-2">
                      <ExternalLink className="w-6 h-6" /> View Original
                    </a>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[32px] space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Verification Intelligence</h4>
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-bold">GPS Audit Status</span>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedCert.gpsVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {selectedCert.gpsVerified ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    {selectedCert.fraudFlag && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                        <p className="text-xs font-black text-rose-600 uppercase mb-1">Fraud Detection Alert</p>
                        <p className="text-sm font-medium text-rose-700">{selectedCert.fraudReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white border border-slate-100 rounded-[24px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Achievement Type</p>
                      <p className="font-bold text-slate-900 capitalize">{selectedCert.type.replace('-', ' ')}</p>
                    </div>
                    <div className="p-5 bg-white border border-slate-100 rounded-[24px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Position</p>
                      <p className="font-bold text-slate-900">{selectedCert.prizePosition || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Decision Remarks</h4>
                    <textarea
                      className="w-full p-6 bg-slate-50 border-none rounded-[32px] font-medium focus:ring-2 focus:ring-indigo-500"
                      rows={4}
                      placeholder="Enter strategic remarks for approval/rejection..."
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleUpdateStatus(selectedCert.id, 'rejected')}
                      className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[24px] font-black text-lg hover:bg-rose-100 transition-all border-2 border-rose-100"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedCert.id, 'approved')}
                      className="flex-1 py-5 bg-emerald-600 text-white rounded-[24px] font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                    >
                      Approve
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Audit Timeline</h4>
                    <div className="space-y-4">
                      {selectedCert.remarks?.map((r: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black shrink-0">
                            {r.role.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{r.role.replace('_', ' ')}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(r.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700">{r.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

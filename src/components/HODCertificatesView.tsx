import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Clock, MapPin, Search, Filter,
  Download, Eye, CheckCircle2, XCircle, AlertTriangle,
  Calendar, User, FileText, ExternalLink, QrCode, ZoomIn, ZoomOut, Maximize2, Globe
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
  const [zoom, setZoom] = useState(1);

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
            <div className="flex items-start gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                {cert.studentName ? cert.studentName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-700 block truncate">{cert.studentName}</span>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">
                  {cert.student_roll_no || cert.rollNo || ''} ({cert.student_class || cert.class || ''} | {cert.academicYear || cert.academic_year || cert.student_year || cert.year || ''})
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-6 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Event: {new Date(cert.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{cert.eventCollegeName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-[10px] text-slate-400">
                  Submitted: {new Date(cert.created_at || cert.uploadTimestamp || cert.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {cert.gps_verified === 1 || cert.gpsVerified ? (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider">GPS Verified</span>
                ) : cert.exif_verification_result === 'Mismatch' || cert.exifVerificationResult === 'Mismatch' ? (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider">GPS Mismatch</span>
                ) : cert.exif_verification_result === 'Suspicious' || cert.exifVerificationResult === 'Suspicious' ? (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-wider">Suspicious EXIF</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">No GPS</span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider capitalize">
                  {(cert.type || '').replace('-', ' ')}
                </span>
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
        {showDetailModal && selectedCert && (() => {
          const sName = selectedCert.student_name || selectedCert.studentName || 'Student';
          const sEmail = selectedCert.student_email || selectedCert.studentEmail || '';
          const sPhoto = selectedCert.student_profile_photo || selectedCert.profilePhoto || selectedCert.photoUrl || '';
          const sRoll = selectedCert.student_roll_no || selectedCert.rollNo || '';
          const sClass = selectedCert.student_class || selectedCert.class || '';
          const sYear = selectedCert.academicYear || selectedCert.academic_year || selectedCert.student_year || selectedCert.year || '';
          const sSection = selectedCert.student_section || selectedCert.section || '';
          const sAddress = selectedCert.student_address || selectedCert.address || '';
          
          const isPdf = selectedCert.fileUrl?.toLowerCase().includes('.pdf');
          const mapLat = selectedCert.gps_lat || selectedCert.gps?.lat || selectedCert.exif_lat || selectedCert.exifLatitude || 0;
          const mapLng = selectedCert.gps_lng || selectedCert.gps?.lng || selectedCert.exif_lng || selectedCert.exifLongitude || 0;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="bg-white w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[32px] shadow-2xl p-8 border border-slate-100"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedCert.eventName || 'Certificate Review'}</h2>
                    <p className="text-slate-500 text-sm font-semibold">Departmental Credential Verification Panel</p>
                  </div>
                  <button 
                    onClick={() => { setShowDetailModal(false); setZoom(1); }} 
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <XCircle className="w-8 h-8 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Student Details + Document Viewer */}
                  <div className="space-y-6">
                    {/* Student Info Card */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-100 bg-white shrink-0 flex items-center justify-center">
                        {sPhoto ? (
                          <img src={sPhoto.startsWith('http') || sPhoto.startsWith('/') ? sPhoto : `/${sPhoto}`} className="w-full h-full object-cover" alt="Student" />
                        ) : (
                          <User className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{sName}</h4>
                        <p className="text-xs text-slate-500 truncate">{sEmail || 'No email provided'}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 font-semibold pt-1">
                          {sRoll && <span>Roll: {sRoll}</span>}
                          {sClass && <span>Class: {sClass} ({sYear.includes('Year') ? sYear : `${sYear || 'I'} Year`})</span>}
                          {sSection && <span>Sec: {sSection}</span>}
                        </div>
                        {sAddress && (
                          <p className="text-[10px] text-slate-500 font-semibold bg-white p-2 rounded-lg border border-slate-100 mt-2">
                            <span className="text-slate-400">Address:</span> {sAddress}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Certificate Document Viewer */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Certificate Document</h4>
                      {selectedCert.fileUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                          {isPdf ? (
                            <iframe src={selectedCert.fileUrl} className="w-full h-96" title="PDF Viewer" />
                          ) : (
                            <div className="w-full h-96 flex items-center justify-center p-2 bg-white">
                              <img src={selectedCert.fileUrl} className="max-h-full max-w-full object-contain" alt="Certificate Preview" />
                            </div>
                          )}
                          <div className="p-3 bg-slate-100 border-t flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-600">Type: {isPdf ? 'PDF Document' : 'Image File'}</span>
                            <a href={selectedCert.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                              View Original <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                          No certificate document uploaded
                        </div>
                      )}
                    </div>

                    {/* Zoomable Proof Photo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Proof Photo Evidence</h4>
                        {selectedCert.gpsPhotoUrl && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setZoom(1)} className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Reset"><Maximize2 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                      {selectedCert.gpsPhotoUrl ? (
                        <div className="h-64 rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden flex items-center justify-center relative group">
                          <img 
                            src={selectedCert.gpsPhotoUrl} 
                            style={{ transform: `scale(${zoom})` }}
                            className="max-h-full max-w-full object-contain transition-transform duration-200" 
                            alt="Proof Photo Evidence" 
                          />
                          <a href={selectedCert.gpsPhotoUrl} download className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="h-48 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                          No proof photo evidence provided
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: GPS + EXIF + Actions */}
                  <div className="space-y-6">
                    {/* GPS Details Table */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-indigo-500" /> Geolocation Intelligence
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] uppercase">Browser Coordinates</span>
                          <span className="text-slate-800">{selectedCert.gps ? `${selectedCert.gps.lat.toFixed(6)}, ${selectedCert.gps.lng.toFixed(6)}` : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] uppercase">Altitude & Accuracy</span>
                          <span className="text-slate-800">
                            {selectedCert.altitude !== null ? `${selectedCert.altitude.toFixed(1)}m` : 'N/A'} 
                            {selectedCert.accuracy !== null ? ` (±${selectedCert.accuracy.toFixed(1)}m)` : ''}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 col-span-2">
                          <span className="text-slate-400 block text-[10px] uppercase">Street & Locality</span>
                          <span className="text-slate-800">
                            {[selectedCert.street, selectedCert.locality, selectedCert.area].filter(Boolean).join(', ') || 'N/A'}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] uppercase">District & State</span>
                          <span className="text-slate-800">
                            {[selectedCert.district, selectedCert.state].filter(Boolean).join(', ') || 'N/A'}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[10px] uppercase">Country & Postal Code</span>
                          <span className="text-slate-800">
                            {[selectedCert.country, selectedCert.postalCode || selectedCert.postal_code].filter(Boolean).join(' - ') || 'N/A'}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 col-span-2 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Timezone</span>
                            <span className="text-slate-800 truncate block">{selectedCert.timezone || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Browser Timestamp</span>
                            <span className="text-slate-800 block truncate">{selectedCert.browserTimestamp ? new Date(selectedCert.browserTimestamp).toLocaleTimeString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXIF Metadata Table */}
                    <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-3">
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" /> EXIF Validation Status
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                        <div className="bg-white p-3 rounded-xl border border-indigo-50">
                          <span className="text-slate-400 block text-[10px] uppercase">Camera & Device</span>
                          <span className="text-slate-800 truncate block">{[selectedCert.exifCamera, selectedCert.exifDevice].filter(Boolean).join(' ') || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-50">
                          <span className="text-slate-400 block text-[10px] uppercase">Image Coordinates</span>
                          <span className="text-slate-800">{selectedCert.exifLatitude ? `${selectedCert.exifLatitude.toFixed(6)}, ${selectedCert.exifLongitude?.toFixed(6)}` : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-50">
                          <span className="text-slate-400 block text-[10px] uppercase">Image Timestamp</span>
                          <span className="text-slate-800 block truncate">{selectedCert.exifTimestamp ? new Date(selectedCert.exifTimestamp).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-50">
                          <span className="text-slate-400 block text-[10px] uppercase">Validation Status</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${
                            selectedCert.exifVerificationResult === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                            selectedCert.exifVerificationResult === 'Mismatch' ? 'bg-amber-100 text-amber-700' :
                            selectedCert.exifVerificationResult === 'Suspicious' ? 'bg-rose-100 text-rose-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{selectedCert.exifVerificationResult || 'No EXIF'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Google Map */}
                    {mapLat !== 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Interactive Audit Map</h4>
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                          <iframe 
                            src={`https://maps.google.com/maps?q=${mapLat},${mapLng}&z=15&output=embed`} 
                            className="w-full h-48 border-0" 
                            allowFullScreen 
                            loading="lazy" 
                            title="Interactive Maps"
                          />
                        </div>
                      </div>
                    )}

                    {/* Decisions Remarks & Actions */}
                    {selectedCert.status === 'pending' || selectedCert.status === 'staff_approved' ? (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Review Remarks</h4>
                        <textarea
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-none"
                          rows={3}
                          placeholder="Enter comments, validation reasons, or rejection details..."
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                        />
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleUpdateStatus(selectedCert.id, 'rejected')}
                            className="flex-1 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-sm transition-all border border-rose-200"
                          >
                            Reject Achievement
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedCert.id, 'approved')}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-100"
                          >
                            Approve & Verify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-100 rounded-2xl border text-center font-bold text-slate-600 text-sm">
                        Decision finalized: {selectedCert.status.replace('_', ' ').toUpperCase()}
                      </div>
                    )}

                    {/* Audit Timeline */}
                    <div className="pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Audit Timeline</h4>
                      <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                        {selectedCert.remarks && selectedCert.remarks.length > 0 ? (
                          selectedCert.remarks.map((r: any, idx: number) => (
                            <div key={idx} className="flex gap-3 text-xs">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black shrink-0 text-slate-500">
                                {r.role.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-indigo-600 uppercase text-[10px] tracking-wider">{r.role.replace('_', ' ')}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="font-semibold text-slate-700 break-words">{r.comment}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No audit records yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

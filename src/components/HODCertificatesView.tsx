import { API_BASE_URL } from '@/config/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Clock, MapPin, Search,
  Eye, CheckCircle, XCircle, AlertTriangle,
  Calendar, FileText, ExternalLink, Image as ImageIcon,
  RefreshCw, ChevronRight, UserCheck, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

/* ─── helpers ────────────────────────────────────────────────── */
const statusMeta: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:        { label: 'Pending Review',     bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  staff_approved: { label: 'Staff Approved',     bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'  },
  approved:       { label: 'Approved ✓',         bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected:       { label: 'Rejected',           bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'  },
};

function StatusBadge({ status }: { status: string }) {
  const m = statusMeta[status] ?? { label: status, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${m.bg} ${m.text} ${m.border}`}>
      {m.label}
    </span>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function HODCertificatesView() {
  const { profile } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFraud, setFilterFraud] = useState('all');

  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [remark, setRemark] = useState('');
  const [flagFraud, setFlagFraud] = useState(false);
  const [fraudReason, setFraudReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* photo lightbox */
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);

  /* ─── fetch ─────────────────────────────────────────────────── */
  const fetchCerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/certifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCertificates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch certificates', err);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  /* ─── update status ──────────────────────────────────────────── */
  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/certifications/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, remark })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }

      const result = await res.json();
      toast.success(`Certificate ${status === 'approved' ? 'approved ✅' : 'rejected ❌'} by ${result.reviewedBy || profile?.name || 'HOD'}`);
      setShowDetailModal(false);
      setRemark('');
      setFlagFraud(false);
      setFraudReason('');
      fetchCerts(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update certificate');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── filter ─────────────────────────────────────────────────── */
  const filtered = certificates.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || c.eventName?.toLowerCase().includes(q) || c.studentName?.toLowerCase().includes(q) || c.rollNo?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchFraud =
      filterFraud === 'all' ? true :
      filterFraud === 'fraud' ? c.fraudFlag :
      filterFraud === 'gps' ? c.gpsVerified :
      !c.fraudFlag;
    return matchSearch && matchStatus && matchFraud;
  });

  /* ─── summary counts ─────────────────────────────────────────── */
  const counts = {
    pending: certificates.filter(c => c.status === 'pending').length,
    staff_approved: certificates.filter(c => c.status === 'staff_approved').length,
    approved: certificates.filter(c => c.status === 'approved').length,
    rejected: certificates.filter(c => c.status === 'rejected').length,
    fraud: certificates.filter(c => c.fraudFlag).length,
  };

  /* ─── open detail ────────────────────────────────────────────── */
  const openDetail = (cert: any) => {
    setSelectedCert(cert);
    setRemark('');
    setFlagFraud(cert.fraudFlag || false);
    setFraudReason(cert.fraudReason || '');
    setShowDetailModal(true);
  };

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Certificate Review</h1>
          <p className="text-slate-500 font-medium mt-1">Review and approve department certificates</p>
        </div>
        <button onClick={() => fetchCerts(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Pending',        val: counts.pending,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Staff Approved', val: counts.staff_approved, color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Approved',       val: counts.approved,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected',       val: counts.rejected,       color: 'text-rose-600',    bg: 'bg-rose-50'    },
          { label: 'Fraud Flagged',  val: counts.fraud,          color: 'text-red-700',     bg: 'bg-red-50'     },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center border border-white shadow-sm`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search student, event, roll no..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="staff_approved">Staff Approved</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filterFraud} onChange={e => setFilterFraud(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">
          <option value="all">All Entries</option>
          <option value="fraud">Fraud Flagged</option>
          <option value="gps">GPS Verified</option>
          <option value="clean">Clean Only</option>
        </select>
      </div>

      {/* ── Certificate Cards ── */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-medium">Loading certificates…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-medium">No certificates match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(cert => (
            <motion.div layout key={cert.id}
              className={`bg-white p-6 rounded-[28px] border shadow-sm hover:shadow-md transition-all group cursor-pointer ${cert.fraudFlag ? 'border-red-200' : 'border-slate-100'}`}
              onClick={() => openDetail(cert)}>
              {/* top row */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${cert.status === 'pending' ? 'bg-amber-50' : cert.status === 'rejected' ? 'bg-rose-50' : cert.status === 'staff_approved' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                  <FileText className={`w-5 h-5 ${cert.status === 'pending' ? 'text-amber-500' : cert.status === 'rejected' ? 'text-rose-500' : cert.status === 'staff_approved' ? 'text-blue-500' : 'text-emerald-500'}`} />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={cert.status} />
                  {cert.fraudFlag && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-red-600 uppercase tracking-widest animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5" /> Fraud
                    </span>
                  )}
                  {cert.gpsVerified && !cert.fraudFlag && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                      <ShieldCheck className="w-2.5 h-2.5" /> GPS ✓
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{cert.eventName}</h3>
              <p className="text-xs font-bold text-slate-500 mb-4 line-clamp-1">{cert.eventCollegeName}</p>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0">
                    {cert.studentName?.charAt(0)}
                  </div>
                  {cert.studentName}
                  {cert.rollNo && <span className="text-slate-400 font-mono text-[10px]">({cert.rollNo})</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(cert.date).toLocaleDateString()}
                  <span className="ml-auto capitalize text-indigo-600 font-semibold text-[10px]">{cert.type}</span>
                </div>
                {cert.gps_lat && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {cert.locality || cert.district || `${Number(cert.gps_lat).toFixed(4)}, ${Number(cert.gps_lng).toFixed(4)}`}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Review Evidence</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {showDetailModal && selectedCert && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-4xl my-6 rounded-[36px] shadow-2xl overflow-hidden"
            >
              {/* modal header */}
              <div className="bg-indigo-700 px-8 py-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white leading-tight">{selectedCert.eventName}</h2>
                  <p className="text-indigo-200 text-sm font-medium mt-1">
                    {selectedCert.studentName}
                    {selectedCert.rollNo && <span className="text-indigo-300 ml-2">· {selectedCert.rollNo}</span>}
                    {selectedCert.class && <span className="text-indigo-300 ml-2">· {selectedCert.class} {selectedCert.year}</span>}
                  </p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-indigo-200 hover:text-white transition-colors mt-0.5">
                  <XCircle className="w-7 h-7" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[78vh] overflow-y-auto">
                {/* ── Info cards row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'College', val: selectedCert.college_name || selectedCert.collegeName },
                    { label: 'Event Date', val: selectedCert.date ? new Date(selectedCert.date).toLocaleDateString() : '—' },
                    { label: 'Type', val: selectedCert.type },
                    { label: 'Phone', val: selectedCert.phone_number || selectedCert.phoneNumber || '—' },
                  ].map(f => (
                    <div key={f.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                      <p className="text-sm font-bold text-slate-800 capitalize truncate">{f.val || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* ── Status + Badges ── */}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedCert.status} />
                  {selectedCert.fraudFlag && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-[11px] font-black">
                      <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Fraud Flagged
                    </span>
                  )}
                  {selectedCert.gpsVerified && !selectedCert.fraudFlag && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black">
                      <ShieldCheck className="w-3.5 h-3.5" /> GPS Verified ✓
                    </span>
                  )}
                  {selectedCert.cashPrizeAmount > 0 && (
                    <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full text-[11px] font-black">
                      ₹{selectedCert.cashPrizeAmount} Prize
                    </span>
                  )}
                </div>

                {/* ── Two-column: Certificate doc + Proof photo ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Certificate document */}
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Certificate Document
                    </p>
                    {selectedCert.fileUrl || selectedCert.certificate_url ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3]">
                        {(selectedCert.fileUrl || selectedCert.certificate_url || '').toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={selectedCert.fileUrl || selectedCert.certificate_url}
                            className="w-full h-full"
                            title="Certificate PDF"
                          />
                        ) : (
                          <img
                            src={selectedCert.fileUrl || selectedCert.certificate_url}
                            alt="Certificate"
                            className="w-full h-full object-contain cursor-zoom-in"
                            onClick={() => { setLightboxUrl(selectedCert.fileUrl || selectedCert.certificate_url); setShowLightbox(true); }}
                          />
                        )}
                        <a href={selectedCert.fileUrl || selectedCert.certificate_url} target="_blank" rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black gap-2 text-sm">
                          <ExternalLink className="w-5 h-5" /> Open Original
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-slate-100 rounded-2xl flex items-center justify-center">
                        <p className="text-slate-400 text-sm font-medium">No certificate file uploaded</p>
                      </div>
                    )}
                    {selectedCert.certificate_file_name && (
                      <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                        📄 {selectedCert.certificate_file_name} · {(selectedCert.certificate_file_type || '').toUpperCase()}
                      </p>
                    )}
                  </div>

                  {/* Proof photo */}
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> Proof Photo
                    </p>
                    {selectedCert.photoUrl || selectedCert.proof_photo_url ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3]">
                        <img
                          src={selectedCert.photoUrl || selectedCert.proof_photo_url}
                          alt="Proof"
                          className="w-full h-full object-contain cursor-zoom-in"
                          onClick={() => { setLightboxUrl(selectedCert.photoUrl || selectedCert.proof_photo_url); setShowLightbox(true); }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-sm gap-2">
                          <ImageIcon className="w-5 h-5" /> Enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-slate-100 rounded-2xl flex items-center justify-center">
                        <p className="text-slate-400 text-sm font-medium">No proof photo uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── GPS / EXIF panel ── */}
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> GPS & EXIF Verification
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2.5 font-mono text-xs">
                      {selectedCert.gps_lat ? (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">📍 GPS</span>
                          <span className="text-slate-700">{Number(selectedCert.gps_lat).toFixed(6)}, {Number(selectedCert.gps_lng).toFixed(6)}</span>
                        </div>
                      ) : null}
                      {selectedCert.exif_latitude ? (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">📷 EXIF</span>
                          <span className="text-blue-600">{Number(selectedCert.exif_latitude).toFixed(6)}, {Number(selectedCert.exif_longitude).toFixed(6)}</span>
                        </div>
                      ) : null}
                      {selectedCert.exif_timestamp ? (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">🕐 Photo</span>
                          <span className="text-slate-700">{new Date(selectedCert.exif_timestamp).toLocaleString()}</span>
                        </div>
                      ) : null}
                      {selectedCert.street ? (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">🏠 Addr</span>
                          <span className="text-slate-700 font-sans">
                            {[selectedCert.street, selectedCert.area, selectedCert.locality, selectedCert.district, selectedCert.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      ) : null}
                      {selectedCert.postal_code ? (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">📮 PIN</span>
                          <span className="text-slate-700">{selectedCert.postal_code}{selectedCert.country ? ` · ${selectedCert.country}` : ''}</span>
                        </div>
                      ) : null}
                      {!selectedCert.gps_lat && !selectedCert.exif_latitude && (
                        <p className="text-slate-400 italic">No GPS or EXIF data recorded for this submission.</p>
                      )}
                      {selectedCert.fraudReason ? (
                        <div className="mt-1 p-2 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-red-600 font-bold font-sans">⚠️ {selectedCert.fraudReason}</p>
                        </div>
                      ) : null}
                      {selectedCert.gps_lat && (
                        <a href={`https://www.google.com/maps?q=${selectedCert.gps_lat},${selectedCert.gps_lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-sans mt-1">
                          <MapPin className="w-3 h-3" /> Google Maps ↗
                        </a>
                      )}
                    </div>

                    {/* OSM Map */}
                    {selectedCert.gps_lat && selectedCert.gps_lng ? (
                      <iframe
                        className="w-full h-full min-h-[200px] rounded-2xl border border-slate-200"
                        loading="lazy"
                        title="Event Location"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedCert.gps_lng) - 0.012},${Number(selectedCert.gps_lat) - 0.012},${Number(selectedCert.gps_lng) + 0.012},${Number(selectedCert.gps_lat) + 0.012}&layer=mapnik&marker=${selectedCert.gps_lat},${selectedCert.gps_lng}`}
                      />
                    ) : (
                      <div className="bg-slate-100 rounded-2xl flex items-center justify-center min-h-[180px]">
                        <p className="text-slate-400 text-xs font-medium">No map data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Prize info ── */}
                {(selectedCert.prizePosition || selectedCert.prizeType) && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Prize Position', val: selectedCert.prizePosition || '—' },
                      { label: 'Prize Type', val: selectedCert.prizeType || '—' },
                      { label: 'Cash Amount', val: selectedCert.cashPrizeAmount ? `₹${selectedCert.cashPrizeAmount}` : '—' },
                    ].map(f => (
                      <div key={f.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                        <p className="text-sm font-bold text-slate-800">{f.val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Reviewer history ── */}
                {Array.isArray(selectedCert.remarks) && selectedCert.remarks.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Reviewer History
                    </p>
                    <div className="space-y-3 max-h-36 overflow-y-auto pr-1">
                      {selectedCert.remarks.map((r: any, i: number) => (
                        <div key={i} className="flex gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700 shrink-0">
                            {(r.role || r.reviewerName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{(r.reviewerName || r.userId || '—')} [{r.role}]</span>
                              <span className="text-[10px] font-bold text-slate-400">{r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-700">{r.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Review form ── */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> HOD Decision
                  </p>
                  <textarea
                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none transition-all"
                    rows={3}
                    placeholder="Add review remarks (optional)…"
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                  />

                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl">
                    <input type="checkbox" id="hodFraud" checked={flagFraud} onChange={e => setFlagFraud(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer" />
                    <label htmlFor="hodFraud" className="text-sm font-black text-red-700 flex items-center gap-1.5 cursor-pointer">
                      <AlertTriangle className="w-4 h-4" /> Flag as Fraudulent
                    </label>
                  </div>
                  {flagFraud && (
                    <input type="text" value={fraudReason} onChange={e => setFraudReason(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-red-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 outline-none"
                      placeholder="Reason for fraud flag…" />
                  )}

                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedCert.id, 'rejected')}
                      disabled={submitting}
                      className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-base hover:bg-rose-100 transition-all border-2 border-rose-100 flex items-center justify-center gap-2 disabled:opacity-50">
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedCert.id, 'approved')}
                      disabled={submitting}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-base hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50">
                      <CheckCircle className="w-5 h-5" /> {submitting ? 'Processing…' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Photo Lightbox ── */}
      <AnimatePresence>
        {showLightbox && lightboxUrl && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}>
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              src={lightboxUrl}
              alt="Enlarged"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-zoom-out"
            />
            <button onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white">
              <XCircle className="w-8 h-8" />
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

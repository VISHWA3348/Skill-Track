import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Search, Filter, ExternalLink, Trash2, Eye, MapPin, Clock, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

export default function FraudDetectionPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/superadmin/fraud-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      if (result.success) setLogs(result.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch fraud logs");
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'CRITICAL', color: 'bg-red-100 text-red-600', icon: <ShieldAlert className="w-4 h-4" /> };
    if (score >= 50) return { label: 'HIGH', color: 'bg-orange-100 text-orange-600', icon: <AlertTriangle className="w-4 h-4" /> };
    return { label: 'LOW', color: 'bg-amber-100 text-amber-600', icon: <AlertTriangle className="w-4 h-4" /> };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 border-dashed">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-red-900 text-sm">Critical Threats</h4>
          </div>
          <p className="text-3xl font-black text-red-600">{logs.filter(l => (l.confidence_score || 0) >= 80).length}</p>
          <p className="text-xs text-red-500 mt-1">Requires immediate manual review</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 border-dashed">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-orange-900 text-sm">Medium Risk</h4>
          </div>
          <p className="text-3xl font-black text-orange-600">{logs.filter(l => (l.confidence_score || 0) >= 50 && (l.confidence_score || 0) < 80).length}</p>
          <p className="text-xs text-orange-500 mt-1">Potential duplicate or EXIF mismatch</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 border-dashed">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-emerald-900 text-sm">Resolved Cases</h4>
          </div>
          <p className="text-3xl font-black text-emerald-600">12</p>
          <p className="text-xs text-emerald-500 mt-1">Cleared in the last 30 days</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-500" />
            Advanced Detection Engine
          </h3>
          <div className="flex items-center gap-3">
             <button className="text-xs font-bold text-indigo-600 hover:underline">Scan All Certificates</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-100">
              <tr>
                <th className="p-4">Certificate</th>
                <th className="p-4">Student</th>
                <th className="p-4">Detection Type</th>
                <th className="p-4">Confidence</th>
                <th className="p-4">Risk Level</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 [1, 2, 3].map(i => (
                   <tr key={i} className="animate-pulse h-16"><td colSpan={6} /></tr>
                 ))
              ) : logs.map((log) => {
                const risk = getRiskLevel(log.confidence_score || 0);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-10 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{log.event_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.certificate_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{log.student_name}</td>
                    <td className="p-4 text-xs font-bold text-slate-600">
                       {log.fraud_type?.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${log.confidence_score >= 80 ? 'bg-red-500' : log.confidence_score >= 50 ? 'bg-orange-500' : 'bg-amber-500'}`} 
                            style={{ width: `${log.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-900">{log.confidence_score}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${risk.color}`}>
                        {risk.icon}
                        {risk.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete & Ban">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ShieldAlert className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium text-lg">No fraud threats detected</p>
                      <p className="text-sm">Platform is currently clean and secure.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

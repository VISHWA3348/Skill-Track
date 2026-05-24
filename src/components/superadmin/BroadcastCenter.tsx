import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Building2, MapPin, Send, Trash2, Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastCenter() {
  const [broadcast, setBroadcast] = useState({
    title: '',
    message: '',
    targetRole: 'all',
    targetCollege: 'all',
    targetDept: 'all'
  });
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Fetch colleges and depts for filters
    const fetchData = async () => {
      try {
        const colRes = await fetch('/api/public/colleges');
        const colData = await colRes.json();
        if (colData.success) setColleges(colData.data);

        const depRes = await fetch('/api/public/departments');
        const depData = await depRes.json();
        if (depData.success) setDepartments(depData.data);
      } catch (error) {
        console.error("Failed to fetch filters");
      }
    };
    fetchData();
  }, []);

  const handleSend = async () => {
    if (!broadcast.title || !broadcast.message) {
      return toast.error("Please fill in all required fields");
    }

    setSending(true);
    try {
      const res = await fetch('/api/superadmin/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(broadcast)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        setBroadcast({ title: '', message: '', targetRole: 'all', targetCollege: 'all', targetDept: 'all' });
        // Add to local history (simulated)
        setHistory([{ ...broadcast, id: Date.now(), timestamp: new Date().toISOString() }, ...history]);
      }
    } catch (error) {
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">New Platform Broadcast</h3>
              <p className="text-sm text-slate-500">Send notifications to specific groups across the platform.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Announcement Title</label>
              <input 
                type="text" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. System Maintenance Scheduled"
                value={broadcast.title}
                onChange={(e) => setBroadcast({...broadcast, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Message Content</label>
              <textarea 
                rows={5}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Write your message here..."
                value={broadcast.message}
                onChange={(e) => setBroadcast({...broadcast, message: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Target Role
                </label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  value={broadcast.targetRole}
                  onChange={(e) => setBroadcast({...broadcast, targetRole: e.target.value})}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students Only</option>
                  <option value="staff">Staff Only</option>
                  <option value="hod">HODs Only</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Target College
                </label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  value={broadcast.targetCollege}
                  onChange={(e) => setBroadcast({...broadcast, targetCollege: e.target.value})}
                >
                  <option value="all">All Colleges</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Target Department
                </label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  value={broadcast.targetDept}
                  onChange={(e) => setBroadcast({...broadcast, targetDept: e.target.value})}
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Info className="w-3 h-3" />
                  Your broadcast will be delivered via in-app notifications.
               </div>
               <button 
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Broadcast'}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Broadcasts
          </h3>
          
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-12">
                 <p className="text-slate-400 text-sm">No recent history.</p>
              </div>
            ) : history.map(item => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 group relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                    {item.targetRole}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{item.message}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Delivered
                  </div>
                  <button className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 border-dashed">
          <div className="flex items-start gap-3">
             <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mt-1">
               <AlertCircle className="w-4 h-4" />
             </div>
             <div>
               <h4 className="font-bold text-amber-900 text-sm mb-1">Safety Guidelines</h4>
               <p className="text-xs text-amber-700 leading-relaxed">
                 Avoid sending multiple broadcasts within a short time. Use specific targeting to reduce noise for unrelated users.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleApiError, OperationType } from '../api/localApi';
import { collection, query, where, onSnapshot, orderBy, limit } from '../api/localApi';
import { AuditLog } from '../types';
import { ClipboardList, Filter, Activity, Server, Database, ShieldAlert, AlertTriangle } from 'lucide-react';

const AuditLogs: React.FC = () => {
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'health' | 'security'>('audit');
  const [securityStats, setSecurityStats] = useState({
    fraudAlerts: 0,
    rejectedCerts: 0,
    gpsMismatches: 0
  });

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600 max-w-md">
          Only Admins and Super Admins have permission to view the system audit logs.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50));

    if (!isSuperAdmin) {
      q = query(
        collection(db, 'auditLogs'), 
        where('collegeId', '==', profile.collegeId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: AuditLog[] = [];
      snapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      setLogs(fetchedLogs);
      setLoading(false);
    }, (error) => {
      handleApiError(error, OperationType.GET, 'auditLogs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, isSuperAdmin]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Audit Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'health' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>System Health</span>
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'security' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              <span>Security Overview</span>
            </button>
          )}
        </div>
        
        {activeTab === 'audit' && (
          <button 
            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        )}
      </div>

      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">API Status</p>
                <p className="text-2xl font-bold text-gray-900">Operational</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Database Load</p>
                <p className="text-2xl font-bold text-gray-900">Normal</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Security Events</p>
                <p className="text-2xl font-bold text-gray-900">0 Recent</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              Recent System Errors
            </h3>
            <div className="text-center py-8 text-gray-500">
              No recent system errors reported.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex items-center space-x-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Fraud Alerts</p>
                <p className="text-2xl font-bold text-red-600">Active</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center space-x-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Unverified GPS</p>
                <p className="text-2xl font-bold text-orange-600">Monitoring</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Auth Integrity</p>
                <p className="text-2xl font-bold text-blue-600">Secure</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <ShieldAlert className="w-5 h-5 text-red-500 mr-2" />
              Recent Security-Related Logs
            </h3>
            <div className="space-y-4">
              {logs.filter(l => l.action.toLowerCase().includes('fraud') || l.action.toLowerCase().includes('reject') || l.action.toLowerCase().includes('delete')).map((log) => (
                <div key={log.id} className="p-4 bg-red-50/30 rounded-lg border border-red-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-red-700">{log.action}</span>
                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{log.details}</p>
                  <p className="text-xs text-gray-400 mt-2">Actor: {log.userId}</p>
                </div>
              ))}
              {logs.filter(l => l.action.toLowerCase().includes('fraud') || l.action.toLowerCase().includes('reject') || l.action.toLowerCase().includes('delete')).length === 0 && (
                <div className="text-center py-8 text-gray-500">No critical security events logged recently.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;

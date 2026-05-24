import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, handleApiError, OperationType, doc, getDoc } from '../api/localApi';
import { Certificate } from '../types';
import { CheckCircle, XCircle, ShieldCheck, MapPin, MapPinOff, Calendar, Building2, User, AlertTriangle } from 'lucide-react';

const VerifyCertificate: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!certId) return;
      
      try {
        const docRef = doc(db, 'certificates', certId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Certificate;
          if (data.status === 'verified') {
            setCertificate({ id: docSnap.id, ...data });
          } else {
            setError('This certificate is not verified or does not exist.');
          }
        } else {
          setError('Certificate not found.');
        }
      } catch (error) {
        handleApiError(error, OperationType.GET, `certificates/${certId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 px-6 py-8 text-center text-white">
            <ShieldCheck className="w-20 h-20 mx-auto mb-4 text-green-100" />
            <h1 className="text-3xl font-bold tracking-tight">Verified Certificate</h1>
            <p className="mt-2 text-green-100 font-medium">This certificate has been officially verified by the institution.</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <User className="w-4 h-4" /> Student Name
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {certificate.studentName}
                    {certificate.rollNo && <span className="text-sm text-gray-400 ml-2 font-mono">({certificate.rollNo})</span>}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Event College
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{certificate.eventCollegeName}</p>
                </div>

                {certificate.eventLocation && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Event Location
                    </h3>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{certificate.eventLocation}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date of Event
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{new Date(certificate.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Event Name
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{certificate.eventName}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Certificate Type
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{certificate.type}</p>
                </div>

                {certificate.gps && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Location (GPS)
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">
                      Lat: {certificate.gps.lat.toFixed(4)}, Lng: {certificate.gps.lng.toFixed(4)}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4" /> GPS Verification
                  </h3>
                  {certificate.fraudFlag ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 ring-1 ring-red-200 shadow-sm animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" /> Flagged
                    </span>
                  ) : certificate.gpsVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-200 shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 ring-1 ring-slate-200 shadow-sm">
                      <MapPinOff className="w-3.5 h-3.5" /> Unverified
                    </span>
                  )}
                </div>
              </div>

            </div>

            <div className="mt-10 pt-8 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">Certificate ID</p>
              <p className="font-mono text-gray-900 mt-1">{certificate.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;

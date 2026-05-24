import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCheck, Activity, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit } from '../api/localApi';
import { db } from '../api/localApi';
import { motion, AnimatePresence } from 'motion/react';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ type: string; id: string; title: string; subtitle: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchLower = searchQuery.toLowerCase();
        const newResults: any[] = [];

        // Search Users
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(20)));
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.name?.toLowerCase().includes(searchLower) || data.email?.toLowerCase().includes(searchLower)) {
            newResults.push({
              type: 'user',
              id: doc.id,
              title: data.name,
              subtitle: data.email
            });
          }
        });

        // Search Certificates
        const certsSnap = await getDocs(query(collection(db, 'certificates'), limit(20)));
        certsSnap.forEach(doc => {
          const data = doc.data();
          if (data.name?.toLowerCase().includes(searchLower) || data.issuer?.toLowerCase().includes(searchLower)) {
            newResults.push({
              type: 'certificate',
              id: doc.id,
              title: data.name,
              subtitle: `Issued by ${data.issuer}`
            });
          }
        });

        // Search Activities
        const activitiesSnap = await getDocs(query(collection(db, 'careerActivities'), limit(20)));
        activitiesSnap.forEach(doc => {
          const data = doc.data();
          if (data.type?.toLowerCase().includes(searchLower) || data.organization?.toLowerCase().includes(searchLower)) {
            newResults.push({
              type: 'activity',
              id: doc.id,
              title: data.type,
              subtitle: data.organization
            });
          }
        });

        setResults(newResults.slice(0, 10)); // Limit to top 10 results
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelect = (result: any) => {
    setIsOpen(false);
    setSearchQuery('');
    
    if (result.type === 'user') {
      navigate('/users');
    } else if (result.type === 'certificate') {
      navigate('/certificates');
    } else if (result.type === 'activity') {
      navigate('/career-activities');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4 text-blue-500" />;
      case 'certificate': return <FileCheck className="w-4 h-4 text-emerald-500" />;
      case 'activity': return <Activity className="w-4 h-4 text-amber-500" />;
      default: return <Search className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline-block">Search...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-sans font-semibold text-gray-400 bg-white border border-gray-200 rounded">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200"
            >
              <div className="flex items-center px-4 py-3 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search students, certificates, activities..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {loading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}-${index}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <div className="p-2 bg-white border border-gray-100 rounded-md shadow-sm">
                          {getIcon(result.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{result.title}</div>
                          <div className="text-xs text-gray-500">{result.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-8 text-center">
                    <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

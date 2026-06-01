import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { auth, getUserProfile, onAuthStateChanged, db, getDoc, doc } from '../api/localApi';
import { UserProfile, UserRole, PERMISSIONS } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHOD: boolean;
  isStaff: boolean;
  isStudent: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isHOD: false,
  isStaff: false,
  isStudent: false,
  permissions: [],
  hasPermission: () => false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      setUser(user);
      if (user) {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        
        // Fetch custom role permissions if applicable
        if (p && !['super_admin', 'admin', 'hod', 'staff', 'student'].includes(p.role)) {
          try {
            const roleDoc = await getDoc(doc(db, 'roles', p.role));
            if (roleDoc.exists()) {
              setCustomPermissions(roleDoc.data().permissions || []);
            }
          } catch (error) {
            console.error("Error fetching custom role permissions:", error);
          }
        }
      } else {
        setProfile(null);
        setCustomPermissions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Phase 13: useMemo — permissions array only recomputed when profile/customPermissions changes
  const permissions = useMemo((): string[] => {
    if (!profile) return [];
    if (profile.role === 'super_admin') return ['*']; 
    const builtInPermissions = (PERMISSIONS as any)[profile.role] || [];
    return [...builtInPermissions, ...customPermissions];
  }, [profile, customPermissions]);

  // Phase 13: useCallback — stable reference prevents unnecessary child re-renders
  const hasPermission = useCallback((permission: string): boolean => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  }, [permissions]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'super_admin',
    isHOD: profile?.role === 'hod',
    isStaff: profile?.role === 'staff',
    isStudent: profile?.role === 'student',
    permissions,
    hasPermission,
    logout: () => auth.signOut(),
  }), [user, profile, loading, permissions, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

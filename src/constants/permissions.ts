export const ROLE_ROUTES: Record<string, string[]> = {
  super_admin: ['*'], // Full access to everything
  admin: [
    '/dashboard',
    '/dashboard/admin-dashboard',
    '/dashboard/certificates',
    '/dashboard/career-activities',
    '/dashboard/rankings',
    '/dashboard/students',
    '/dashboard/settings',
    '/dashboard/opportunities',
    '/dashboard/student',
    '/dashboard/users',
    '/dashboard/departments',
    '/dashboard/academic-records',
    '/dashboard/academic-calendar'
  ],
  hod: [
    '/dashboard',
    '/dashboard/hod-dashboard',
    '/dashboard/certificates',
    '/dashboard/career-activities',
    '/dashboard/rankings',
    '/dashboard/students',
    '/dashboard/reports',
    '/dashboard/settings',
    '/dashboard/opportunities',
    '/dashboard/student',
    '/dashboard/users',
    '/dashboard/academic-records'
  ],
  staff: [
    '/dashboard',
    '/dashboard/staff-dashboard',
    '/dashboard/certificates',
    '/dashboard/career-activities',
    '/dashboard/rankings',
    '/dashboard/students',
    '/dashboard/settings',
    '/dashboard/student',
    '/dashboard/users',
    '/dashboard/academic-records'
  ],
  student: [
    '/dashboard',
    '/dashboard/student-dashboard',
    '/dashboard/certificates',
    '/dashboard/upload-certificate',
    '/dashboard/career-activities',
    '/dashboard/add-activity',
    '/dashboard/rankings',
    '/dashboard/settings',
    '/dashboard/opportunities',
    '/dashboard/student',
    '/dashboard/resume-builder',
    '/dashboard/academic-records'
  ]
};


/**
 * Helper to check if a user has access to a specific path
 */
export const hasRouteAccess = (role: string, path: string): boolean => {
  if (!role) return false;
  const allowed = ROLE_ROUTES[role] || [];
  if (allowed.includes('*')) return true;
  
  // Exact match or sub-path match (but avoid /dashboard catch-all)
  return allowed.some(allowedPath => {
    if (path === allowedPath) return true;
    if (allowedPath !== '/dashboard' && path.startsWith(allowedPath + '/')) return true;
    return false;
  });
};

import jwt from 'jsonwebtoken';
import { db, queryDocuments, getDocument } from './db';
import { cacheService } from './redis_cache';

const JWT_SECRET = process.env.JWT_SECRET;

const getClientIp = (req: any): string => {
  let ip = req.headers['cf-connecting-ip'] || 
           req.headers['x-real-ip'] || 
           req.headers['x-forwarded-for'] || 
           req.ip || 
           req.socket?.remoteAddress || 
           '127.0.0.1';
  
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  return ip;
};

const limiterCache = new Map<string, { count: number; windowStart: number }>();

// Periodic cleanup of rate-limiter entries older than 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of limiterCache.entries()) {
    if (now - record.windowStart > 5 * 60 * 1000) {
      limiterCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const createLimiter = (limit: number, windowMs: number, errorMessage: string = 'Too many requests. Please try again later.') => {
  return (req: any, res: any, next: any) => {
    const ip = getClientIp(req);
    const key = `${ip}:${req.baseUrl || ''}${req.path}`;
    const now = Date.now();

    const record = limiterCache.get(key);
    if (record) {
      if (now - record.windowStart > windowMs) {
        limiterCache.set(key, { count: 1, windowStart: now });
      } else if (record.count >= limit) {
        return res.status(429).json({ 
          error: 'too-many-requests', 
          message: errorMessage 
        });
      } else {
        record.count++;
      }
    } else {
      limiterCache.set(key, { count: 1, windowStart: now });
    }
    next();
  };
};

export const apiRateLimiter = createLimiter(300, 60 * 1000, 'API request limit exceeded. Please slow down.');
export const authRateLimiter = createLimiter(15, 60 * 1000, 'Too many login/auth requests. Please try again after 1 minute.');

// Legacy fallback to maintain existing API imports
export const rateLimiter = authRateLimiter;

const tokenCache = new Map<string, { decoded: any; expiry: number }>();

export const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return res.status(401).json({ error: 'Unauthorized', message: 'Unauthorized' });
  }
  const token = authHeader.split("Bearer ")[1];
  
  if (!token || token === "undefined" || token === "null") {
    req.user = null;
    return res.status(401).json({ error: 'Unauthorized', message: 'Unauthorized' });
  }

  try {
    const cached = tokenCache.get(token);
    let decoded: any;
    if (cached && Date.now() < cached.expiry) {
      decoded = cached.decoded;
    } else {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      tokenCache.set(token, { decoded, expiry: Date.now() + 5000 }); // 5 seconds token verification caching
    }
    
    if (!decoded || !decoded.uid) {
      req.user = null;
      return res.status(401).json({ error: 'Invalid token', message: 'Invalid token' });
    }

    // Load and validate user database presence, role, and collegeId
    let userData = await cacheService.get(`user:${decoded.uid}`);
    if (!userData) {
      const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
      userData = stmt.get(decoded.uid) as any;
      if (userData) {
        await cacheService.set(`user:${decoded.uid}`, userData, 60); // Cache user for 60 seconds
      }
    }

    if (!userData || userData.status === 'suspended' || userData.is_active === 0) {
      req.user = null;
      return res.status(401).json({ error: 'Unauthorized', message: 'Unauthorized' });
    }

    req.user = {
      id: userData.uid,
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
      collegeId: userData.college_id || null
    };
    next();
  } catch (e) {
    req.user = null; // NEVER reuse previous user session on failure
    return res.status(401).json({ error: 'Invalid token', message: 'Invalid token' });
  }
};

/** Invalidate a specific user from cache (call after role/status updates) */
export function invalidateUserCache(uid: string): void {
  cacheService.del(`user:${uid}`).catch(() => {});
}

export const checkRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ error: "Forbidden", message: "Forbidden" });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden", message: "Forbidden" });
      }

      let userData = await cacheService.get(`user:${req.user.uid}`);
      if (!userData) {
        const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
        userData = stmt.get(req.user.uid) as any;
        if (userData) {
          await cacheService.set(`user:${req.user.uid}`, userData, 60); // Cache user for 60 seconds
        }
      }

      req.userData = userData;
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

export const checkPermission = (module: string, action: string) => {
  return async (req: any, res: any, next: any) => {
    const role = req.userData.role;
    try {
      // Super admin bypass
      if (role === 'super_admin') return next();

      const cacheKey = `perms:${role}:${module}:${action}`;
      let isAllowed = await cacheService.get<boolean>(cacheKey);
      if (isAllowed === null) {
        const perms = queryDocuments('permissions', [
          { field: 'role', operator: '==', value: role },
          { field: 'module', operator: 'in', value: [module, '*'] }
        ]);
        isAllowed = perms.some(p => p.allowed === true && (p.action === action || p.action === '*'));
        await cacheService.set(cacheKey, isAllowed, 60); // Cache permissions for 60 seconds
      }

      if (!isAllowed) {
        return res.status(403).json({ error: `Forbidden: No ${action} permission for ${module}` });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "Permission check error" });
    }
  };
};

export const getDataIsolationFilters = (collectionName: string, userData: any) => {
  const role = userData.role;
  const conditions: any[] = [];

  // Exclude soft deleted items by default for certifications and career activities
  if (['certifications', 'career_activities'].includes(collectionName)) {
    conditions.push({ field: 'is_deleted', operator: '!=', value: 1 });
  }

  // Handle users separately (active users only for non-super-admins)
  if (collectionName === 'users' && role !== 'super_admin') {
    conditions.push({ field: 'status', operator: '!=', value: 'suspended' });
  }

  if (role === 'super_admin') return conditions;

  const tablesWithCollegeId = [
    'users', 'students', 'colleges', 'departments', 'certifications', 
    'career_activities', 'audit_logs', 'student_academic_profile', 
    'department_invite_codes', 'signup_codes'
  ];
  const tablesWithDepartmentId = [
    'users', 'students', 'departments', 'certifications', 
    'career_activities', 'student_academic_profile', 
    'department_invite_codes', 'signup_codes'
  ];

  if (role === 'student') {
    if (collectionName === 'certifications' || collectionName === 'career_activities') {
      conditions.push({ field: 'user_id', operator: '==', value: userData.uid });
    } else if (collectionName === 'users') {
      conditions.push({ field: 'uid', operator: '==', value: userData.uid });
    } else if (collectionName === 'students') {
      conditions.push({ field: 'user_id', operator: '==', value: userData.uid });
    } else if ([
      'student_academic_profile', 'student_skills', 'student_goals', 
      'student_notifications', 'student_resume_data', 'student_attendance', 
      'student_performance_logs'
    ].includes(collectionName)) {
      conditions.push({ field: 'student_id', operator: '==', value: userData.uid });
    }
  }

  if (role === 'admin') {
    if (tablesWithCollegeId.includes(collectionName)) {
      conditions.push({ field: 'college_id', operator: '==', value: userData.college_id || userData.collegeId });
    }
  }

  if (role === 'staff' || role === 'hod') {
    if (tablesWithCollegeId.includes(collectionName)) {
      conditions.push({ field: 'college_id', operator: '==', value: userData.college_id || userData.collegeId });
    }
    if (tablesWithDepartmentId.includes(collectionName)) {
      conditions.push({ field: 'department_id', operator: '==', value: userData.department_id || userData.departmentId });
    }
    if (role === 'staff') {
      const assignedYear = userData.assigned_academic_year || userData.assignedAcademicYear;
      if (assignedYear && assignedYear !== 'All Years' && ['certifications', 'career_activities', 'students', 'users'].includes(collectionName)) {
        conditions.push({ field: 'academic_year', operator: '==', value: assignedYear });
      }
    }
  }

  return conditions;
};

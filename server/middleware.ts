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
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
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
export const authRateLimiter = createLimiter(
  process.env.NODE_ENV === 'production' ? 15 : 1000,
  60 * 1000,
  'Too many login/auth requests. Please try again after 1 minute.'
);

// Legacy fallback to maintain existing API imports
export const rateLimiter = authRateLimiter;

const tokenCache = new Map<string, { decoded: any; expiry: number }>();

export const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Unauthorized' });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const cached = tokenCache.get(token);
    if (cached && Date.now() < cached.expiry) {
      req.user = cached.decoded;
      return next();
    }
    
    // Explicitly verify using HS256 to block token algorithm manipulation exploits
    const decoded: any = jwt.verify(token, JWT_SECRET as string, { algorithms: ['HS256'] });
    if (!decoded || (!decoded.uid && !decoded.id)) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Unauthorized' });
    }
    
    const uid = decoded.uid || decoded.id;
    
    // Get fresh user from cache/db to construct request-scoped identity
    let userData = await cacheService.get(`user:${uid}`);
    if (!userData) {
      const stmt = db.prepare('SELECT uid, email, role, college_id, department_id, academic_year, semester, department_name, college_name, employee_id FROM users WHERE uid = ?');
      userData = stmt.get(uid) as any;
      if (userData) {
        await cacheService.set(`user:${uid}`, userData, 60); // Cache user for 60 seconds
      }
    }
    
    if (!userData) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Unauthorized' });
    }
    
    // Construct absolute request-scoped user object
    req.user = {
      id: userData.uid,
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
      collegeId: userData.college_id,
      departmentId: userData.department_id,
      academicYear: userData.academic_year,
      semester: userData.semester,
      departmentName: userData.department_name,
      collegeName: userData.college_name,
      employeeId: userData.employee_id
    };
    
    tokenCache.set(token, { decoded: req.user, expiry: Date.now() + 5000 }); // 5 seconds token verification caching
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Unauthorized' });
  }
};

/** Invalidate a specific user from cache (call after role/status updates) */
export function invalidateUserCache(uid: string): void {
  cacheService.del(`user:${uid}`).catch(() => {});
}

export const checkRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const uid = req.user.id;
    try {
      // Try cache first to avoid a DB query on every authenticated request
      let userData = await cacheService.get(`user:${uid}`);
      if (!userData) {
        const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
        userData = stmt.get(uid) as any;
        if (userData) {
          await cacheService.set(`user:${uid}`, userData, 60); // Cache user for 60 seconds
        }
      }

      if (!userData || !roles.includes(userData.role)) {
        return res.status(403).json({ error: "Forbidden" });
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
  if (role === 'admin') conditions.push({ field: 'college_id', operator: '==', value: userData.college_id });
  if (role === 'staff' || role === 'hod') {
    conditions.push({ field: 'college_id', operator: '==', value: userData.college_id });
    conditions.push({ field: 'department_id', operator: '==', value: userData.department_id });
    if (role === 'staff') {
      const assignedYear = userData.academic_year || userData.academicYear || userData.assigned_academic_year || userData.assignedAcademicYear;
      if (assignedYear && assignedYear !== 'All Years' && ['certifications', 'career_activities', 'students', 'users', 'academic_records', 'attendance_records'].includes(collectionName)) {
        conditions.push({ field: 'academic_year', operator: '==', value: assignedYear });
      }
      const staffSemester = userData.semester !== undefined && userData.semester !== null ? userData.semester : (userData.current_semester || userData.currentSemester);
      if (staffSemester !== undefined && staffSemester !== null && ['students', 'users', 'certifications', 'academic_records', 'attendance_records'].includes(collectionName)) {
        conditions.push({ field: 'semester', operator: '==', value: Number(staffSemester) });
      }
    }
  }

  if (collectionName === 'certifications' || collectionName === 'career_activities') {
    if (role === 'student') {
      conditions.push({ field: 'user_id', operator: '==', value: userData.uid });
    }
  } else if (collectionName === 'users') {
    if (role === 'student') {
       conditions.push({ field: 'uid', operator: '==', value: userData.uid });
    }
  }

  return conditions;
};

import jwt from 'jsonwebtoken';
import { db, queryDocuments, getDocument } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

const loginAttempts = new Map<string, { count: number, lastAttempt: number }>();

export const rateLimiter = (req: any, res: any, next: any) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const limit = 5000;
  const windowMs = 60 * 1000; // 1 minute

  const attempts = loginAttempts.get(ip);
  if (attempts) {
    if (now - attempts.lastAttempt > windowMs) {
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
    } else if (attempts.count >= limit) {
      return res.status(429).json({ 
        error: 'auth/too-many-requests', 
        message: 'Too many login attempts. Please try again after 1 minute.' 
      });
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
  next();
};

export const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { uid, email }
    console.log("API HIT", req.user);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const checkRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    const uid = req.user.uid;
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
      const userData = stmt.get(uid) as any;
      
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
  return (req: any, res: any, next: any) => {
    const role = req.userData.role;
    try {
      // Super admin bypass
      if (role === 'super_admin') return next();

      const perms = queryDocuments('permissions', [
        { field: 'role', operator: '==', value: role },
        { field: 'module', operator: 'in', value: [module, '*'] }
      ]);

      const isAllowed = perms.some(p => p.allowed === true && (p.action === action || p.action === '*'));

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

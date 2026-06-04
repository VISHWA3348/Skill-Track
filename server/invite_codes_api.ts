import express from 'express';
import crypto from 'crypto';
import { db } from './db';
import { authenticate, checkRole } from './middleware';

// ============================================================
// UTILITY: Cryptographically secure invite code suffix
// Format: CAMP-{DEPT}-{YEAR_CODE}-{6_RANDOM_CHARS}
// ============================================================
function generateSecureCode(deptCode: string, academicYear?: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(6);
  const suffix = Array.from(bytes)
    .map(b => alphabet[b % alphabet.length])
    .join('');
  const dept = deptCode.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
  
  if (academicYear) {
    let yr = '';
    if (academicYear.includes('I Year PG')) yr = '1YPG';
    else if (academicYear.includes('II Year PG')) yr = '2YPG';
    else if (academicYear.includes('I Year')) yr = '1Y';
    else if (academicYear.includes('II Year')) yr = '2Y';
    else if (academicYear.includes('III Year')) yr = '3Y';
    else if (academicYear.includes('IV Year')) yr = '4Y';
    else yr = academicYear.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    return `CAMP-${dept}-${yr}-${suffix}`;
  }
  return `CAMP-${dept}-${suffix}`;
}

// ============================================================
// UTILITY: Write audit log entry
// ============================================================
function writeAuditLog(
  action: string,
  details: string,
  userId: string,
  collegeId?: string,
  ip?: string
) {
  try {
    const logId = 'alog_' + Date.now() + Math.random().toString(36).substring(2, 7);
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, college_id, timestamp)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(logId, userId, action, details + (ip ? ` [IP: ${ip}]` : ''), collegeId || null);
  } catch (e) {
    console.error('Audit log write failed:', e);
  }
}

// ============================================================
// UTILITY: Get client IP
// ============================================================
function getClientIp(req: any): string {
  const raw =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
  return typeof raw === 'string' && raw.includes(',')
    ? raw.split(',')[0].trim()
    : String(raw);
}

// ============================================================
// PUBLIC: Validate Invite Code (no auth required)
// POST /api/invite-codes/validate
// Body: { code: string }
// ============================================================
export function setupInviteCodesApi(app: express.Express) {
  const router = express.Router();

  // --- PUBLIC ENDPOINT: Validate invite code ---
  app.post('/api/invite-codes/validate', async (req, res) => {
    const { code } = req.body;
    const ip = getClientIp(req);

    try {
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'code-required', message: 'Invite code is required' });
      }

      const trimmed = code.trim().toUpperCase();

      // Try new DepartmentInviteCodes table first
      const inviteCode = db.prepare(`
        SELECT d.*, c.name as college_name, dep.name as department_name
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.code = ?
      `).get(trimmed) as any;

      if (!inviteCode) {
        // Try legacy signup_codes fallback
        const legacyCode = db.prepare(`
          SELECT s.*, c.name as college_name, dep.name as department_name
          FROM signup_codes s
          LEFT JOIN colleges c ON s.college_id = c.id
          LEFT JOIN departments dep ON s.department_id = dep.id
          WHERE s.code = ? AND s.is_active = 1
        `).get(trimmed) as any;

        if (!legacyCode) {
          return res.status(404).json({
            error: 'invalid-code',
            message: 'Invalid or unrecognized invite code'
          });
        }

        // Legacy code checks
        if (legacyCode.expiry_date && new Date(legacyCode.expiry_date) < new Date()) {
          return res.status(400).json({ error: 'code-expired', message: 'This invite code has expired' });
        }
        if (legacyCode.usage_limit !== -1 && legacyCode.usage_count >= legacyCode.usage_limit) {
          return res.status(400).json({ error: 'code-limit-reached', message: 'This invite code has reached its registration limit' });
        }

        return res.json({
          success: true,
          type: 'legacy',
          data: {
            collegeId: legacyCode.college_id,
            collegeName: legacyCode.college_name || 'Unknown College',
            departmentId: legacyCode.department_id,
            departmentName: legacyCode.department_name || 'Unknown Department',
            role: legacyCode.role || 'student',
            batchYear: legacyCode.batch_year || null
          }
        });
      }

      // New invite code checks
      if (!inviteCode.is_active || inviteCode.is_active === 0) {
        return res.status(400).json({ error: 'code-inactive', message: 'This invite code has been deactivated' });
      }

      if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
        return res.status(400).json({ error: 'code-expired', message: 'This invite code has expired' });
      }

      if (
        inviteCode.max_registrations !== -1 &&
        inviteCode.current_registrations >= inviteCode.max_registrations
      ) {
        return res.status(400).json({
          error: 'code-limit-reached',
          message: 'This invite code has reached its maximum registration limit'
        });
      }

      return res.json({
        success: true,
        type: 'department',
        data: {
          collegeId: inviteCode.college_id,
          collegeName: inviteCode.college_name || 'Unknown College',
          departmentId: inviteCode.department_id,
          departmentName: inviteCode.department_name || 'Unknown Department',
          role: 'student',
          maxRegistrations: inviteCode.max_registrations,
          currentRegistrations: inviteCode.current_registrations,
          expiresAt: inviteCode.expires_at,
          academicYear: inviteCode.academic_year || null
        }
      });
    } catch (e: any) {
      console.error('Invite code validation error:', e);
      return res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // All routes below require Super Admin or College Admin authentication
  // ============================================================
  router.use(authenticate, checkRole(['super_admin', 'admin']));

  // ============================================================
  // GET /api/invite-codes/stats/summary  — Stats dashboard
  // ============================================================
  router.get('/stats/summary', (req, res) => {
    try {
      const user = (req as any).userData;
      const isCollegeAdmin = user.role === 'admin';
      const cId = user.collegeId || user.college_id;

      let totalQuery = 'SELECT COUNT(*) as count FROM department_invite_codes';
      let activeQuery = 'SELECT COUNT(*) as count FROM department_invite_codes WHERE is_active = 1';
      let inactiveQuery = 'SELECT COUNT(*) as count FROM department_invite_codes WHERE is_active = 0';
      let expiredQuery = 'SELECT COUNT(*) as count FROM department_invite_codes WHERE expires_at IS NOT NULL AND expires_at < ?';
      
      const paramsTotal: any[] = [];
      const paramsActive: any[] = [];
      const paramsInactive: any[] = [];
      const paramsExpired: any[] = [new Date().toISOString()];

      if (isCollegeAdmin) {
        totalQuery += ' WHERE college_id = ?';
        activeQuery += ' AND college_id = ?';
        inactiveQuery += ' AND college_id = ?';
        expiredQuery += ' AND college_id = ?';
        paramsTotal.push(cId);
        paramsActive.push(cId);
        paramsInactive.push(cId);
        paramsExpired.push(cId);
      }

      const total = (db.prepare(totalQuery).get(...paramsTotal) as any).count;
      const active = (db.prepare(activeQuery).get(...paramsActive) as any).count;
      const inactive = (db.prepare(inactiveQuery).get(...paramsInactive) as any).count;
      const expired = (db.prepare(expiredQuery).get(...paramsExpired) as any).count;

      // Registrations today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let regTodayQuery = `
        SELECT COUNT(*) as count FROM audit_logs
        WHERE action = 'INVITE_CODE_USED' AND timestamp >= ?
      `;
      const regTodayParams: any[] = [todayStart.toISOString()];
      if (isCollegeAdmin) {
        regTodayQuery += ' AND college_id = ?';
        regTodayParams.push(cId);
      }
      const regToday = (db.prepare(regTodayQuery).get(...regTodayParams) as any).count;

      // Registrations by department
      let byDeptQuery = `
        SELECT d.department_id, dep.name as department_name, d.current_registrations
        FROM department_invite_codes d
        LEFT JOIN departments dep ON d.department_id = dep.id
      `;
      const byDeptParams: any[] = [];
      if (isCollegeAdmin) {
        byDeptQuery += ' WHERE d.college_id = ?';
        byDeptParams.push(cId);
      }
      byDeptQuery += ' ORDER BY d.current_registrations DESC';
      const byDept = db.prepare(byDeptQuery).all(...byDeptParams);

      // Registrations by college
      let byCollegeQuery = `
        SELECT d.college_id, c.name as college_name, SUM(d.current_registrations) as total_registrations
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
      `;
      const byCollegeParams: any[] = [];
      if (isCollegeAdmin) {
        byCollegeQuery += ' WHERE d.college_id = ?';
        byCollegeParams.push(cId);
      }
      byCollegeQuery += ' GROUP BY d.college_id ORDER BY total_registrations DESC';
      const byCollege = db.prepare(byCollegeQuery).all(...byCollegeParams);

      res.json({
        success: true,
        data: {
          totalCodes: total,
          activeCodes: active,
          inactiveCodes: inactive,
          expiredCodes: expired,
          registrationsToday: regToday,
          byDepartment: byDept,
          byCollege
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // GET /api/invite-codes  — List all invite codes
  // ============================================================
  router.get('/', (req, res) => {
    try {
      const { collegeId, departmentId, active } = req.query;
      const user = (req as any).userData;
      
      let targetCollegeId = collegeId;
      if (user.role === 'admin') {
        targetCollegeId = user.collegeId || user.college_id;
      }

      let sql = `
        SELECT d.*, c.name as college_name, dep.name as department_name
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (targetCollegeId) { sql += ' AND d.college_id = ?'; params.push(targetCollegeId); }
      if (departmentId) { sql += ' AND d.department_id = ?'; params.push(departmentId); }
      if (active !== undefined) { sql += ' AND d.is_active = ?'; params.push(active === '1' || active === 'true' ? 1 : 0); }

      sql += ' ORDER BY d.created_at DESC';

      const codes = db.prepare(sql).all(...params);
      res.json({ success: true, data: codes });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // GET /api/invite-codes/:id  — Specific code + registered students
  // ============================================================
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).userData;

      const code = db.prepare(`
        SELECT d.*, c.name as college_name, dep.name as department_name
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.id = ?
      `).get(id) as any;

      if (!code) return res.status(404).json({ error: 'Invite code not found' });

      // Enforce data isolation: college admin can only see their own college's codes
      if (user.role === 'admin' && code.college_id !== (user.collegeId || user.college_id)) {
        return res.status(403).json({ error: 'Forbidden: Access to another college\'s invite codes is denied' });
      }

      // Get students who registered using this code via audit logs
      const registeredStudents = db.prepare(`
        SELECT u.uid, u.name, u.email, u.roll_no, u.created_at
        FROM audit_logs al
        JOIN users u ON al.user_id = u.uid
        WHERE al.action = 'INVITE_CODE_USED' AND al.details LIKE ?
        ORDER BY al.timestamp DESC
      `).all(`%${code.code}%`) as any[];

      res.json({
        success: true,
        data: {
          ...code,
          registeredStudents
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', (req, res) => {
    try {
      const { collegeId, departmentId, maxRegistrations, expiresAt, customCode, academicYear } = req.body;
      const adminUser = (req as any).userData;
      const ip = getClientIp(req);

      let targetCollegeId = collegeId;
      if (adminUser.role === 'admin') {
        targetCollegeId = adminUser.collegeId || adminUser.college_id;
      }

      if (!targetCollegeId || !departmentId) {
        return res.status(400).json({ error: 'collegeId and departmentId are required' });
      }

      // Validate academicYear if provided
      if (academicYear) {
        const allowedYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'I Year PG', 'II Year PG'];
        if (!allowedYears.includes(academicYear)) {
          return res.status(400).json({ error: 'Invalid academic year selection' });
        }
      }

      // Verify department belongs to the target college
      const deptRow = db.prepare('SELECT college_id, name FROM departments WHERE id = ?').get(departmentId) as any;
      if (!deptRow) {
        return res.status(404).json({ error: 'Department not found' });
      }
      if (deptRow.college_id !== targetCollegeId) {
        return res.status(403).json({ error: 'Forbidden: Department does not belong to your college' });
      }

      const deptCode = deptRow.name || departmentId;

      const finalCode = customCode
        ? String(customCode).toUpperCase().trim()
        : generateSecureCode(deptCode, academicYear);

      // Check uniqueness
      const existing = db.prepare('SELECT id FROM department_invite_codes WHERE code = ?').get(finalCode);
      if (existing) {
        return res.status(400).json({ error: 'This code already exists. Please try again.' });
      }

      const id = 'dic_' + Date.now() + Math.random().toString(36).substring(2, 7);

      db.prepare(`
        INSERT INTO department_invite_codes (
          id, code, college_id, department_id, is_active,
          max_registrations, current_registrations, expires_at, created_by, academic_year
        ) VALUES (?, ?, ?, ?, 1, ?, 0, ?, ?, ?)
      `).run(
        id,
        finalCode,
        targetCollegeId,
        departmentId,
        maxRegistrations !== undefined ? Number(maxRegistrations) : -1,
        expiresAt || null,
        adminUser?.uid || 'admin',
        academicYear || null
      );

      writeAuditLog(
        'INVITE_CODE_CREATED',
        `Created invite code ${finalCode} for dept ${departmentId} (year: ${academicYear || 'All'}) in college ${targetCollegeId}`,
        adminUser?.uid || 'admin',
        targetCollegeId,
        ip
      );

      res.json({ success: true, message: 'Invite code created successfully', id, code: finalCode });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE') || e.message?.includes('unique')) {
        return res.status(400).json({ error: 'This code already exists' });
      }
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // PATCH /api/invite-codes/:id  — Update (toggle, regenerate, limits, expiry)
  // ============================================================
  router.patch('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).userData;
      const ip = getClientIp(req);
      const { isActive, regenerate, maxRegistrations, expiresAt } = req.body;

      const existing = db.prepare('SELECT * FROM department_invite_codes WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'Invite code not found' });

      // Enforce data isolation: college admin can only edit their own college's codes
      if (adminUser.role === 'admin' && existing.college_id !== (adminUser.collegeId || adminUser.college_id)) {
        return res.status(403).json({ error: 'Forbidden: Access to another college\'s invite codes is denied' });
      }

      let newCode = existing.code;

      if (regenerate === true) {
        const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(existing.department_id) as any;
        const deptCode = dept?.name || existing.department_id;
        // Generate until we get a unique code
        let attempts = 0;
        do {
          newCode = generateSecureCode(deptCode);
          attempts++;
        } while (
          db.prepare('SELECT id FROM department_invite_codes WHERE code = ? AND id != ?').get(newCode, id) &&
          attempts < 10
        );

        writeAuditLog(
          'INVITE_CODE_REGENERATED',
          `Regenerated invite code ${existing.code} → ${newCode} for dept ${existing.department_id}`,
          adminUser?.uid || 'admin',
          existing.college_id,
          ip
        );
      }

      const finalActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;
      const finalMax = maxRegistrations !== undefined ? Number(maxRegistrations) : existing.max_registrations;
      const finalExpiry = expiresAt !== undefined ? (expiresAt || null) : existing.expires_at;

      db.prepare(`
        UPDATE department_invite_codes
        SET code = ?, is_active = ?, max_registrations = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newCode, finalActive, finalMax, finalExpiry, id);

      if (isActive !== undefined && !regenerate) {
        const actionLabel = finalActive ? 'INVITE_CODE_ENABLED' : 'INVITE_CODE_DISABLED';
        writeAuditLog(
          actionLabel,
          `${finalActive ? 'Enabled' : 'Disabled'} invite code ${existing.code}`,
          adminUser?.uid || 'admin',
          existing.college_id,
          ip
        );
      }

      res.json({
        success: true,
        message: 'Invite code updated successfully',
        code: newCode
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // DELETE /api/invite-codes/:id  — Delete an invite code
  // ============================================================
  router.delete('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).userData;
      const ip = getClientIp(req);

      const existing = db.prepare('SELECT * FROM department_invite_codes WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'Invite code not found' });

      // Enforce data isolation: college admin can only delete their own college's codes
      if (adminUser.role === 'admin' && existing.college_id !== (adminUser.collegeId || adminUser.college_id)) {
        return res.status(403).json({ error: 'Forbidden: Access to another college\'s invite codes is denied' });
      }

      db.prepare('DELETE FROM department_invite_codes WHERE id = ?').run(id);

      writeAuditLog(
        'INVITE_CODE_DELETED',
        `Deleted invite code ${existing.code} (dept: ${existing.department_id}, college: ${existing.college_id})`,
        adminUser?.uid || 'admin',
        existing.college_id,
        ip
      );

      res.json({ success: true, message: 'Invite code deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mount the router under /api/invite-codes
  app.use('/api/invite-codes', router);
}

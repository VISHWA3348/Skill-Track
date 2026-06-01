import express from 'express';
import crypto from 'crypto';
import { db } from './db';
import { authenticate, checkRole } from './middleware';

// ============================================================
// UTILITY: Cryptographically secure invite code suffix
// Format: CAMP-{DEPT}-{6_RANDOM_CHARS}
// ============================================================
function generateSecureCode(deptCode: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(6);
  const suffix = Array.from(bytes)
    .map(b => alphabet[b % alphabet.length])
    .join('');
  const dept = deptCode.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
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
          expiresAt: inviteCode.expires_at
        }
      });
    } catch (e: any) {
      console.error('Invite code validation error:', e);
      return res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // All routes below require Super Admin authentication
  // ============================================================
  router.use(authenticate, checkRole(['super_admin']));

  // ============================================================
  // GET /api/invite-codes/stats/summary  — Stats dashboard
  // ============================================================
  router.get('/stats/summary', (req, res) => {
    try {
      const total = (db.prepare('SELECT COUNT(*) as count FROM department_invite_codes').get() as any).count;
      const active = (db.prepare('SELECT COUNT(*) as count FROM department_invite_codes WHERE is_active = 1').get() as any).count;
      const inactive = (db.prepare('SELECT COUNT(*) as count FROM department_invite_codes WHERE is_active = 0').get() as any).count;

      const now = new Date().toISOString();
      const expired = (db.prepare(
        'SELECT COUNT(*) as count FROM department_invite_codes WHERE expires_at IS NOT NULL AND expires_at < ?'
      ).get(now) as any).count;

      // Registrations today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const regToday = (db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE action = 'INVITE_CODE_USED' AND timestamp >= ?
      `).get(todayStart.toISOString()) as any).count;

      // Registrations by department
      const byDept = db.prepare(`
        SELECT d.department_id, dep.name as department_name, d.current_registrations
        FROM department_invite_codes d
        LEFT JOIN departments dep ON d.department_id = dep.id
        ORDER BY d.current_registrations DESC
      `).all();

      // Registrations by college
      const byCollege = db.prepare(`
        SELECT d.college_id, c.name as college_name, SUM(d.current_registrations) as total_registrations
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        GROUP BY d.college_id
        ORDER BY total_registrations DESC
      `).all();

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
      let sql = `
        SELECT d.*, c.name as college_name, dep.name as department_name
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (collegeId) { sql += ' AND d.college_id = ?'; params.push(collegeId); }
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
      const code = db.prepare(`
        SELECT d.*, c.name as college_name, dep.name as department_name
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.id = ?
      `).get(id) as any;

      if (!code) return res.status(404).json({ error: 'Invite code not found' });

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

  // ============================================================
  // POST /api/invite-codes  — Create a new invite code
  // ============================================================
  router.post('/', (req, res) => {
    try {
      const { collegeId, departmentId, maxRegistrations, expiresAt, customCode } = req.body;
      const adminUser = (req as any).userData;
      const ip = getClientIp(req);

      if (!collegeId || !departmentId) {
        return res.status(400).json({ error: 'collegeId and departmentId are required' });
      }

      // Look up department name for the code prefix
      const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(departmentId) as any;
      const deptCode = dept?.name || departmentId;

      const finalCode = customCode
        ? String(customCode).toUpperCase().trim()
        : generateSecureCode(deptCode);

      // Check uniqueness
      const existing = db.prepare('SELECT id FROM department_invite_codes WHERE code = ?').get(finalCode);
      if (existing) {
        return res.status(400).json({ error: 'This code already exists. Please try again.' });
      }

      const id = 'dic_' + Date.now() + Math.random().toString(36).substring(2, 7);

      db.prepare(`
        INSERT INTO department_invite_codes (
          id, code, college_id, department_id, is_active,
          max_registrations, current_registrations, expires_at, created_by
        ) VALUES (?, ?, ?, ?, 1, ?, 0, ?, ?)
      `).run(
        id,
        finalCode,
        collegeId,
        departmentId,
        maxRegistrations !== undefined ? Number(maxRegistrations) : -1,
        expiresAt || null,
        adminUser?.uid || 'super_admin'
      );

      writeAuditLog(
        'INVITE_CODE_CREATED',
        `Created invite code ${finalCode} for dept ${departmentId} in college ${collegeId}`,
        adminUser?.uid || 'super_admin',
        collegeId,
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
          adminUser?.uid || 'super_admin',
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
          adminUser?.uid || 'super_admin',
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

      db.prepare('DELETE FROM department_invite_codes WHERE id = ?').run(id);

      writeAuditLog(
        'INVITE_CODE_DELETED',
        `Deleted invite code ${existing.code} (dept: ${existing.department_id}, college: ${existing.college_id})`,
        adminUser?.uid || 'super_admin',
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

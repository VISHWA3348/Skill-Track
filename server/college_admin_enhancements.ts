import express from 'express';
import crypto from 'crypto';
import { db, queryDocuments, getDocument, setDocument } from './db';
import { authenticate, checkRole, getDataIsolationFilters } from './middleware';
import bcrypt from 'bcryptjs';
import { cacheService } from './redis_cache';
import { queueService } from './queue';

/**
 * Generate a collision-safe, human-readable department invite code.
 * Format: {DEPT_CODE}-{6 uppercase alphanumeric chars}
 * e.g. CSE-X7A92K, MECH-H3Q8LM
 */
function generateDeptInviteCode(deptCode: string, academicYear?: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(6);
  const suffix = Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('');
  const prefix = String(deptCode || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
  
  if (academicYear) {
    let yr = '';
    if (academicYear.includes('I Year PG')) yr = '1YPG';
    else if (academicYear.includes('II Year PG')) yr = '2YPG';
    else if (academicYear.includes('I Year')) yr = '1Y';
    else if (academicYear.includes('II Year')) yr = '2Y';
    else if (academicYear.includes('III Year')) yr = '3Y';
    else if (academicYear.includes('IV Year')) yr = '4Y';
    else yr = academicYear.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    return `${prefix}-${yr}-${suffix}`;
  }
  return `${prefix}-${suffix}`;
}

/** Write an audit log entry (best-effort, never throws) */
function auditLog(userId: string, action: string, details: string, collegeId?: string | null) {
  try {
    const id = 'alog_' + Date.now() + crypto.randomBytes(4).toString('hex');
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, college_id, timestamp)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, userId, action, details, collegeId || null);
  } catch (_) {}
}

export function setupCollegeAdminEnhancements(app: express.Express) {

  // ============================================
  // 1. COLLEGE DASHBOARD OVERVIEW STATS
  // ============================================

  app.get("/api/admin/dashboard-stats", authenticate, checkRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      if (!collegeId && req.userData.role !== 'super_admin') {
        return res.status(400).json({ error: "College context missing" });
      }

      const cacheKey = `dashboard:${req.userData.uid}:${req.userData.role}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }

      const filters = req.userData.role === 'super_admin' ? [] : [{ field: 'college_id', operator: '==', value: collegeId }];
      const isolation = getDataIsolationFilters('users', req.userData);

      // Counts from Users table
      const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND (college_id = ? OR ? = 'super_admin')").get(collegeId, req.userData.role).count;
      const totalStaff = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'staff' AND (college_id = ? OR ? = 'super_admin')").get(collegeId, req.userData.role).count;
      const totalHODs = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'hod' AND (college_id = ? OR ? = 'super_admin')").get(collegeId, req.userData.role).count;
      const totalDepartments = db.prepare("SELECT COUNT(*) as count FROM departments WHERE (college_id = ? OR ? = 'super_admin')").get(collegeId, req.userData.role).count;
      const totalUsers = totalStudents + totalStaff + totalHODs;

      // Active users (last 30 days)
      const activeUsers = db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE last_login > datetime('now', '-30 days') 
        AND (college_id = ? OR ? = 'super_admin')
      `).get(collegeId, req.userData.role).count;

      // Certificates
      const certStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('approved', 'verified') THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM certifications 
        WHERE (college_id = ? OR ? = 'super_admin')
      `).get(collegeId, req.userData.role);

      // Activities
      const totalActivities = db.prepare("SELECT COUNT(*) as count FROM career_activities WHERE (college_id = ? OR ? = 'super_admin')").get(collegeId, req.userData.role).count;

      // Academic Stats
      const academicStats = db.prepare(`
        SELECT 
          AVG(cgpa) as avg_cgpa,
          SUM(CASE WHEN placement_readiness_score > 75 THEN 1 ELSE 0 END) as placement_ready,
          SUM(arrears) as total_arrears,
          AVG(attendance_percentage) as avg_attendance,
          SUM(internship_count) as total_internships
        FROM student_academic_profile 
        WHERE (college_id = ? OR ? = 'super_admin')
      `).get(collegeId, req.userData.role);

      const responseData = {
        totalStudents,
        totalStaff,
        totalHODs,
        totalDepartments,
        totalUsers,
        activeUsers,
        totalCertificates: certStats.total || 0,
        approvedCertificates: certStats.approved || 0,
        pendingCertificates: certStats.pending || 0,
        rejectedCertificates: certStats.rejected || 0,
        totalActivities,
        averageCollegeCGPA: academicStats.avg_cgpa ? parseFloat(academicStats.avg_cgpa.toFixed(2)) : 0,
        placementReadyStudents: academicStats.placement_ready || 0,
        studentsWithArrears: academicStats.total_arrears || 0,
        internshipParticipations: academicStats.total_internships || 0,
        attendanceAverage: academicStats.avg_attendance ? parseFloat(academicStats.avg_attendance.toFixed(2)) : 0,
        monthlyGrowth: 12.5 // Hardcoded for now as mock, can be calculated from created_at
      };

      await cacheService.set(cacheKey, responseData, 30); // Cache for 30s

      res.json({
        success: true,
        data: responseData
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 2. COLLEGE ANALYTICS DATA
  // ============================================

  app.get("/api/admin/college-analytics", authenticate, checkRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;

      const cacheKey = `analytics:${collegeId || 'super'}:${req.userData.role}:${req.userData.uid}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }
      
      // Monthly Certificate Uploads (Last 6 months)
      const monthlyCerts = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM certifications
        WHERE (college_id = ? OR ? = 'super_admin')
        GROUP BY month ORDER BY month DESC LIMIT 6
      `).all(collegeId, req.userData.role);

      // Department-wise Student Count
      const deptStudents = db.prepare(`
        SELECT d.name as department, COUNT(u.uid) as count
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.role = 'student'
        WHERE (d.college_id = ? OR ? = 'super_admin')
        GROUP BY d.id
      `).all(collegeId, req.userData.role);

      // Placement Readiness by Dept
      const deptReadiness = db.prepare(`
        SELECT d.name as department, AVG(sap.placement_readiness_score) as readiness
        FROM departments d
        LEFT JOIN student_academic_profile sap ON d.id = sap.department_id
        WHERE (d.college_id = ? OR ? = 'super_admin')
        GROUP BY d.id
      `).all(collegeId, req.userData.role);

      // Growth Trend (Users registered per month)
      const growthTrend = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM users
        WHERE (college_id = ? OR ? = 'super_admin')
        GROUP BY month ORDER BY month DESC LIMIT 6
      `).all(collegeId, req.userData.role);

      const responseData = {
        monthlyCertificates: monthlyCerts.reverse(),
        departmentStudents: deptStudents,
        departmentReadiness: deptReadiness,
        userGrowth: growthTrend.reverse()
      };

      await cacheService.set(cacheKey, responseData, 60); // Cache for 60s

      res.json({
        success: true,
        data: responseData
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 3. STUDENT MANAGEMENT (ENHANCED)
  // ============================================

  app.get("/api/admin/students", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const { department, year, section, minCgpa } = req.query;

      let query = `
        SELECT 
          u.uid, u.name, u.roll_no, u.class, u.year, u.section, u.status,
          sap.cgpa, sap.attendance_percentage as attendance,
          (SELECT COUNT(*) FROM certifications WHERE user_id = u.uid AND status = 'verified') as certificates,
          (SELECT COUNT(*) FROM career_activities WHERE user_id = u.uid AND status = 'approved') as activities,
          sap.placement_readiness_score as readiness,
          d.name as department_name
        FROM users u
        LEFT JOIN student_academic_profile sap ON u.uid = sap.student_id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = 'student' AND (u.college_id = ? OR ? = 'super_admin')
      `;

      const params: any[] = [collegeId, req.userData.role];

      if (department) {
        query += " AND u.department_id = ?";
        params.push(department);
      }
      if (year) {
        query += " AND u.year = ?";
        params.push(year);
      }
      if (section) {
        query += " AND u.section = ?";
        params.push(section);
      }
      if (minCgpa) {
        query += " AND sap.cgpa >= ?";
        params.push(minCgpa);
      }

      const students = db.prepare(query).all(...params);
      res.json({ success: true, data: students });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 4. STAFF & HOD MANAGEMENT
  // ============================================

  app.get("/api/admin/staff", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      
      const staff = db.prepare(`
        SELECT 
          u.uid, u.name, u.role, u.last_login, u.status,
          d.name as department_name,
          (SELECT COUNT(*) FROM certifications WHERE status = 'pending' AND department_id = u.department_id) as pending_reviews
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role IN ('staff', 'hod') AND (u.college_id = ? OR ? = 'super_admin')
      `).all(collegeId, req.userData.role);

      res.json({ success: true, data: staff });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 5. DEPARTMENT MANAGEMENT
  // ============================================

  // ─── GET /api/admin/departments ─────────────────────────────────────────────
  // Returns departments for the caller's college, with their active invite code.
  app.get("/api/admin/departments", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;

      const departments = db.prepare(`
        SELECT
          d.*,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'student') as student_count,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'staff') as staff_count,
          (SELECT name FROM users WHERE department_id = d.id AND role = 'hod' LIMIT 1) as hod_name,
          (SELECT AVG(cgpa) FROM student_academic_profile WHERE department_id = d.id) as avg_cgpa,
          -- Active invite code for this department
          (SELECT code FROM department_invite_codes
            WHERE department_id = d.id AND is_active = 1
            ORDER BY created_at DESC LIMIT 1) as invite_code,
          (SELECT id FROM department_invite_codes
            WHERE department_id = d.id AND is_active = 1
            ORDER BY created_at DESC LIMIT 1) as invite_code_id,
          (SELECT academic_year FROM department_invite_codes
            WHERE department_id = d.id AND is_active = 1
            ORDER BY created_at DESC LIMIT 1) as invite_code_year
        FROM departments d
        WHERE (d.college_id = ? OR ? = 'super_admin')
      `).all(collegeId, req.userData.role);

      res.json({ success: true, data: departments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── POST /api/admin/department/add ─────────────────────────────────────────
  // Creates a department and immediately auto-generates a department invite code.
  app.post("/api/admin/department/add", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const { name, department_id, academicYear } = req.body;
      if (!name) return res.status(400).json({ error: 'Department name is required' });

      const adminUser = req.userData;
      const collegeId = adminUser.collegeId || adminUser.college_id;
      if (!collegeId && adminUser.role !== 'super_admin') {
        return res.status(400).json({ error: 'College context missing — ensure your account is linked to a college' });
      }

      // Validate academicYear if provided
      if (academicYear) {
        const allowedYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'I Year PG', 'II Year PG'];
        if (!allowedYears.includes(academicYear)) {
          return res.status(400).json({ error: 'Invalid academic year selection' });
        }
      }

      const deptId   = 'dept_' + Date.now() + crypto.randomBytes(3).toString('hex');
      const deptCode = department_id || name;

      // Insert the department row
      db.prepare(`
        INSERT INTO departments (id, department_id, college_id, name)
        VALUES (?, ?, ?, ?)
      `).run(deptId, department_id || deptId, collegeId, name);

      // Auto-generate a collision-safe invite code
      let inviteCode: string;
      let attempts = 0;
      do {
        inviteCode = generateDeptInviteCode(deptCode, academicYear);
        attempts++;
      } while (
        db.prepare('SELECT id FROM department_invite_codes WHERE code = ?').get(inviteCode) &&
        attempts < 10
      );

      const inviteId = 'dic_' + Date.now() + crypto.randomBytes(3).toString('hex');
      db.prepare(`
        INSERT INTO department_invite_codes
          (id, code, college_id, department_id, is_active, max_registrations, current_registrations, created_by, academic_year)
        VALUES (?, ?, ?, ?, 1, -1, 0, ?, ?)
      `).run(inviteId, inviteCode, collegeId, deptId, adminUser.uid || 'admin', academicYear || null);

      // Audit both events
      auditLog(adminUser.uid, 'DEPARTMENT_CREATED', `Department "${name}" (${deptId}) created in college ${collegeId}`, collegeId);
      auditLog(adminUser.uid, 'INVITE_CODE_AUTO_CREATED', `Invite code ${inviteCode} auto-generated for department ${deptId}`, collegeId);

      res.json({
        success: true,
        id: deptId,
        inviteCode,
        message: `Department created. Invite code: ${inviteCode}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── POST /api/admin/department/:id/regenerate-code ──────────────────────────
  // Deactivates the current invite code and generates a fresh one.
  // Only Super Admin and College Admin can regenerate.
  app.post("/api/admin/department/:id/regenerate-code", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const { id: deptId } = req.params;
      const adminUser = req.userData;
      const collegeId = adminUser.collegeId || adminUser.college_id;
      const { academicYear } = req.body || {};

      // Verify the department exists and belongs to this admin's college
      const dept = db.prepare(`
        SELECT id, name, college_id, department_id FROM departments WHERE id = ?
      `).get(deptId) as any;

      if (!dept) return res.status(404).json({ error: 'Department not found' });
      if (adminUser.role !== 'super_admin' && dept.college_id !== collegeId) {
        return res.status(403).json({ error: 'Forbidden: This department does not belong to your college' });
      }

      // Validate academicYear if provided
      if (academicYear) {
        const allowedYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'I Year PG', 'II Year PG'];
        if (!allowedYears.includes(academicYear)) {
          return res.status(400).json({ error: 'Invalid academic year selection' });
        }
      }

      // Query the academic year of the existing active code
      const existingActive = db.prepare(`
        SELECT academic_year FROM department_invite_codes 
        WHERE department_id = ? AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      `).get(deptId) as any;
      const targetYear = academicYear !== undefined ? academicYear : (existingActive?.academic_year || null);

      // Deactivate all current active codes for this department
      db.prepare(`
        UPDATE department_invite_codes SET is_active = 0 WHERE department_id = ? AND is_active = 1
      `).run(deptId);

      // Generate a new collision-safe invite code
      const deptCode = dept.department_id || dept.name;
      let newCode: string;
      let attempts = 0;
      do {
        newCode = generateDeptInviteCode(deptCode, targetYear);
        attempts++;
      } while (
        db.prepare('SELECT id FROM department_invite_codes WHERE code = ?').get(newCode) &&
        attempts < 10
      );

      const newInviteId = 'dic_' + Date.now() + crypto.randomBytes(3).toString('hex');
      db.prepare(`
        INSERT INTO department_invite_codes
          (id, code, college_id, department_id, is_active, max_registrations, current_registrations, created_by, academic_year)
        VALUES (?, ?, ?, ?, 1, -1, 0, ?, ?)
      `).run(newInviteId, newCode, dept.college_id, deptId, adminUser.uid || 'admin', targetYear);

      auditLog(adminUser.uid, 'INVITE_CODE_REGENERATED', `Invite code regenerated → ${newCode} for dept ${deptId}`, dept.college_id);

      res.json({ success: true, inviteCode: newCode, message: `Invite code regenerated: ${newCode}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 6. BROADCAST SYSTEM
  // ============================================

  app.post("/api/admin/broadcast/send", authenticate, checkRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { title, message, target_role, target_department, target_year } = req.body;
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const adminId = req.userData.uid;
      const id = 'ann_' + Date.now();

      db.prepare(`
        INSERT INTO college_announcements (id, college_id, admin_id, title, message, target_role, target_department, target_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, collegeId, adminId, title, message, target_role || 'all', target_department || null, target_year || null);

      // Enqueue the notification broadcast to background job
      await queueService.addJob('send-broadcast-notification', {
        title,
        message,
        targetRole: target_role,
        targetCollege: collegeId,
        targetDept: target_department,
        targetYear: target_year
      });

      res.json({ success: true, id, message: 'Broadcast initiated in background' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 7. REPORTS SYSTEM
  // ============================================

  app.get("/api/admin/reports", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const reports = db.prepare("SELECT * FROM college_reports WHERE (college_id = ? OR ? = 'super_admin') ORDER BY created_at DESC").all(collegeId, req.userData.role);
      res.json({ success: true, data: reports });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 8. WEAK STUDENT MONITORING
  // ============================================

  app.get("/api/admin/weak-students", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      
      const weakStudents = db.prepare(`
        SELECT 
          u.uid, u.name, u.roll_no, d.name as department,
          sap.cgpa, sap.attendance_percentage, sap.arrears,
          CASE 
            WHEN sap.cgpa < 6.0 THEN 'Low CGPA'
            WHEN sap.attendance_percentage < 75 THEN 'Attendance Shortage'
            WHEN sap.arrears > 2 THEN 'Multiple Arrears'
            ELSE 'At Risk'
          END as risk_reason
        FROM users u
        JOIN student_academic_profile sap ON u.uid = sap.student_id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = 'student' 
        AND (u.college_id = ? OR ? = 'super_admin')
        AND (sap.cgpa < 6.5 OR sap.attendance_percentage < 75 OR sap.arrears > 0)
      `).all(collegeId, req.userData.role);

      res.json({ success: true, data: weakStudents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 9. CERTIFICATION MANAGEMENT
  // ============================================

  app.get("/api/admin/certifications", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      
      const certs = db.prepare(`
        SELECT 
          c.*,
          u.name as student_name,
          u.roll_no as student_roll_no,
          d.name as department_name
        FROM certifications c
        LEFT JOIN users u ON c.user_id = u.uid
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE (c.college_id = ? OR ? = 'super_admin')
        ORDER BY c.created_at DESC
      `).all(collegeId, req.userData.role);

      res.json({ success: true, data: certs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}

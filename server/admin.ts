import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, getCollection, setDocument, deleteDocument, queryDocuments, getDocument } from './db';
import { authenticate, checkRole, getDataIsolationFilters } from './middleware';
import { cacheService } from './redis_cache';
import { calculateResumeScore } from './resume_features';

const JWT_SECRET = process.env.JWT_SECRET;

function getStatsCacheKey(userData: any): string {
  return `stats:${userData.role}:${userData.college_id || ''}:${userData.department_id || ''}:${userData.uid || ''}`;
}

export function invalidateStatsCache(): void {
  cacheService.clearPattern('stats:*').catch(() => { });
}

export function setupAdmin(app: express.Express) {

  // Auth Middleware for Admin
  // Auth Middleware for Admin (Removed internalized versions, now using imports)

  // Seed generic roles safely
  const seedDatabase = async () => {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const superAdminPass = process.env.SEED_SUPERADMIN_PASSWORD || (isProduction ? '' : 'SuperAdmin@123');
      const zinoinPass = process.env.SEED_ZINOIN_PASSWORD || (isProduction ? '' : 'Vishwa@8105');

      // Seed super admin
      const superAdmins = queryDocuments('users', [{ field: 'role', operator: '==', value: 'super_admin' }]);
      if (superAdmins.length === 0) {
        if (!superAdminPass) {
          console.warn("⚠️ [SECURITY] SEED_SUPERADMIN_PASSWORD is not set. Skipping superadmin@certtrack.com database seeding in production.");
        } else {
          const hashedPassword = await bcrypt.hash(superAdminPass, 10);
          setDocument('users', 'user_super_admin_seed', {
            uid: 'user_super_admin_seed',
            email: 'superadmin@certtrack.com',
            passwordHash: hashedPassword,
            role: 'super_admin',
            name: 'Super Admin',
            displayName: 'Super Admin',
            status: 'active',
            isActive: true,
            createdAt: new Date().toISOString()
          });
          console.log("Super admin seeded: superadmin@certtrack.com");
        }
      }

      // Seed zinointech@gmail.com as super admin
      const zinoinUser = queryDocuments('users', [{ field: 'email', operator: '==', value: 'zinointech@gmail.com' }]);
      if (zinoinUser.length === 0) {
        if (!zinoinPass) {
          console.warn("⚠️ [SECURITY] SEED_ZINOIN_PASSWORD is not set. Skipping zinointech@gmail.com database seeding in production.");
        } else {
          const hashedPassword = await bcrypt.hash(zinoinPass, 10);
          setDocument('users', 'user_zinoin_super_admin', {
            uid: 'user_zinoin_super_admin',
            email: 'zinointech@gmail.com',
            passwordHash: hashedPassword,
            role: 'super_admin',
            name: 'Skill Track Super Admin',
            displayName: 'Skill Track Super Admin',
            status: 'active',
            isActive: true,
            createdAt: new Date().toISOString()
          });
          console.log("Super admin seeded: zinointech@gmail.com");
        }
      }
    } catch (e) {
      console.error("Error seeding:", e);
    }
  };

  seedDatabase();



  app.get("/api/admin/backup", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const collections = ["colleges", "departments", "users", "certifications", "career_activities", "audit_logs", "notifications", "settings", "permissions"];
      const backupData: any = {};

      for (const colName of collections) {
        backupData[colName] = getCollection(colName);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date().toISOString()}.json`);
      res.send(JSON.stringify(backupData, null, 2));

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Database Backup',
        details: 'Full system backup generated',
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Backup failed", error);
      res.status(500).json({ error: "Backup failed" });
    }
  });

  app.post("/api/admin/restore", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const { backupData } = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ error: "Invalid backup data" });
      }

      const collections = ["colleges", "departments", "users", "certifications", "career_activities", "audit_logs", "notifications", "settings", "permissions"];

      for (const colName of collections) {
        const data = backupData[colName];
        if (data && Array.isArray(data)) {
          for (const item of data) {
            const id = item.uid || item.id || item.docId;
            if (id) {
              setDocument(colName, id, item);
            }
          }
        }
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Database Restore',
        details: 'Full system restore performed from backup',
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Database restored successfully" });
    } catch (error: any) {
      console.error("Restore failed", error);
      res.status(500).json({ error: "Restore failed: " + error.message });
    }
  });

  app.get("/api/admin/certifications", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const certs = queryDocuments('certifications', getDataIsolationFilters('certifications', req.userData));
      res.json({ success: true, data: certs.filter((c: any) => !c.is_deleted) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch certifications" });
    }
  });

  app.delete("/api/admin/reset-demo", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const allUsers = getCollection('users');
      for (const u of allUsers) {
        if (u.role !== 'super_admin') {
          deleteDocument('users', u.uid);
        }
      }

      const tablesToClear = ["certifications", "career_activities", "notifications", "audit_logs"];
      for (const table of tablesToClear) {
        const items = getCollection(table);
        for (const item of items) {
          deleteDocument(table, item.id || item.uid);
        }
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Reset Demo Data',
        details: 'Deleted all test users and their data',
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Demo data reset successfully" });
    } catch (error: any) {
      console.error("Reset failed", error);
      res.status(500).json({ error: "Reset failed: " + error.message });
    }
  });

  app.get("/api/admin/users", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const users = queryDocuments('users', getDataIsolationFilters('users', req.userData));
      res.json({ success: true, data: users });
    } catch (error) {
      console.error("Failed to fetch users", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", authenticate, checkRole(["super_admin", "admin", "hod", "staff", "student"]), async (req: any, res) => {
    try {
      const cacheKey = getStatsCacheKey(req.userData);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }

      const callerRole = req.userData.role;
      const collegeId = req.userData.college_id || null;
      const deptId = req.userData.department_id || null;
      const callerUid = req.userData.uid;

      // ── Build WHERE clauses for scope isolation ──────────────────────────
      const buildWhere = (table: string): { clause: string; params: any[] } => {
        const parts: string[] = [];
        const params: any[] = [];
        if (callerRole === 'admin') {
          parts.push(`${table}.college_id = $${params.length + 1}`); params.push(collegeId);
        } else if (callerRole === 'hod' || callerRole === 'staff') {
          parts.push(`${table}.college_id = $${params.length + 1}`); params.push(collegeId);
          parts.push(`${table}.department_id = $${params.length + 1}`); params.push(deptId);
        } else if (callerRole === 'student') {
          // student only sees own data for certs/activities
          if (table === 'certifications' || table === 'career_activities') {
            parts.push(`${table}.user_id = $${params.length + 1}`); params.push(callerUid);
          }
        }
        return {
          clause: parts.length > 0 ? 'AND ' + parts.join(' AND ') : '',
          params
        };
      };

      // ── Phase 2: SQL COUNT aggregations (replaces JS in-memory filtering) ─
      // Users
      const userScope = buildWhere('u');
      const userCountsSql = `
        SELECT
          COUNT(*) FILTER (WHERE u.role = 'student') as total_students,
          COUNT(*) FILTER (WHERE u.role = 'admin')   as total_admins,
          COUNT(*) FILTER (WHERE u.role = 'hod')     as total_hods,
          COUNT(*) FILTER (WHERE u.role = 'staff')   as total_staff,
          COUNT(*)                                   as total_users
        FROM users u
        WHERE 1=1 ${userScope.clause}
      `;
      const userCounts = db.prepare(userCountsSql).get(...userScope.params) as any;

      // Certs
      const certScope = buildWhere('c');
      const certCountsSql = `
        SELECT
          COUNT(*) FILTER (WHERE c.is_deleted IS NOT TRUE) as total_certs,
          COUNT(*) FILTER (WHERE c.status = 'pending' AND c.is_deleted IS NOT TRUE) as pending_certs,
          COUNT(*) FILTER (WHERE c.status = 'staff_approved' AND c.is_deleted IS NOT TRUE) as staff_approved_certs,
          COUNT(*) FILTER (WHERE c.status IN ('approved','verified') AND c.is_deleted IS NOT TRUE) as approved_certs,
          COUNT(*) FILTER (WHERE c.status = 'rejected' AND c.is_deleted IS NOT TRUE) as rejected_certs,
          COUNT(*) FILTER (WHERE (c.fraud_flag = true OR c.fraud_flag = 1) AND c.is_deleted IS NOT TRUE) as fraud_certs,
          COUNT(*) FILTER (WHERE (c.gps_verified = true OR c.gps_verified = 1) AND c.is_deleted IS NOT TRUE) as gps_certs
        FROM certifications c
        WHERE 1=1 ${certScope.clause}
      `;
      const certCounts = db.prepare(certCountsSql).get(...certScope.params) as any;

      // Career activities
      const careerScope = buildWhere('ca');
      const careerCountsSql = `
        SELECT
          COUNT(*) FILTER (WHERE ca.is_deleted IS NOT TRUE) as total_activities,
          COUNT(*) FILTER (WHERE ca.status = 'pending' AND ca.is_deleted IS NOT TRUE) as pending_activities,
          COUNT(*) FILTER (WHERE ca.status = 'approved' AND ca.is_deleted IS NOT TRUE) as approved_activities
        FROM career_activities ca
        WHERE 1=1 ${careerScope.clause}
      `;
      const careerCounts = db.prepare(careerCountsSql).get(...careerScope.params) as any;

      // Colleges count
      const collegesCount = (db.prepare('SELECT COUNT(*) as cnt FROM colleges').get() as any)?.cnt || 0;

      // ── Top Performers (SQL-ranked) ────────────────────────────────────────
      const tpWhere = callerRole === 'admin' ? `AND u.college_id = '${collegeId}'`
        : (callerRole === 'hod' || callerRole === 'staff') ? `AND u.college_id = '${collegeId}' AND u.department_id = '${deptId}'`
          : '';
      const topPerformersRows = db.prepare(`
        SELECT
          u.uid,
          u.name,
          u.roll_no as rollNo,
          COALESCE(cert_counts.cnt, 0) as certsCount,
          COALESCE(career_counts.cnt, 0) as activitiesCount,
          (COALESCE(cert_counts.cnt, 0) * 10 + COALESCE(career_counts.cnt, 0) * 5) as score
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as cnt FROM certifications
          WHERE status IN ('verified','approved') AND (is_deleted IS NOT TRUE)
          GROUP BY user_id
        ) cert_counts ON cert_counts.user_id = u.uid
        LEFT JOIN (
          SELECT user_id, COUNT(*) as cnt FROM career_activities
          WHERE status = 'approved' AND (is_deleted IS NOT TRUE)
          GROUP BY user_id
        ) career_counts ON career_counts.user_id = u.uid
        WHERE u.role = 'student' ${tpWhere}
        ORDER BY score DESC
        LIMIT 10
      `).all() as any[];
      const topPerformers = topPerformersRows;

      // Student rank (only for student role)
      let studentRank = null;
      let studentScore = null;
      if (callerRole === 'student') {
        const rankRows = db.prepare(`
          SELECT uid,
            (COALESCE(cert_counts.cnt,0)*10 + COALESCE(career_counts.cnt,0)*5) as score
          FROM users u
          LEFT JOIN (
            SELECT user_id, COUNT(*) as cnt FROM certifications
            WHERE status IN ('verified','approved') AND (is_deleted IS NOT TRUE) GROUP BY user_id
          ) cert_counts ON cert_counts.user_id = u.uid
          LEFT JOIN (
            SELECT user_id, COUNT(*) as cnt FROM career_activities
            WHERE status='approved' AND (is_deleted IS NOT TRUE) GROUP BY user_id
          ) career_counts ON career_counts.user_id = u.uid
          WHERE u.role = 'student'
          ORDER BY score DESC
        `).all() as any[];
        const idx = rankRows.findIndex((r: any) => r.uid === callerUid);
        if (idx !== -1) {
          studentRank = idx + 1;
          studentScore = rankRows[idx].score;
        }
      }

      // ── Monthly Growth (SQL GROUP BY) ────────────────────────────────────
      const monthlyGrowthRows = db.prepare(`
        SELECT
          TO_CHAR(created_at, 'Mon') as month,
          EXTRACT(MONTH FROM created_at) as month_num,
          COUNT(*) FILTER (WHERE role = 'student') as students
        FROM users u
        WHERE 1=1 ${userScope.clause.replace(/u\./g, '')}
        GROUP BY month, month_num
        ORDER BY month_num
      `).all(...userScope.params) as any[];

      const certMonthlyRows = db.prepare(`
        SELECT TO_CHAR(created_at, 'Mon') as month, EXTRACT(MONTH FROM created_at) as month_num, COUNT(*) as certs
        FROM certifications c
        WHERE is_deleted IS NOT TRUE ${certScope.clause.replace(/c\./g, '')}
        GROUP BY month, month_num ORDER BY month_num
      `).all(...certScope.params) as any[];

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyGrowth = months.map((m, i) => {
        const sg = monthlyGrowthRows.find((r: any) => parseInt(r.month_num) === i + 1);
        const cg = certMonthlyRows.find((r: any) => parseInt(r.month_num) === i + 1);
        return { name: m, students: sg ? Number(sg.students) : 0, certs: cg ? Number(cg.certs) : 0 };
      });

      // ── Dept Achievements (SQL GROUP BY) ─────────────────────────────────
      const deptAchievementsRows = db.prepare(`
        SELECT
          c.department_id as name,
          COUNT(*) FILTER (WHERE c.status IN ('verified','approved')) as certs,
          0 as activities
        FROM certifications c
        WHERE c.is_deleted IS NOT TRUE ${certScope.clause}
        GROUP BY c.department_id
      `).all(...certScope.params) as any[];
      const deptAchievements = deptAchievementsRows.map((r: any) => ({
        name: r.name, certs: Number(r.certs), activities: Number(r.activities)
      }));

      // ── Activity Distribution (SQL GROUP BY) ─────────────────────────────
      const actDistRows = db.prepare(`
        SELECT type as name, COUNT(*) as value
        FROM career_activities ca
        WHERE ca.is_deleted IS NOT TRUE AND type IS NOT NULL ${careerScope.clause}
        GROUP BY type
      `).all(...careerScope.params) as any[];
      const activityDistribution = actDistRows.map((r: any) => ({ name: r.name, value: Number(r.value) }));

      // ── Recent Audit Logs ─────────────────────────────────────────────────
      const logScope = buildWhere('al');
      const recentLogs = db.prepare(`
        SELECT * FROM audit_logs al
        WHERE 1=1 ${logScope.clause}
        ORDER BY timestamp DESC LIMIT 10
      `).all(...logScope.params) as any[];

      // ── Recent Pending Lists ──────────────────────────────────────────────
      const pendingCertificatesList = db.prepare(`
        SELECT * FROM certifications c
        WHERE c.status = 'pending' AND c.is_deleted IS NOT TRUE ${certScope.clause}
        ORDER BY created_at DESC LIMIT 5
      `).all(...certScope.params) as any[];

      const pendingActivitiesList = db.prepare(`
        SELECT * FROM career_activities ca
        WHERE ca.status = 'pending' AND ca.is_deleted IS NOT TRUE ${careerScope.clause}
        ORDER BY created_at DESC LIMIT 5
      `).all(...careerScope.params) as any[];

      const recentStudents = db.prepare(`
        SELECT * FROM users u
        WHERE u.role = 'student' ${userScope.clause}
        ORDER BY created_at DESC LIMIT 5
      `).all(...userScope.params) as any[];

      // ── Email Health Calculations ───────────────────────────
      let emailHealth = {
        resendStatus: "Not Configured",
        growSmtpStatus: "Not Configured",
        googleSmtpStatus: "Not Configured",
        sentToday: 0,
        failedToday: 0,
        activeProvider: "None"
      };

      try {
        const resendConfigured = !!process.env.RESEND_API_KEY;
        const growConfigured = !!(process.env.GROW_SMTP_USER || process.env.BREVO_SMTP_USER);
        const googleConfigured = !!(process.env.GOOGLE_SMTP_USER || process.env.GMAIL_SMTP_USER);

        // Fetch counts from email_logs
        const sentRes = db.prepare(`
          SELECT COUNT(*) as cnt FROM email_logs 
          WHERE status = 'success' 
          AND sent_at >= CURRENT_DATE
        `).get() as any;
        const failedRes = db.prepare(`
          SELECT COUNT(*) as cnt FROM email_logs 
          WHERE status = 'failed' 
          AND sent_at >= CURRENT_DATE
        `).get() as any;

        // Check recent errors in last 1 hour
        const resendRecentError = (db.prepare(`
          SELECT COUNT(*) as cnt FROM email_logs 
          WHERE provider_used = 'Resend' AND status = 'failed' AND sent_at >= NOW() - INTERVAL '1 hour'
        `).get() as any)?.cnt > 0;

        const growRecentError = (db.prepare(`
          SELECT COUNT(*) as cnt FROM email_logs 
          WHERE provider_used = 'Grow SMTP' AND status = 'failed' AND sent_at >= NOW() - INTERVAL '1 hour'
        `).get() as any)?.cnt > 0;

        const googleRecentError = (db.prepare(`
          SELECT COUNT(*) as cnt FROM email_logs 
          WHERE provider_used = 'Google SMTP' AND status = 'failed' AND sent_at >= NOW() - INTERVAL '1 hour'
        `).get() as any)?.cnt > 0;

        emailHealth.sentToday = sentRes ? parseInt(sentRes.cnt, 10) : 0;
        emailHealth.failedToday = failedRes ? parseInt(failedRes.cnt, 10) : 0;

        emailHealth.resendStatus = !resendConfigured ? "Not Configured" : (resendRecentError ? "Error" : "Operational");
        emailHealth.growSmtpStatus = !growConfigured ? "Not Configured" : (growRecentError ? "Error" : "Operational");
        emailHealth.googleSmtpStatus = !googleConfigured ? "Not Configured" : (googleRecentError ? "Error" : "Operational");

        if (emailHealth.resendStatus === "Operational") emailHealth.activeProvider = "Resend (Primary)";
        else if (emailHealth.growSmtpStatus === "Operational") emailHealth.activeProvider = "Grow SMTP (Secondary)";
        else if (emailHealth.googleSmtpStatus === "Operational") emailHealth.activeProvider = "Google SMTP (Tertiary)";
      } catch (err) {
        // Table may not exist yet, fallback silently
      }

      // ── Assemble response ─────────────────────────────────────────────────
      const data = {
        totalUsers: Number(userCounts?.total_users || 0),
        totalStudents: Number(userCounts?.total_students || 0),
        totalAdmins: Number(userCounts?.total_admins || 0),
        totalHODs: Number(userCounts?.total_hods || 0),
        totalStaff: Number(userCounts?.total_staff || 0),
        totalCertificates: Number(certCounts?.total_certs || 0),
        pendingCertificates: Number(certCounts?.pending_certs || 0),
        staffApprovedCertificates: Number(certCounts?.staff_approved_certs || 0),
        approvedCertificates: Number(certCounts?.approved_certs || 0),
        rejectedCertificates: Number(certCounts?.rejected_certs || 0),
        totalColleges: Number(collegesCount),
        totalCareerActivities: Number(careerCounts?.total_activities || 0),
        pendingCareerActivities: Number(careerCounts?.pending_activities || 0),
        approvedCareerActivities: Number(careerCounts?.approved_activities || 0),
        fraudulentCertificates: Number(certCounts?.fraud_certs || 0),
        gpsVerifiedCertificates: Number(certCounts?.gps_certs || 0),
        topPerformers,
        studentRank,
        studentScore,
        monthlyGrowth,
        deptAchievements,
        activityDistribution,
        recentLogs,
        pendingCertificatesList,
        pendingActivitiesList,
        recentStudents,
        systemHealth: "Operational",
        emailHealth,
        timestamp: new Date().toISOString()
      };

      // Store in cache (30 seconds TTL)
      await cacheService.set(cacheKey, data, 30);

      res.json({ success: true, data });
    } catch (error) {
      console.error("Failed to fetch stats", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Consolidated dashboard overview endpoint aliasing stats
  app.get("/api/dashboard/overview", authenticate, checkRole(["super_admin", "admin", "hod", "staff", "student"]), async (req: any, res) => {
    // Rewrites url internally to stats to run the exact same consolidated cached SQL query logic
    req.url = "/api/admin/stats";
    (app as any)._router.handle(req, res);
  });

  app.delete("/api/admin/users/:uid", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const { uid } = req.params;
      const us = queryDocuments('users', [{ field: 'uid', operator: '==', value: uid }]);
      if (us.length === 0) return res.status(404).json({ error: "User not found" });

      const userData = us[0];
      if (userData.role === 'super_admin') return res.status(403).json({ error: "Cannot delete super admin" });

      // Role hierarchy enforcement
      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorWeight = roleWeights[req.userData.role] || 0;
      const targetWeight = roleWeights[userData.role] || 0;

      if (uid === req.userData.uid) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      if (creatorWeight <= targetWeight && req.userData.role !== 'super_admin') {
        return res.status(403).json({ error: "Insufficient permissions to delete this user level" });
      }

      if (req.userData.role !== 'super_admin' && userData.collegeId !== req.userData.collegeId) {
        return res.status(403).json({ error: "Forbidden: College mismatch" });
      }

      if (['hod', 'staff'].includes(req.userData.role) && userData.departmentId !== req.userData.departmentId) {
        return res.status(403).json({ error: "Forbidden: Department mismatch" });
      }

      deleteDocument('users', uid);

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'User Deleted',
        details: `Deleted user ${userData.email} (${uid})`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.delete("/api/certifications/:id", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const { id } = req.params;
      const cert = getDocument('certifications', id);
      if (!cert) return res.status(404).json({ error: "Certificate not found" });

      // soft delete
      setDocument('certifications', id, { ...cert, is_deleted: true });

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'DELETE_CERTIFICATE',
        details: `Deleted certificate ${id}`,
        userId: req.userData.uid,
        certificate_id: id,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, message: "Certificate safely deleted" });
    } catch (error: any) {
      console.error("Certificate delete error:", error);
      res.status(500).json({ error: "Failed to delete certificate" });
    }
  });

  app.post("/api/admin/users/bulk", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), async (req: any, res) => {
    try {
      const { users: usersToImport } = req.body;
      if (!Array.isArray(usersToImport)) throw new Error("Invalid request: users must be an array");

      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorWeight = roleWeights[req.userData.role] || 0;

      const results = [];
      for (const u of usersToImport) {
        try {
          const targetWeight = roleWeights[u.role || 'student'] || 0;
          if (req.userData.role !== 'super_admin' && creatorWeight <= targetWeight) {
            throw new Error(`Insufficient permissions to create user with role: ${u.role}`);
          }

          const existing = queryDocuments('users', [{ field: 'email', operator: '==', value: u.email }]);
          if (existing.length > 0) throw new Error("Email already in use");

          // Academic Year selection validation and legacy mapping
          let finalYear = u.year || null;
          let finalAcademicYear = u.academicYear || u.academic_year || null;
          let finalAssignedAcademicYear = u.assignedAcademicYear || u.assigned_academic_year || null;

          const isStudent = (u.role || 'student') === 'student';
          const isStaff = u.role === 'staff';

          if (isStudent) {
            if (!finalAcademicYear) {
              throw new Error("Academic Year is required for student");
            }
            const isPG = u.class ? /^(M\.|M[A-Z]|PG|Master)/i.test(u.class) : false;
            const validUGYears = ['I Year', 'II Year', 'III Year', 'IV Year'];
            const validPGYears = ['I Year PG', 'II Year PG'];
            
            if (isPG) {
              if (!validPGYears.includes(finalAcademicYear)) {
                throw new Error(`Invalid Academic Year for PG course. Must be: ${validPGYears.join(', ')}`);
              }
            } else {
              if (!validUGYears.includes(finalAcademicYear)) {
                throw new Error(`Invalid Academic Year for UG course. Must be: ${validUGYears.join(', ')}`);
              }
            }
            // Map legacy year
            if (finalAcademicYear.startsWith('I Year')) finalYear = 'I';
            else if (finalAcademicYear.startsWith('II Year')) finalYear = 'II';
            else if (finalAcademicYear.startsWith('III Year')) finalYear = 'III';
            else if (finalAcademicYear.startsWith('IV Year')) finalYear = 'IV';
          }

          if (isStaff) {
            if (!finalAssignedAcademicYear) {
              finalAssignedAcademicYear = 'All Years';
            }
            const validStaffYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'All Years'];
            if (!validStaffYears.includes(finalAssignedAcademicYear)) {
              throw new Error(`Invalid Assigned Year for Staff. Must be one of: ${validStaffYears.join(', ')}`);
            }
          }

          const uid = 'user_' + Date.now() + Math.random().toString(36).substring(2, 9);
          const password = u.password || Math.random().toString(36).substring(2, 10);
          const passwordHash = await bcrypt.hash(password, 10);

          const collegeId = req.userData.role === 'super_admin' ? (u.collegeId || req.userData.collegeId) : req.userData.collegeId;
          const departmentId = req.userData.role === 'super_admin' ? (u.departmentId || null) : (['hod', 'staff'].includes(req.userData.role) ? req.userData.departmentId : (u.departmentId || null));

          const profile = {
            uid,
            name: u.name,
            email: u.email,
            role: u.role || 'student',
            collegeId,
            departmentId,
            rollNo: u.rollNo || null,
            class: u.class || null,
            year: finalYear,
            status: 'active',
            isActive: true,
            createdAt: new Date().toISOString(),
            passwordHash,
            academicYear: finalAcademicYear,
            assignedAcademicYear: finalAssignedAcademicYear
          };

          setDocument('users', uid, profile);

          if (profile.role === 'student') {
            db.prepare(`
              INSERT INTO students (user_id, roll_no, department_id, college_id, class, year, section, academic_year)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                roll_no=excluded.roll_no, department_id=excluded.department_id, college_id=excluded.college_id,
                class=excluded.class, year=excluded.year, section=excluded.section, academic_year=excluded.academic_year
            `).run(
              uid, profile.rollNo, departmentId, collegeId, 
              profile.class, profile.year, u.section || null, profile.academicYear
            );
            calculateResumeScore(uid);
          }

          results.push({ email: u.email, status: 'success', uid });
        } catch (err: any) {
          results.push({ email: u.email, status: 'error', error: err.message });
        }
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Bulk User Import',
        details: `Imported ${results.filter(r => r.status === 'success').length} users`,
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), async (req: any, res) => {
    try {
      let {
        email, password, name, role, collegeId, departmentId,
        rollNo, class: className, year, section, phone, phoneNumber,
        academicYear, assignedAcademicYear
      } = req.body;

      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorRole = req.userData.role;
      const targetWeight = roleWeights[role] || 0;

      // Permission Check
      let isAllowed = false;
      if (creatorRole === 'super_admin') isAllowed = true;
      else if (creatorRole === 'admin') isAllowed = ['admin', 'hod', 'staff', 'student'].includes(role);
      else if (creatorRole === 'hod') isAllowed = ['staff', 'student'].includes(role);
      else if (creatorRole === 'staff') isAllowed = ['staff', 'student'].includes(role);

      if (!isAllowed) {
        return res.status(403).json({ error: 'Insufficient permissions to create this user level' });
      }

      if (creatorRole !== 'super_admin') {
        // Force inherit data from creator
        collegeId = req.userData.collegeId;
        if (['hod', 'staff'].includes(creatorRole)) {
          departmentId = req.userData.departmentId;
        }
      }

      const existing = queryDocuments('users', [{ field: 'email', operator: '==', value: email }]);
      if (existing.length > 0) return res.status(400).json({ error: 'Email already in use' });

      // Academic Year selection validation and legacy mapping
      let mappedLegacyYear = year || null;
      let finalAcademicYear = academicYear || null;
      let finalAssignedAcademicYear = assignedAcademicYear || null;

      const isStudent = role === 'student';
      const isStaff = role === 'staff';

      if (isStudent) {
        if (!finalAcademicYear) {
          return res.status(400).json({ error: 'academic-year-required', message: 'Academic Year is required for students' });
        }
        const isPG = className ? /^(M\.|M[A-Z]|PG|Master)/i.test(className) : false;
        const validUGYears = ['I Year', 'II Year', 'III Year', 'IV Year'];
        const validPGYears = ['I Year PG', 'II Year PG'];
        
        if (isPG) {
          if (!validPGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'invalid-academic-year', 
              message: `For PG courses, Academic Year must be one of: ${validPGYears.join(', ')}` 
            });
          }
        } else {
          if (!validUGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'invalid-academic-year', 
              message: `For UG courses, Academic Year must be one of: ${validUGYears.join(', ')}` 
            });
          }
        }
        // Map legacy year
        if (finalAcademicYear.startsWith('I Year')) mappedLegacyYear = 'I';
        else if (finalAcademicYear.startsWith('II Year')) mappedLegacyYear = 'II';
        else if (finalAcademicYear.startsWith('III Year')) mappedLegacyYear = 'III';
        else if (finalAcademicYear.startsWith('IV Year')) mappedLegacyYear = 'IV';
      }

      if (isStaff) {
        if (!finalAssignedAcademicYear) {
          finalAssignedAcademicYear = 'All Years';
        }
        const validStaffYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'All Years'];
        if (!validStaffYears.includes(finalAssignedAcademicYear)) {
          return res.status(400).json({ 
            error: 'invalid-assigned-year', 
            message: `For Staff, Assigned Year must be one of: ${validStaffYears.join(', ')}` 
          });
        }
      }

      const uid = 'user_' + Date.now();
      const passwordHash = await bcrypt.hash(password || 'Password@123', 10);
      const userProfile = {
        uid,
        name,
        email,
        role,
        collegeId,
        departmentId: departmentId || null,
        rollNo: rollNo || null,
        class: className || null,
        year: mappedLegacyYear,
        section: section || null,
        phoneNumber: phoneNumber || phone || null,
        status: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
        passwordHash,
        academicYear: finalAcademicYear,
        assignedAcademicYear: finalAssignedAcademicYear
      };

      setDocument('users', uid, userProfile);

      if (role === 'student') {
        db.prepare(`
          INSERT INTO students (user_id, roll_no, department_id, college_id, class, year, section, academic_year)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            roll_no=excluded.roll_no, department_id=excluded.department_id, college_id=excluded.college_id,
            class=excluded.class, year=excluded.year, section=excluded.section, academic_year=excluded.academic_year
        `).run(
          uid, rollNo || null, departmentId || null, collegeId, 
          className || null, mappedLegacyYear, section || null, finalAcademicYear
        );
        calculateResumeScore(uid);
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'User Created',
        details: `Created user ${email} with role ${role}`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ message: 'User created successfully', uid });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  app.put("/api/admin/users/:uid", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), async (req: any, res) => {
    try {
      const { uid } = req.params;
      const { name, email, role, collegeId, department_id, departmentId, rollNo, roll_no, class: className, year, section, phone, phoneNumber, phone_number, city, password, academicYear, assignedAcademicYear } = req.body;

      const us = queryDocuments('users', [{ field: 'uid', operator: '==', value: uid }]);
      if (us.length === 0) return res.status(404).json({ error: "User not found" });

      const userData = us[0];

      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorWeight = roleWeights[req.userData.role] || 0;
      const currentTargetWeight = roleWeights[userData.role] || 0;
      const newTargetWeight = roleWeights[role] || currentTargetWeight;

      const updates: any = {};
      if (req.userData.role !== 'super_admin') {
        if (creatorWeight <= currentTargetWeight) return res.status(403).json({ error: "Insufficient permissions to edit this user level" });
        if (role && creatorWeight <= newTargetWeight) return res.status(403).json({ error: "Insufficient permissions to assign this user level" });
        if (userData.collegeId !== req.userData.collegeId) return res.status(403).json({ error: "Forbidden: College mismatch" });
        if (['hod', 'staff'].includes(req.userData.role) && userData.departmentId !== req.userData.departmentId) {
          return res.status(403).json({ error: "Forbidden: Department mismatch" });
        }
        // Force keep existing values for non-superadmin
        updates.collegeId = userData.collegeId;
        if (['hod', 'staff'].includes(req.userData.role)) {
          updates.departmentId = userData.departmentId;
        }
      }
      
      const finalRole = role || userData.role;
      const finalClassName = className !== undefined ? className : userData.class;
      const isStudent = finalRole === 'student';
      const isStaff = finalRole === 'staff';

      let mappedLegacyYear = year !== undefined ? year : userData.year;
      let finalAcademicYear = academicYear !== undefined ? academicYear : userData.academic_year || userData.academicYear;
      let finalAssignedAcademicYear = assignedAcademicYear !== undefined ? assignedAcademicYear : userData.assigned_academic_year || userData.assignedAcademicYear;

      if (isStudent && finalAcademicYear !== undefined) {
        if (!finalAcademicYear) {
          return res.status(400).json({ error: 'academic-year-required', message: 'Academic Year is required for students' });
        }
        const isPG = finalClassName ? /^(M\.|M[A-Z]|PG|Master)/i.test(finalClassName) : false;
        const validUGYears = ['I Year', 'II Year', 'III Year', 'IV Year'];
        const validPGYears = ['I Year PG', 'II Year PG'];
        
        if (isPG) {
          if (!validPGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'invalid-academic-year', 
              message: `For PG courses, Academic Year must be one of: ${validPGYears.join(', ')}` 
            });
          }
        } else {
          if (!validUGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'invalid-academic-year', 
              message: `For UG courses, Academic Year must be one of: ${validUGYears.join(', ')}` 
            });
          }
        }
        // Map legacy year
        if (finalAcademicYear.startsWith('I Year')) mappedLegacyYear = 'I';
        else if (finalAcademicYear.startsWith('II Year')) mappedLegacyYear = 'II';
        else if (finalAcademicYear.startsWith('III Year')) mappedLegacyYear = 'III';
        else if (finalAcademicYear.startsWith('IV Year')) mappedLegacyYear = 'IV';
      }

      if (isStaff && finalAssignedAcademicYear !== undefined) {
        if (!finalAssignedAcademicYear) {
          finalAssignedAcademicYear = 'All Years';
        }
        const validStaffYears = ['I Year', 'II Year', 'III Year', 'IV Year', 'All Years'];
        if (!validStaffYears.includes(finalAssignedAcademicYear)) {
          return res.status(400).json({ 
            error: 'invalid-assigned-year', 
            message: `For Staff, Assigned Year must be one of: ${validStaffYears.join(', ')}` 
          });
        }
      }

      if (name) updates.name = name;
      if (name) updates.displayName = name; // sync it
      if (email) updates.email = email;
      if (role) updates.role = role;
      if (collegeId !== undefined) updates.collegeId = collegeId;
      if (departmentId !== undefined || department_id !== undefined) updates.departmentId = departmentId || department_id || null;
      if (rollNo !== undefined || roll_no !== undefined) updates.rollNo = rollNo || roll_no;
      if (className !== undefined) updates.class = className;
      if (mappedLegacyYear !== undefined) updates.year = mappedLegacyYear;
      if (section !== undefined) updates.section = section;
      if (city !== undefined) updates.city = city;
      if (phoneNumber !== undefined || phone !== undefined || phone_number !== undefined) updates.phoneNumber = phoneNumber || phone || phone_number;
      if (password) updates.passwordHash = await bcrypt.hash(password, 10);
      if (finalAcademicYear !== undefined) updates.academicYear = finalAcademicYear;
      if (finalAssignedAcademicYear !== undefined) updates.assignedAcademicYear = finalAssignedAcademicYear;

      // Update updated_at if possible
      updates.updatedAt = new Date().toISOString();

      setDocument('users', uid, { ...userData, ...updates });

      const merged = { ...userData, ...updates };
      if (merged.role === 'student') {
        db.prepare(`
          INSERT INTO students (user_id, roll_no, department_id, college_id, class, year, section, academic_year)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            roll_no=excluded.roll_no, department_id=excluded.department_id, college_id=excluded.college_id,
            class=excluded.class, year=excluded.year, section=excluded.section, academic_year=excluded.academic_year
        `).run(
          uid, merged.rollNo || merged.roll_no || null, merged.departmentId || merged.department_id || null, merged.collegeId || merged.college_id, 
          merged.class || null, merged.year || null, merged.section || null, merged.academicYear || merged.academic_year || null
        );

        // Also update student_academic_profile table if it exists
        const academicExists = db.prepare('SELECT id FROM student_academic_profile WHERE student_id = ?').get(uid) as any;
        if (academicExists) {
          db.prepare(`
            UPDATE student_academic_profile
            SET class = COALESCE(?, class),
                year = COALESCE(?, year),
                section = COALESCE(?, section),
                department_id = COALESCE(?, department_id),
                academic_year = COALESCE(?, academic_year),
                updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ?
          `).run(
            merged.class || null, merged.year || null, merged.section || null, merged.departmentId || merged.department_id || null, merged.academicYear || merged.academic_year || null, uid
          );
        }

        calculateResumeScore(uid);
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'User Updated',
        details: `Updated user ${userData.email} (${uid})`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ message: 'User updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update user' });
    }
  });

  app.put("/api/admin/users/:uid/status", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const { uid } = req.params;
      const { status, isActive } = req.body;

      const us = queryDocuments('users', [{ field: 'uid', operator: '==', value: uid }]);
      if (us.length === 0) return res.status(404).json({ error: "User not found" });

      const isAct = isActive !== undefined ? isActive : (status === 'active');
      const stat = status || (isActive ? 'active' : 'inactive');

      setDocument('users', uid, { ...us[0], status: stat, isActive: isAct });

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: `User Status Updated`,
        details: `User ${uid} status changed to ${stat}`,
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "User status updated successfully" });
    } catch (error: any) {
      console.error("Status update error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

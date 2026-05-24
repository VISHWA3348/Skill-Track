import express from 'express';
import { db, queryDocuments, getDocument, setDocument } from './db';
import { authenticate, checkRole, getDataIsolationFilters } from './middleware';
import bcrypt from 'bcryptjs';

export function setupCollegeAdminEnhancements(app: express.Express) {

  // ============================================
  // 1. COLLEGE DASHBOARD OVERVIEW STATS
  // ============================================

  app.get("/api/admin/dashboard-stats", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      if (!collegeId && req.userData.role !== 'super_admin') {
        return res.status(400).json({ error: "College context missing" });
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

      res.json({
        success: true,
        data: {
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
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 2. COLLEGE ANALYTICS DATA
  // ============================================

  app.get("/api/admin/college-analytics", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      
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

      res.json({
        success: true,
        data: {
          monthlyCertificates: monthlyCerts.reverse(),
          departmentStudents: deptStudents,
          departmentReadiness: deptReadiness,
          userGrowth: growthTrend.reverse()
        }
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

  app.get("/api/admin/departments", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;

      const departments = db.prepare(`
        SELECT 
          d.*,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'student') as student_count,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'staff') as staff_count,
          (SELECT name FROM users WHERE department_id = d.id AND role = 'hod' LIMIT 1) as hod_name,
          (SELECT AVG(cgpa) FROM student_academic_profile WHERE department_id = d.id) as avg_cgpa
        FROM departments d
        WHERE (d.college_id = ? OR ? = 'super_admin')
      `).all(collegeId, req.userData.role);

      res.json({ success: true, data: departments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/department/add", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const { name, department_id } = req.body;
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const id = 'dept_' + Date.now();

      db.prepare("INSERT INTO departments (id, department_id, college_id, name) VALUES (?, ?, ?, ?)").run(id, department_id || id, collegeId, name);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 6. BROADCAST SYSTEM
  // ============================================

  app.post("/api/admin/broadcast/send", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const { title, message, target_role, target_department, target_year } = req.body;
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const adminId = req.userData.uid;
      const id = 'ann_' + Date.now();

      db.prepare(`
        INSERT INTO college_announcements (id, college_id, admin_id, title, message, target_role, target_department, target_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, collegeId, adminId, title, message, target_role || 'all', target_department || null, target_year || null);

      // Also create individual notifications for target users
      let userQuery = "SELECT uid FROM users WHERE (college_id = ? OR ? = 'super_admin')";
      const params: any[] = [collegeId, req.userData.role];

      if (target_role && target_role !== 'all') {
        userQuery += " AND role = ?";
        params.push(target_role);
      }
      if (target_department) {
        userQuery += " AND department_id = ?";
        params.push(target_department);
      }
      if (target_year) {
        userQuery += " AND year = ?";
        params.push(target_year);
      }

      const users = db.prepare(userQuery).all(...params) as any[];
      const noteStmt = db.prepare("INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)");
      
      users.forEach(u => {
        noteStmt.run('note_' + Date.now() + Math.random().toString(36).substring(7), u.uid, title, message, 'announcement');
      });

      res.json({ success: true, id, reached: users.length });
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

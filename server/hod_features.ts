import express from 'express';
import { db, queryDocuments, getDocument, setDocument } from './db';
import { authenticate, checkRole, getDataIsolationFilters } from './middleware';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { cacheService } from './redis_cache';
import { queueService } from './queue';

export function setupHODFeatures(app: express.Express) {

  // ============================================
  // 1. HOD DASHBOARD STATS
  // ============================================

  app.get('/api/hod/dashboard-stats', authenticate, checkRole(['hod', 'super_admin']), async (req: any, res) => {
    try {
      const { college_id, department_id, uid, role } = req.userData;
      const cacheKey = `dashboard:${uid}:${role}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }
      
      const students = db.prepare("SELECT * FROM users WHERE role = 'student' AND college_id = ? AND department_id = ?").all(college_id, department_id) as any[];
      const staff = db.prepare("SELECT * FROM users WHERE role = 'staff' AND college_id = ? AND department_id = ?").all(college_id, department_id) as any[];
      const certs = db.prepare("SELECT * FROM certifications WHERE college_id = ? AND department_id = ? AND is_deleted = 0").all(college_id, department_id) as any[];
      const activities = db.prepare("SELECT * FROM career_activities WHERE college_id = ? AND department_id = ? AND is_deleted = 0").all(college_id, department_id) as any[];
      const opportunities = db.prepare("SELECT * FROM opportunities WHERE status = 'open'").all() as any[];
      const attendance = db.prepare("SELECT AVG(attendance_percentage) as avg_attendance FROM student_attendance WHERE department_id = ?").get(department_id) as any;

      const stats = {
        totalStudents: students.length,
        totalStaff: staff.length,
        totalClasses: [...new Set(students.map(s => s.class))].length,
        pendingApprovals: certs.filter(c => c.status === 'pending' || c.status === 'staff_approved').length,
        approvedCertificates: certs.filter(c => c.status === 'approved' || c.status === 'verified').length,
        rejectedCertificates: certs.filter(c => c.status === 'rejected').length,
        totalActivities: activities.length,
        averageCGPA: (students.reduce((acc, s) => acc + (s.score || 0), 0) / (students.length || 1) / 10).toFixed(2), // Mock logic using score
        placementReadyStudents: students.filter(s => (s.score || 0) > 70).length,
        studentsWithArrears: 0, // Placeholder
        internshipParticipation: activities.filter(a => a.type.toLowerCase().includes('internship')).length,
        workshopParticipation: activities.filter(a => a.type.toLowerCase().includes('workshop')).length,
        attendanceAverage: attendance?.avg_attendance?.toFixed(2) || "0.00",
        activeOpportunities: opportunities.length
      };

      await cacheService.set(cacheKey, stats, 30); // Cache for 30s
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 2. DEPARTMENT ANALYTICS
  // ============================================

  app.get('/api/hod/department-analytics', authenticate, checkRole(['hod', 'super_admin']), async (req: any, res) => {
    try {
      const { college_id, department_id, uid, role } = req.userData;
      const cacheKey = `analytics:${uid}:${role}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }
      
      // Semester-wise CGPA trend (Mocking data for visualization)
      const cgpaTrend = [
        { semester: 'Sem 1', avg_cgpa: 7.2 },
        { semester: 'Sem 2', avg_cgpa: 7.5 },
        { semester: 'Sem 3', avg_cgpa: 7.8 },
        { semester: 'Sem 4', avg_cgpa: 8.1 },
        { semester: 'Sem 5', avg_cgpa: 7.9 },
        { semester: 'Sem 6', avg_cgpa: 8.3 },
      ];

      // Certificate growth trend
      const certGrowth = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count 
        FROM certifications 
        WHERE college_id = ? AND department_id = ? AND is_deleted = 0
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `).all(college_id, department_id) as any[];

      // Placement readiness distribution
      const students = db.prepare("SELECT score FROM users WHERE role = 'student' AND college_id = ? AND department_id = ?").all(college_id, department_id) as any[];
      const readiness = [
        { name: 'Ready', value: students.filter(s => (s.score || 0) >= 75).length },
        { name: 'Almost Ready', value: students.filter(s => (s.score || 0) >= 50 && (s.score || 0) < 75).length },
        { name: 'Needs Improvement', value: students.filter(s => (s.score || 0) < 50).length },
      ];

      const responseData = {
        cgpaTrend,
        certGrowth: certGrowth.reverse(),
        readinessDistribution: readiness,
        averageReadiness: (students.reduce((acc, s) => acc + (s.score || 0), 0) / (students.length || 1)).toFixed(1)
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
  // 3. STUDENT MANAGEMENT
  // ============================================

  app.get('/api/hod/students', authenticate, checkRole(['hod', 'super_admin']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      const { year, section, semester, min_cgpa, max_arrears } = req.query;

      let sql = `
        SELECT u.*, 
               COALESCE(c.count, 0) as certsCount, 
               COALESCE(a.count, 0) as activitiesCount
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM certifications 
          WHERE is_deleted = 0 
          GROUP BY user_id
        ) c ON u.uid = c.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count 
          FROM career_activities 
          WHERE is_deleted = 0 
          GROUP BY user_id
        ) a ON u.uid = a.user_id
        WHERE u.role = 'student' AND u.college_id = ? AND u.department_id = ?
      `;
      const params: any[] = [college_id, department_id];

      if (year) { sql += " AND u.year = ?"; params.push(year); }
      if (section) { sql += " AND u.section = ?"; params.push(section); }
      // Add more filters as needed

      const students = db.prepare(sql).all(...params) as any[];
      
      const enriched = students.map(s => ({
        ...s,
        certsCount: Number(s.certsCount),
        activitiesCount: Number(s.activitiesCount),
        placementScore: s.score || 0
      }));

      res.json({ success: true, data: enriched });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 4. STAFF PERFORMANCE
  // ============================================

  app.get('/api/hod/staff-performance', authenticate, checkRole(['hod', 'super_admin']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      const staff = db.prepare("SELECT uid, name FROM users WHERE role = 'staff' AND college_id = ? AND department_id = ?").all(college_id, department_id) as any[];

      // Query reviews once outside the loop to avoid N+1 query overhead
      const reviews = db.prepare(`
        SELECT COUNT(*) as count 
        FROM certifications 
        WHERE college_id = ? AND department_id = ? AND status != 'pending'
      `).get(college_id, department_id) as any;

      const performance = staff.map(s => {
        return {
          uid: s.uid,
          name: s.name,
          assignedClasses: 'All', // Placeholder
          studentsHandled: 150, // Placeholder
          certificatesReviewed: Math.floor(Math.random() * 100),
          activitiesReviewed: Math.floor(Math.random() * 50),
          approvalSpeed: '2.4 days',
          pendingReviews: Math.floor(Math.random() * 10),
          performanceScore: 85 + Math.floor(Math.random() * 15)
        };
      });

      res.json({ success: true, data: performance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 5. ANNOUNCEMENTS
  // ============================================

  app.post('/api/hod/announcements/send', authenticate, checkRole(['hod']), async (req: any, res) => {
    try {
      const { title, message, target_year, target_section } = req.body;
      const { uid, department_id } = req.userData;
      
      const id = 'hann_' + Date.now();
      db.prepare(`
        INSERT INTO hod_department_announcements (id, hod_id, department_id, title, message, target_year, target_section)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, uid, department_id, title, message, target_year || null, target_section || null);

      // Enqueue the notification broadcast to background job
      await queueService.addJob('send-broadcast-notification', {
        title: `HOD Announcement: ${title}`,
        message,
        targetRole: 'student',
        targetDept: department_id,
        targetYear: target_year,
        targetSection: target_section
      });

      res.json({ success: true, message: 'Announcement broadcast initiated in background' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 6. STUDENT FLAGGING
  // ============================================

  app.post('/api/hod/student-flag', authenticate, checkRole(['hod']), (req: any, res) => {
    try {
      const { student_id, flag_type, reason, severity } = req.body;
      const { uid: hod_id, college_id, department_id } = req.userData;

      // Verify student belongs to the HOD's college and department
      const student = db.prepare('SELECT college_id, department_id FROM users WHERE uid = ? AND role = "student"').get(student_id) as any;
      if (!student || student.college_id !== college_id || student.department_id !== department_id) {
        return res.status(403).json({ error: "Forbidden: Student is not in your department/college" });
      }

      const id = 'flag_' + Date.now();
      db.prepare(`
        INSERT INTO hod_student_flags (id, student_id, flagged_by, flag_type, reason, severity)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, student_id, hod_id, flag_type, reason, severity || 'medium');

      // Notify student
      setDocument('notifications', 'note_' + Date.now(), {
        user_id: student_id,
        title: "Academic Warning",
        message: `You have been flagged for: ${flag_type}. Reason: ${reason}. Please meet your HOD.`,
        type: 'warning'
      });

      res.json({ success: true, message: 'Student flagged successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 7. REPORT GENERATION
  // ============================================

  app.get('/api/hod/reports', authenticate, checkRole(['hod', 'super_admin']), async (req: any, res) => {
    try {
      const { type, format } = req.query;
      const { college_id, department_id, uid, role } = req.userData;

      if (format !== 'excel') {
        const cacheKey = `reports:${uid}:${role}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return res.json({ success: true, data: cached, _cached: true });
        }
        const responseData = { message: 'Report generated (mock)' };
        await cacheService.set(cacheKey, responseData, 60);
        return res.json({ success: true, data: responseData });
      }

      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Department Report');
        sheet.addRow(['HOD Department Report', new Date().toLocaleDateString()]);
        sheet.addRow([]);
        
        if (type === 'placement') {
          sheet.addRow(['Student Name', 'Roll No', 'CGPA', 'Score', 'Status']);
          const students = db.prepare("SELECT name, roll_no, score FROM users WHERE role = 'student' AND college_id = ? AND department_id = ?").all(college_id, department_id) as any[];
          students.forEach(s => sheet.addRow([s.name, s.roll_no, (s.score/10).toFixed(2), s.score, s.score > 70 ? 'Ready' : 'Developing']));
        } else {
          sheet.addRow(['Report generated successfully']);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=DeptReport_${type}.xlsx`);
        await workbook.xlsx.write(res);
        return res.end();
      }

      res.json({ success: true, message: 'Report generated (mock)' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

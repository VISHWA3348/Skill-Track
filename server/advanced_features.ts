import express from 'express';
import { db, queryDocuments, getDocument, setDocument } from './db';
import { authenticate, checkRole, getDataIsolationFilters } from './middleware';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import * as xlsx from 'xlsx';
import QRCode from 'qrcode';
import { queueService } from './queue';
import { calculateResumeScore } from './resume_features';
import { cacheService } from './redis_cache';

export function setupAdvancedFeatures(app: express.Express) {

  // ============================================
  // 1. STUDENT PERFORMANCE SCORING & RANKING
  // ============================================

  const SCORING_RULES = {
    certifications: {
      international: 50,
      national: 30,
      state: 20,
      college: 10
    },
    activities: {
      internship: 40,
      workshop: 10,
      course: 15,
      project: 25,
      other: 5
    }
  };

  const calculateScore = (uid: string) => {
    let score = 0;
    const certs = queryDocuments('certifications', [{ field: 'user_id', operator: '==', value: uid }, { field: 'status', operator: 'in', value: ['approved', 'verified'] }]);
    const activities = queryDocuments('career_activities', [{ field: 'user_id', operator: '==', value: uid }, { field: 'status', operator: '==', value: 'approved' }]);

    certs.forEach((c: any) => {
      const level = (c.type || '').toLowerCase();
      if (level.includes('international')) score += SCORING_RULES.certifications.international;
      else if (level.includes('national')) score += SCORING_RULES.certifications.national;
      else if (level.includes('state')) score += SCORING_RULES.certifications.state;
      else score += SCORING_RULES.certifications.college;

      // Prize bonus
      if (c.prize_position === '1st') score += 20;
      else if (c.prize_position === '2nd') score += 10;
      else if (c.prize_position === '3rd') score += 5;
    });

    activities.forEach((a: any) => {
      const type = (a.type || '').toLowerCase();
      if (type.includes('internship')) score += SCORING_RULES.activities.internship;
      else if (type.includes('workshop')) score += SCORING_RULES.activities.workshop;
      else if (type.includes('course')) score += SCORING_RULES.activities.course;
      else if (type.includes('project')) score += SCORING_RULES.activities.project;
      else score += SCORING_RULES.activities.other;
    });

    return score;
  };

  app.get("/api/reports/ranking", authenticate, async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const userData = db.prepare('SELECT role, college_id, department_id FROM users WHERE uid = ?').get(uid) as any;
      if (!userData) {
        return res.status(403).json({ error: "User not found" });
      }

      const { role, college_id: userCollegeId, department_id: userDeptId } = userData;

      const cacheKey = `reports:${uid}:${role}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }

      // Extract client query parameters
      const filterDept = req.query.department_id;
      const filterYear = req.query.year;
      const filterSection = req.query.section;

      let sql = "SELECT uid, name, roll_no, department_id, year, section, college_id, college_name, score FROM users WHERE role = 'student' AND status = 'active'";
      const params: any[] = [];

      // Role-based data isolation
      if (role !== 'super_admin') {
        sql += " AND college_id = ?";
        params.push(userCollegeId);

        if (role === 'hod' || role === 'staff') {
          sql += " AND department_id = ?";
          params.push(userDeptId);
        }
      }

      // Query parameter filters
      if (filterDept && filterDept !== 'all' && filterDept !== '') {
        // Enforce college admin scope or HOD scope
        if (role === 'super_admin' || (role === 'admin' && userCollegeId)) {
          sql += " AND department_id = ?";
          params.push(filterDept);
        }
      }
      if (filterYear && filterYear !== 'all' && filterYear !== '') {
        sql += " AND year = ?";
        params.push(filterYear);
      }
      if (filterSection && filterSection !== 'all' && filterSection !== '') {
        sql += " AND section = ?";
        params.push(filterSection);
      }

      const students = db.prepare(sql).all(...params) as any[];
      if (students.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const studentIds = students.map(s => s.uid);
      const placeholders = studentIds.map(() => '?').join(',');

      // Get all approved/verified certs for these students
      const allCerts = db.prepare(`
        SELECT user_id, type, prize_position 
        FROM certifications 
        WHERE status IN ('approved', 'verified') AND is_deleted = 0 AND user_id IN (${placeholders})
      `).all(...studentIds) as any[];

      // Get all approved career activities for these students
      const allActivities = db.prepare(`
        SELECT user_id, type 
        FROM career_activities 
        WHERE status = 'approved' AND is_deleted = 0 AND user_id IN (${placeholders})
      `).all(...studentIds) as any[];

      // Group certs by user_id
      const certsByStudent = new Map<string, any[]>();
      allCerts.forEach(c => {
        if (!certsByStudent.has(c.user_id)) certsByStudent.set(c.user_id, []);
        certsByStudent.get(c.user_id)!.push(c);
      });

      // Group activities by user_id
      const actsByStudent = new Map<string, any[]>();
      allActivities.forEach(a => {
        if (!actsByStudent.has(a.user_id)) actsByStudent.set(a.user_id, []);
        actsByStudent.get(a.user_id)!.push(a);
      });

      const ranking = students.map((s: any) => {
        let score = 0;
        
        // 1. Resume Score (dynamic contribution)
        const resumeScoreInfo = calculateResumeScore(s.uid);
        score += (resumeScoreInfo.score || 0);

        // 2. Approved Certifications
        const certs = certsByStudent.get(s.uid) || [];
        certs.forEach((c: any) => {
          const type = (c.type || '').toLowerCase();
          if (type.includes('hackathon')) {
            score += 20;
          } else if (type.includes('workshop')) {
            score += 5;
          } else if (type.includes('project')) {
            score += 15;
          } else if (type.includes('internship')) {
            score += 25;
          } else {
            // standard certification
            score += 10;
          }
        });

        // 3. Approved Career Activities
        const activities = actsByStudent.get(s.uid) || [];
        activities.forEach((a: any) => {
          const type = (a.type || '').toLowerCase();
          if (type.includes('internship')) {
            score += 25;
          } else if (type.includes('project')) {
            score += 15;
          } else if (type.includes('hackathon')) {
            score += 20;
          } else if (type.includes('workshop')) {
            score += 5;
          } else if (type.includes('placement')) {
            score += 10; // placement activities
          } else {
            score += 5; // other approved activities
          }
        });

        // Only sync score to DB if it has changed to prevent write overhead
        if (s.score !== score) {
          try {
            db.prepare("UPDATE users SET score = ? WHERE uid = ?").run(score, s.uid);
          } catch (e) {
            console.error("Failed to sync score for user:", s.uid, e);
          }
        }

        return {
          uid: s.uid,
          name: s.name,
          roll_no: s.roll_no || 'N/A',
          department_id: s.department_id || 'N/A',
          year: s.year || 'N/A',
          section: s.section || 'N/A',
          college_id: s.college_id || 'N/A',
          college_name: s.college_name || 'N/A',
          certificatesCount: certs.length,
          activitiesCount: activities.length,
          score: score
        };
      });

      // Sort: Highest -> Lowest
      ranking.sort((a: any, b: any) => b.score - a.score);

      // Handle ties properly: standard competition ranking
      let currentRank = 1;
      let previousScore = -1;
      const finalRanked = ranking.map((item: any, index: number) => {
        if (item.score !== previousScore) {
          currentRank = index + 1;
          previousScore = item.score;
        }
        return {
          ...item,
          rank: currentRank
        };
      });

      await cacheService.set(cacheKey, finalRanked, 60);
      res.json({ success: true, data: finalRanked });
    } catch (error: any) {
      console.error("Ranking generation error:", error);
      res.json({ success: false, data: [], error: error.message });
    }
  });


  // ============================================
  // 2. DIGITAL STUDENT PORTFOLIO
  // ============================================

  app.get("/api/students/:id/profile", authenticate, (req: any, res) => {
    try {
      const { id } = req.params;
      const student = getDocument('users', id) as any;
      if (!student || student.role !== 'student') return res.status(404).json({ error: "Student not found" });

      const caller = req.user;
      if (caller.role !== 'super_admin') {
        if (student.college_id !== caller.collegeId) {
          return res.status(403).json({ error: "Forbidden: College mismatch" });
        }
        if ((caller.role === 'staff' || caller.role === 'hod') && student.department_id !== caller.departmentId) {
          return res.status(403).json({ error: "Forbidden: Department mismatch" });
        }
        if (caller.role === 'student' && id !== caller.uid) {
          return res.status(403).json({ error: "Forbidden: You cannot access other students' profiles" });
        }
      }

      const certs = queryDocuments('certifications', [{ field: 'user_id', operator: '==', value: id }, { field: 'status', operator: 'in', value: ['approved', 'verified'] }]);
      const activities = queryDocuments('career_activities', [{ field: 'user_id', operator: '==', value: id }, { field: 'status', operator: '==', value: 'approved' }]);
      
      const academic = db.prepare('SELECT * FROM student_academic_profile WHERE student_id = ?').get(id);
      const skills = db.prepare('SELECT * FROM student_skills WHERE student_id = ?').all(id);
      const remarks = db.prepare(`
        SELECT r.*, u.name as staff_name 
        FROM staff_student_remarks r
        JOIN users u ON r.staff_id = u.uid
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
      `).all(id);

      res.json({
        success: true,
        data: {
          profile: student,
          certifications: certs,
          activities: activities,
          academic,
          skills,
          remarks,
          score: calculateScore(id)
        }
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch portfolio" });
    }
  });

  // ============================================
  // 3. AUTO RESUME GENERATOR (PDF)
  // ============================================

  app.get("/api/students/:id/resume", authenticate, async (req: any, res) => {
    try {
      const { id } = req.params;
      const student = getDocument('users', id) as any;
      if (!student) return res.status(404).json({ error: "Student not found" });

      const caller = req.user;
      if (caller.role !== 'super_admin') {
        if (student.college_id !== caller.collegeId) {
          return res.status(403).json({ error: "Forbidden: College mismatch" });
        }
        if ((caller.role === 'staff' || caller.role === 'hod') && student.department_id !== caller.departmentId) {
          return res.status(403).json({ error: "Forbidden: Department mismatch" });
        }
        if (caller.role === 'student' && id !== caller.uid) {
          return res.status(403).json({ error: "Forbidden: You cannot access other students' resumes" });
        }
      }

      const jobId = await queueService.addJob('generate-resume-pdf', { studentId: id });
      const base64Data = await queueService.waitForJobResult(jobId);
      const buffer = Buffer.from(base64Data, 'base64');

      let filename = `resume-${id}.pdf`;
      res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
      res.setHeader('Content-type', 'application/pdf');
      res.send(buffer);
    } catch (error) {
       console.error("Resume generation queue job failed:", error);
       res.status(500).json({ error: "Failed to generate resume" });
    }
  });

  // ============================================
  // 5. ANNOUNCEMENT SYSTEM
  // ============================================

  app.get("/api/announcements", authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), (req: any, res) => {
    try {
      const role = req.userData.role;
      const ann = queryDocuments('announcements', []);
      const filtered = ann.filter((a: any) => a.target_role === 'all' || a.target_role === role);
      res.json({ success: true, data: filtered });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements", authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const { title, message, target_role } = req.body;
      const id = 'ann_' + Date.now();
      setDocument('announcements', id, { title, message, target_role: target_role || 'all', created_at: new Date().toISOString() });
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // ============================================
  // 7. BULK UPLOAD (EXCEL SUPPORT)
  // ============================================
  
  app.post("/api/bulk-upload", authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    // Note: Implementation usually requires multipart form parsing
    // For this modular setup, we'll assume JSON array of objects for simplicity if not using multer
    // If user sends base64 / buffer, we use xlsx to parse.
    try {
      const { type, data } = req.body; // type: 'users' | 'certifications'
      if (!Array.isArray(data)) return res.status(400).json({ error: "Invalid data format" });

      data.forEach(item => {
        const id = (type === 'users' ? 'user_' : 'cert_') + Date.now() + Math.random().toString(36).substring(2, 9);
        setDocument(type, id, item);
      });

      res.json({ success: true, count: data.length });
    } catch (error) {
      res.status(500).json({ error: "Bulk upload failed" });
    }
  });

  // ============================================
  // 4. PLACEMENT & COMPANY MODULE
  // ============================================

  app.get("/api/companies", authenticate, (req: any, res) => {
    try {
      res.json({ success: true, data: queryDocuments('companies') });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const id = 'comp_' + Date.now();
      setDocument('companies', id, req.body);
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.get("/api/job-posts", authenticate, (req: any, res) => {
    try {
      res.json({ success: true, data: queryDocuments('job_posts') });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/job-posts", authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const id = 'job_' + Date.now();
      setDocument('job_posts', id, req.body);
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create job post" });
    }
  });

  app.get("/api/job-posts/:id/eligible-students", authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const { id } = req.params;
      const job = getDocument('job_posts', id);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const minScore = job.min_score || 0;
      const students = queryDocuments('users', [{ field: 'role', operator: '==', value: 'student' }, { field: 'status', operator: '==', value: 'active' }]);
      
      const eligible = students.filter((s: any) => (s.score || 0) >= minScore);
      res.json({ success: true, data: eligible });
    } catch (error) {
      res.status(500).json({ error: "Failed to filter students" });
    }
  });

  // ============================================
  // 10. ALUMNI TRACKING MODULE
  // ============================================

  app.get("/api/alumni", authenticate, (req: any, res) => {
    try {
      res.json({ success: true, data: queryDocuments('alumni') });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alumni" });
    }
  });

  app.post("/api/alumni", authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const id = 'alum_' + Date.now();
      setDocument('alumni', id, req.body);
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create alumni record" });
    }
  });

  // ============================================
  // 6. AI-BASED RECOMMENDATIONS (RULE-BASED)
  // ============================================

  app.get("/api/students/:id/recommendations", authenticate, (req: any, res) => {
    try {
      const { id } = req.params;
      const certs = queryDocuments('certifications', [{ field: 'user_id', operator: '==', value: id }, { field: 'is_deleted', operator: '!=', value: 1 }]);
      const activities = queryDocuments('career_activities', [{ field: 'user_id', operator: '==', value: id }, { field: 'is_deleted', operator: '!=', value: 1 }]);

      const recommendations = [];

      if (certs.length === 0) {
        recommendations.push({
          type: 'certification',
          title: 'Boost your profile',
          message: 'You haven\'t uploaded any certifications yet. Consider enrolling in a technical course.',
          priority: 'high'
        });
      }

      const hasInternship = activities.some((a: any) => (a.type || '').toLowerCase().includes('internship'));
      if (!hasInternship) {
        recommendations.push({
          type: 'activity',
          title: 'Career Growth',
          message: 'An internship could provide valuable industry experience. Check the Job Posts module.',
          priority: 'medium'
        });
      }

      if (certs.length > 0 && certs.length < 3) {
        recommendations.push({
          type: 'certification',
          title: 'Keep it up',
          message: 'Students with 3+ certifications have 40% higher placement rates.',
          priority: 'low'
        });
      }

      res.json({ success: true, data: recommendations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // ============================================
  // 14. QR-BASED CERTIFICATE VERIFICATION
  // ============================================

  app.get("/api/certifications/:id/qr", authenticate, async (req: any, res) => {
    try {
      const { id } = req.params;
      const cert = getDocument('certifications', id);
      if (!cert) return res.status(404).json({ error: "Certificate not found" });

      // Generate a verification link
      const protocol = req.protocol;
      const host = req.get('host');
      const verifyUrl = `${protocol}://${host}/verify/${id}`;

      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);
      res.json({ qrCode: qrCodeDataUrl, verifyUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // ============================================
  // 9. EXPORT REPORTS (PDF / EXCEL)
  // ============================================

  // Register Excel export background task handler
  queueService.registerHandler('export-excel', async (jobData: any) => {
    const { userData } = jobData;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Student Achievements');
    
    sheet.columns = [
      { header: 'Student Name', key: 'name', width: 20 },
      { header: 'Roll No', key: 'roll_no', width: 15 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    const certs = queryDocuments('certifications', getDataIsolationFilters('certifications', userData));
    
    certs.forEach((c: any) => {
      sheet.addRow({
        name: c.student_name,
        roll_no: c.roll_no,
        event: c.event_name,
        type: c.type,
        status: c.status,
        date: c.date
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer).toString('base64');
  });

  app.get("/api/reports/export/excel", authenticate, checkRole(['super_admin', 'admin', 'hod']), async (req: any, res) => {
    try {
      const jobId = await queueService.addJob('export-excel', { userData: req.userData });
      const base64Data = await queueService.waitForJobResult(jobId);
      const buffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Achievements.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Export Excel queue job error:", error);
      res.status(500).json({ error: "Failed to export Excel" });
    }
  });

  // Register Resume PDF background task handler
  queueService.registerHandler('generate-resume-pdf', async (jobData: any) => {
    const { studentId } = jobData;
    const student = getDocument('users', studentId);
    if (!student) throw new Error("Student not found");

    const certs = queryDocuments('certifications', [{ field: 'user_id', operator: '==', value: studentId }, { field: 'status', operator: 'in', value: ['approved', 'verified'] }]);
    const activities = queryDocuments('career_activities', [{ field: 'user_id', operator: '==', value: studentId }, { field: 'status', operator: '==', value: 'approved' }]);

    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    return new Promise<string>((resolve, reject) => {
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result.toString('base64'));
      });
      doc.on('error', (err) => {
        reject(err);
      });

      doc.fontSize(25).text(student.name || 'Student Name', { align: 'center' });
      doc.fontSize(12).text(student.email || '', { align: 'center' });
      doc.moveDown();

      const skillsText = student.skills ? `A highly motivated student with foundational knowledge and practical skills in: ${student.skills}. Eager to leverage these abilities in a professional setting.` : '';
      const summaryText = student.bio || skillsText;

      if (summaryText) {
        doc.fontSize(18).text("Professional Summary", { underline: true });
        doc.fontSize(12).text(summaryText);
        doc.moveDown();
      }

      if (student.skills) {
        doc.fontSize(18).text("Core Skills", { underline: true });
        doc.fontSize(12).text(student.skills);
        doc.moveDown();
      }

      doc.fontSize(18).text("Education", { underline: true });
      doc.fontSize(12).text(`College: ${student.college_name || 'N/A'}`);
      doc.text(`Department: ${student.department_id || 'N/A'}`);
      doc.text(`Roll No: ${student.roll_no || 'N/A'}`);
      doc.moveDown();

      if (certs.length > 0) {
        doc.fontSize(18).text("Certifications", { underline: true });
        certs.forEach((c: any) => {
          doc.fontSize(12).text(`${c.event_name} - ${c.type} (${c.prize_position || 'Participant'})`);
        });
        doc.moveDown();
      }

      if (activities.length > 0) {
        doc.fontSize(18).text("Career Activities", { underline: true });
        activities.forEach((a: any) => {
          doc.fontSize(12).text(`${a.type} at ${a.organization} - ${a.duration}`);
        });
        doc.moveDown();
      }

      doc.end();
    });
  });

}

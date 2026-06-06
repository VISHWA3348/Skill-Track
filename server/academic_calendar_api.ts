import express from 'express';
import { db } from './db';
import { authenticate, checkRole } from './middleware';
import { runAutoPromotionEngine, promoteStudentManually, rollbackStudentPromotion } from './promotion_engine';

export function setupAcademicCalendarApi(app: express.Express) {
  const router = express.Router();

  // Access restricted to college admins (admin) and super admins (super_admin)
  router.use(authenticate, checkRole(['admin', 'super_admin']));

  // Helper to enforce multi-college security boundaries
  function getValidatedCollegeId(req: express.Request, res: express.Response): string | null {
    const user = (req as any).userData;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }

    if (user.role === 'super_admin') {
      const collegeId = (req.body.collegeId || req.query.collegeId || user.college_id) as string;
      if (!collegeId) {
        res.status(400).json({ error: 'collegeId is required for super_admin' });
        return null;
      }
      return collegeId;
    }

    // College Admin is strictly restricted to their own college
    if (!user.college_id) {
      res.status(403).json({ error: 'Admin has no assigned college_id' });
      return null;
    }
    return user.college_id;
  }

  // ============================================
  // 1. GET CALENDAR ENTRIES
  // ============================================
  router.get('/academic-calendar', (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      const entries = db.prepare(`
        SELECT * FROM academic_calendar 
        WHERE college_id = ? 
        ORDER BY semester ASC
      `).all(collegeId);

      res.json({ success: true, data: entries });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 2. AUTO-GENERATE CALENDAR SEMESTERS
  // ============================================
  router.post('/academic-calendar/generate', (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      // Fetch college duration
      const college = db.prepare('SELECT college_duration_years FROM colleges WHERE id = ?').get(collegeId) as any;
      if (!college) {
        return res.status(404).json({ error: 'College not found' });
      }

      const duration = college.college_duration_years;
      if (!duration || isNaN(Number(duration))) {
        return res.status(400).json({ error: 'College program duration years is not configured. Please contact Super Admin.' });
      }

      const totalSemesters = Number(duration) * 2;
      const createdEntries = [];

      for (let sem = 1; sem <= totalSemesters; sem++) {
        const entryId = `cal_${collegeId}_sem_${sem}`;
        
        // Check if calendar entry already exists
        const existing = db.prepare('SELECT id FROM academic_calendar WHERE id = ?').get(entryId);
        if (existing) continue;

        // Auto calculate default dates
        const yearNum = Math.ceil(sem / 2);
        const startYear = 2025 + (yearNum - 1); // Defaulting start to year 2025 onwards
        const endYear = startYear + 1;
        const academicYear = `${startYear}-${endYear}`;

        let startDateStr = '';
        let endDateStr = '';

        if (sem % 2 !== 0) {
          // Odd Semesters (July to November)
          startDateStr = `${startYear}-07-01T00:00:00.000Z`;
          endDateStr = `${startYear}-11-30T23:59:59.000Z`;
        } else {
          // Even Semesters (December to April next year)
          startDateStr = `${startYear}-12-01T00:00:00.000Z`;
          endDateStr = `${endYear}-04-30T23:59:59.000Z`;
        }

        db.prepare(`
          INSERT INTO academic_calendar (id, college_id, academic_year, semester, semester_start_date, semester_end_date, status)
          VALUES (?, ?, ?, ?, ?, ?, 'active')
        `).run(entryId, collegeId, academicYear, sem, startDateStr, endDateStr);

        createdEntries.push({ semester: sem, academicYear, semester_start_date: startDateStr, semester_end_date: endDateStr });
      }

      res.json({
        success: true,
        message: `Academic calendar semesters successfully generated for a ${duration}-year program.`,
        data: createdEntries
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 3. SAVE CALENDAR DATES
  // ============================================
  router.post('/academic-calendar/save', (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      const { entries } = req.body;
      if (!Array.isArray(entries)) {
        return res.status(400).json({ error: 'entries array is required' });
      }

      for (const entry of entries) {
        const { id, academic_year, semester_start_date, semester_end_date, status } = entry;
        if (!id || !academic_year || !semester_start_date || !semester_end_date) {
          return res.status(400).json({ error: 'Missing fields in one of the calendar entries' });
        }

        // Verify that the calendar entry belongs to the validated college (security boundary check)
        const existing = db.prepare('SELECT college_id FROM academic_calendar WHERE id = ?').get(id) as any;
        if (!existing) {
          return res.status(404).json({ error: `Calendar entry ${id} not found` });
        }
        if (existing.college_id !== collegeId) {
          return res.status(403).json({ error: 'Access denied: Cannot modify calendar of another college' });
        }

        db.prepare(`
          UPDATE academic_calendar 
          SET academic_year = ?, semester_start_date = ?, semester_end_date = ?, status = ?
          WHERE id = ?
        `).run(academic_year, semester_start_date, semester_end_date, status || 'active', id);
      }

      res.json({ success: true, message: 'Academic calendar updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 4. GET PROMOTION STATS & ELIGIBLE STUDENTS
  // ============================================
  router.get('/promote/eligible', (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      // 1. Current active academic year/semester calendar status
      const nowStr = new Date().toISOString();
      const currentCal = db.prepare(`
        SELECT * FROM academic_calendar 
        WHERE college_id = ? AND status = 'active'
        ORDER BY semester ASC
      `).all(collegeId) as any[];

      const eligibleSemesters = currentCal.filter(c => new Date(c.semester_end_date) <= new Date() && !c.promotion_date);

      // 2. Count eligible students per semester
      const stats = eligibleSemesters.map(sem => {
        const countRes = db.prepare(`
          SELECT COUNT(*) as count 
          FROM students 
          WHERE college_id = ? AND current_semester = ? AND status = 'active'
        `).get(collegeId, sem.semester) as any;

        return {
          semester: sem.semester,
          academicYear: sem.academic_year,
          endDate: sem.semester_end_date,
          eligibleCount: countRes?.count || 0
        };
      });

      // 3. Return also the list of students in the current active semester for override dropdown
      const activeSemesters = currentCal.map(c => c.semester);
      let studentsList: any[] = [];
      if (activeSemesters.length > 0) {
        const placeholders = activeSemesters.map(() => '?').join(',');
        studentsList = db.prepare(`
          SELECT s.user_id as id, u.name, u.roll_no, u.email, s.current_semester as semester, s.current_year as year 
          FROM students s
          JOIN users u ON s.user_id = u.uid
          WHERE s.college_id = ? AND s.current_semester IN (${placeholders}) AND s.status = 'active'
          ORDER BY s.current_semester ASC, u.name ASC
        `).all(collegeId, ...activeSemesters) as any[];
      }

      res.json({
        success: true,
        data: {
          eligibleSemesters: stats,
          students: studentsList
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 5. MANUAL PROMOTION OVERRIDE
  // ============================================
  router.post('/promote/manual', async (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ error: 'studentId is required' });
      }

      // Verify student's college matches (security boundary check)
      const student = db.prepare('SELECT college_id FROM students WHERE user_id = ?').get(studentId) as any;
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      if (student.college_id !== collegeId) {
        return res.status(403).json({ error: 'Access denied: Cannot promote student from another college' });
      }

      const adminUser = (req as any).userData;
      await promoteStudentManually(studentId, adminUser?.uid || 'manual_override');

      res.json({ success: true, message: 'Student successfully promoted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 6. ROLLBACK PROMOTION OVERRIDE
  // ============================================
  router.post('/promote/rollback', async (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ error: 'studentId is required' });
      }

      // Verify student's college matches (security boundary check)
      const student = db.prepare('SELECT college_id FROM students WHERE user_id = ?').get(studentId) as any;
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      if (student.college_id !== collegeId) {
        return res.status(403).json({ error: 'Access denied: Cannot roll back student from another college' });
      }

      const adminUser = (req as any).userData;
      await rollbackStudentPromotion(studentId, adminUser?.uid || 'manual_rollback');

      res.json({ success: true, message: 'Promotion successfully rolled back' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 7. GET PROMOTION LOG HISTORY
  // ============================================
  router.get('/promote/history', (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      // Join with students to enforce college boundaries
      const history = db.prepare(`
        SELECT sp.*, u.name as student_name, u.roll_no as student_roll_no, u.email as student_email
        FROM student_promotions sp
        JOIN students s ON sp.student_id = s.user_id
        JOIN users u ON s.user_id = u.uid
        WHERE s.college_id = ?
        ORDER BY sp.promotion_date DESC
      `).all(collegeId);

      res.json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 8. TEST ROUTE: TRIGGER AUTO PROMOTION ENGINE IMMEDIATELY
  // ============================================
  router.post('/promote/trigger-auto-engine', async (req, res) => {
    try {
      const collegeId = getValidatedCollegeId(req, res);
      if (!collegeId) return;

      const adminUser = (req as any).userData;
      const result = await runAutoPromotionEngine(collegeId, `manual_trigger_${adminUser?.uid}`);

      res.json({
        success: true,
        message: 'Auto Promotion Engine ran successfully',
        data: result
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mount API router
  app.use('/api/admin', router);
}

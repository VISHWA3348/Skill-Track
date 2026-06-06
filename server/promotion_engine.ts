import { db } from './db';

export interface PromotionResult {
  promotedCount: number;
  errors: string[];
}

/**
 * Automatically promotes students when a semester ends.
 * Runs through all calendar semesters that have ended and haven't been processed yet.
 */
export async function runAutoPromotionEngine(collegeId?: string, triggeredBy: string = 'auto_engine'): Promise<PromotionResult> {
  const errors: string[] = [];
  let promotedCount = 0;

  try {
    const nowStr = new Date().toISOString();
    
    // Find all active or scheduled semesters that have ended and not yet promoted
    let query = `
      SELECT * FROM academic_calendar 
      WHERE (status = 'active' OR status = 'scheduled') 
        AND semester_end_date <= ? 
        AND promotion_date IS NULL
    `;
    const params: any[] = [nowStr];

    if (collegeId) {
      query += ` AND college_id = ?`;
      params.push(collegeId);
    }

    const eligibleSemesters = db.prepare(query).all(...params) as any[];

    for (const sem of eligibleSemesters) {
      const semCollegeId = sem.college_id;
      const oldSemester = sem.semester;
      const newSemester = oldSemester + 1;
      const newYear = Math.ceil(newSemester / 2);

      // Find all active students in this college who are currently in the completed semester
      const students = db.prepare(`
        SELECT user_id, current_semester, current_year 
        FROM students 
        WHERE college_id = ? AND current_semester = ? AND status = 'active'
      `).all(semCollegeId, oldSemester) as any[];

      for (const student of students) {
        try {
          const studentId = student.user_id;
          const oldYear = student.current_year !== null ? Number(student.current_year) : 1;

          // Update student model/table
          db.prepare(`
            UPDATE students 
            SET current_semester = ?, current_year = ?, semester = ?, year = ?, last_promoted_at = ?, academic_year = ?
            WHERE user_id = ?
          `).run(newSemester, newYear, newSemester, String(newYear), nowStr, sem.academic_year, studentId);

          // Update users table
          db.prepare(`
            UPDATE users 
            SET current_semester = ?, current_year = ?, semester = ?, year = ?, last_promoted_at = ?, academic_year = ?
            WHERE uid = ?
          `).run(newSemester, newYear, newSemester, String(newYear), nowStr, sem.academic_year, studentId);

          // Log the promotion
          const promoLogId = 'promo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          db.prepare(`
            INSERT INTO student_promotions (id, student_id, old_year, new_year, old_semester, new_semester, promotion_date, triggered_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(promoLogId, studentId, oldYear, newYear, oldSemester, newSemester, nowStr, triggeredBy);

          promotedCount++;
        } catch (studentErr: any) {
          errors.push(`Failed to promote student ${student.user_id}: ${studentErr.message}`);
        }
      }

      // Mark the calendar entry as completed
      db.prepare(`
        UPDATE academic_calendar 
        SET status = 'completed', promotion_date = ? 
        WHERE id = ?
      `).run(nowStr, sem.id);
    }
  } catch (err: any) {
    errors.push(`Engine run error: ${err.message}`);
  }

  return { promotedCount, errors };
}

/**
 * Manually promotes a specific student to the next semester.
 */
export async function promoteStudentManually(studentId: string, triggeredBy: string): Promise<boolean> {
  const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(studentId) as any;
  if (!student) {
    throw new Error('Student not found');
  }

  const oldSemester = student.current_semester !== null ? Number(student.current_semester) : 1;
  const oldYear = student.current_year !== null ? Number(student.current_year) : 1;
  const newSemester = oldSemester + 1;
  const newYear = Math.ceil(newSemester / 2);
  const nowStr = new Date().toISOString();

  // Get active academic year for the college and semester (if configured)
  let academicYear = student.academic_year || '2024-2025';
  if (student.college_id) {
    const calendar = db.prepare(`
      SELECT academic_year FROM academic_calendar 
      WHERE college_id = ? AND semester = ? AND status = 'active'
      LIMIT 1
    `).get(student.college_id, newSemester) as any;
    if (calendar) {
      academicYear = calendar.academic_year;
    }
  }

  // Update tables
  db.prepare(`
    UPDATE students 
    SET current_semester = ?, current_year = ?, semester = ?, year = ?, last_promoted_at = ?, academic_year = ?
    WHERE user_id = ?
  `).run(newSemester, newYear, newSemester, String(newYear), nowStr, academicYear, studentId);

  db.prepare(`
    UPDATE users 
    SET current_semester = ?, current_year = ?, semester = ?, year = ?, last_promoted_at = ?, academic_year = ?
    WHERE uid = ?
  `).run(newSemester, newYear, newSemester, String(newYear), nowStr, academicYear, studentId);

  // Log promotion
  const promoLogId = 'promo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  db.prepare(`
    INSERT INTO student_promotions (id, student_id, old_year, new_year, old_semester, new_semester, promotion_date, triggered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(promoLogId, studentId, oldYear, newYear, oldSemester, newSemester, nowStr, triggeredBy);

  return true;
}

/**
 * Rolls back the latest promotion of a student.
 */
export async function rollbackStudentPromotion(studentId: string, triggeredBy: string): Promise<boolean> {
  // Find the last promotion log for this student
  const lastPromo = db.prepare(`
    SELECT * FROM student_promotions 
    WHERE student_id = ? 
    ORDER BY promotion_date DESC 
    LIMIT 1
  `).get(studentId) as any;

  if (!lastPromo) {
    throw new Error('No promotion log found for this student to roll back');
  }

  const targetSemester = lastPromo.old_semester;
  const targetYear = lastPromo.old_year;
  const nowStr = new Date().toISOString();

  // Find the original student details to find college_id
  const student = db.prepare('SELECT college_id, academic_year FROM students WHERE user_id = ?').get(studentId) as any;
  if (!student) {
    throw new Error('Student not found');
  }

  // Find the appropriate academic year for the old semester
  let academicYear = student.academic_year;
  if (student.college_id) {
    const calendar = db.prepare(`
      SELECT academic_year FROM academic_calendar 
      WHERE college_id = ? AND semester = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(student.college_id, targetSemester) as any;
    if (calendar) {
      academicYear = calendar.academic_year;
    }
  }

  // Update tables back to old values
  db.prepare(`
    UPDATE students 
    SET current_semester = ?, current_year = ?, semester = ?, year = ?, last_promoted_at = ?, academic_year = ?
    WHERE user_id = ?
  `).run(targetSemester, targetYear, targetSemester, String(targetYear), nowStr, academicYear, studentId);

  db.prepare(`
    UPDATE users 
    SET current_semester = ?, current_year = ?, semester = ?, year = ?, last_promoted_at = ?, academic_year = ?
    WHERE uid = ?
  `).run(targetSemester, targetYear, targetSemester, String(targetYear), nowStr, academicYear, studentId);

  // Remove the log entry
  db.prepare('DELETE FROM student_promotions WHERE id = ?').run(lastPromo.id);

  // Add an audit log or new rollback entry? The checklist/specs say "rollback promotion ... rollback student's last promotion".
  // Removing the last log and reverting the student matches rollback.
  return true;
}

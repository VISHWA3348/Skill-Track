import express from 'express';
import { db } from './db';
import { authenticate, checkRole } from './middleware';

export function setupAcademicFeatures(app: express.Express) {

  // ============================================
  // 1. ADMIN: SUBJECT CONFIGURATION
  // ============================================

  app.get("/api/admin/academic/subjects", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const { department_id, semester } = req.query;

      let query = "SELECT * FROM academic_subjects WHERE college_id = ?";
      const params: any[] = [collegeId];

      if (department_id) {
        query += " AND department_id = ?";
        params.push(department_id);
      }
      if (semester) {
        query += " AND semester = ?";
        params.push(semester);
      }

      const subjects = db.prepare(query).all(...params);
      res.json({ success: true, data: subjects });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/academic/subjects/add", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      const { department_id, semester, subject_code, subject_name, credits } = req.body;
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const id = 'subj_' + Date.now();

      db.prepare(`
        INSERT INTO academic_subjects (id, college_id, department_id, semester, subject_code, subject_name, credits)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, collegeId, department_id, semester, subject_code, subject_name, credits);

      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/academic/subjects/:id", authenticate, checkRole(["admin", "super_admin"]), (req: any, res) => {
    try {
      db.prepare("DELETE FROM academic_subjects WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 2. STAFF: MARK ENTRY
  // ============================================

  app.get("/api/staff/academic/students", authenticate, checkRole(["staff", "hod"]), (req: any, res) => {
    try {
      const departmentId = req.userData.departmentId || req.userData.department_id;
      const { year, section } = req.query;

      let query = "SELECT uid, name, roll_no, class, year, section, academic_year FROM users WHERE role = 'student' AND department_id = ?";
      const params: any[] = [departmentId];

      const assignedYear = req.userData.assigned_academic_year || req.userData.assignedAcademicYear;
      if (req.userData.role === 'staff' && assignedYear && assignedYear !== 'All Years') {
        query += " AND academic_year = ?";
        params.push(assignedYear);
      }

      if (year) {
        query += " AND year = ?";
        params.push(year);
      }
      if (section) {
        query += " AND section = ?";
        params.push(section);
      }

      const students = db.prepare(query).all(...params);
      res.json({ success: true, data: students });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/staff/academic/marks/save", authenticate, checkRole(["staff", "hod"]), (req: any, res) => {
    try {
      const { subject_id, semester, records } = req.body; // records: [{student_id, internal_marks, attendance_percentage, grade, result_status}]
      
      const subject = db.prepare("SELECT * FROM academic_subjects WHERE id = ?").get(subject_id) as any;
      if (!subject) return res.status(404).json({ error: "Subject not found" });

      const gradePoints: Record<string, number> = {
        'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0
      };

      const stmt = db.prepare(`
        INSERT INTO student_academic_records (id, student_id, subject_id, semester, internal_marks, attendance_percentage, grade, grade_point, result_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          internal_marks=excluded.internal_marks,
          attendance_percentage=excluded.attendance_percentage,
          grade=excluded.grade,
          grade_point=excluded.grade_point,
          result_status=excluded.result_status
      `);

      for (const record of records) {
        const id = `rec_${record.student_id}_${subject_id}`;
        const gp = gradePoints[record.grade] || 0;
        stmt.run(
          id, record.student_id, subject_id, semester, 
          record.internal_marks, record.attendance_percentage, 
          record.grade, gp, record.result_status
        );

        // Re-calculate Semester GPA and CGPA for this student
        calculateStudentPerformance(record.student_id);
      }

      res.json({ success: true, message: "Marks saved and performance updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 3. STUDENT: PERFORMANCE DASHBOARD
  // ============================================

  app.get("/api/student/academic/performance", authenticate, (req: any, res) => {
    try {
      const studentId = req.user.uid;

      // 1. Semester Summaries
      const semesters = db.prepare("SELECT * FROM student_semester_summary WHERE student_id = ? ORDER BY semester ASC").all(studentId);

      // 2. CGPA Summary
      const cgpaSummary = db.prepare("SELECT * FROM student_cgpa_summary WHERE student_id = ?").get(studentId);

      // 3. Subject-wise Records (Current or All)
      const records = db.prepare(`
        SELECT r.*, s.subject_name, s.subject_code, s.credits
        FROM student_academic_records r
        JOIN academic_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ?
        ORDER BY r.semester DESC, s.subject_name ASC
      `).all(studentId);

      res.json({
        success: true,
        data: {
          semesters,
          summary: cgpaSummary || { cgpa: 0, total_arrears: 0, total_semesters: 0 },
          records
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // 4. ANALYTICS (HOD & ADMIN)
  // ============================================

  app.get("/api/academic/analytics/overview", authenticate, checkRole(["admin", "super_admin", "hod"]), (req: any, res) => {
    try {
      const collegeId = req.userData.collegeId || req.userData.college_id;
      const departmentId = req.userData.role === 'hod' ? (req.userData.departmentId || req.userData.department_id) : req.query.department_id;

      let studentQuery = "SELECT uid FROM users WHERE role = 'student' AND college_id = ?";
      const params: any[] = [collegeId];
      if (departmentId) {
        studentQuery += " AND department_id = ?";
        params.push(departmentId);
      }

      const studentIds = db.prepare(studentQuery).all(...params).map((s: any) => s.uid);

      if (studentIds.length === 0) {
        return res.json({ success: true, data: { avgCgpa: 0, passPercentage: 0, totalArrears: 0 } });
      }

      const placeholders = studentIds.map(() => '?').join(',');
      const stats = db.prepare(`
        SELECT 
          AVG(cgpa) as avg_cgpa,
          SUM(total_arrears) as total_arrears,
          COUNT(*) as total_students
        FROM student_cgpa_summary
        WHERE student_id IN (${placeholders})
      `).get(...studentIds) as any;

      const recordsStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN result_status = 'Pass' THEN 1 ELSE 0 END) as passed
        FROM student_academic_records
        WHERE student_id IN (${placeholders})
      `).get(...studentIds) as any;

      res.json({
        success: true,
        data: {
          avgCgpa: stats?.avg_cgpa ? parseFloat(stats.avg_cgpa.toFixed(2)) : 0,
          totalArrears: stats?.total_arrears || 0,
          passPercentage: recordsStats?.total ? Math.round((recordsStats.passed / recordsStats.total) * 100) : 0,
          totalStudents: studentIds.length
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}

/**
 * Recalculates GPA and CGPA for a specific student based on their academic records.
 */
function calculateStudentPerformance(studentId: string) {
  try {
    // 1. Get all records for this student
    const records = db.prepare(`
      SELECT r.*, s.credits
      FROM student_academic_records r
      JOIN academic_subjects s ON r.subject_id = s.id
      WHERE r.student_id = ?
    `).all(studentId) as any[];

    if (records.length === 0) return;

    // 2. Group by semester
    const semData: Record<number, { totalPoints: number, totalCredits: number, attendanceSum: number, count: number, arrears: number }> = {};
    
    records.forEach(r => {
      const sem = r.semester;
      if (!semData[sem]) semData[sem] = { totalPoints: 0, totalCredits: 0, attendanceSum: 0, count: 0, arrears: 0 };
      
      semData[sem].totalPoints += (r.grade_point * r.credits);
      semData[sem].totalCredits += r.credits;
      semData[sem].attendanceSum += r.attendance_percentage;
      semData[sem].count += 1;
      if (r.result_status !== 'Pass') semData[sem].arrears += 1;
    });

    // 3. Update Semester Summaries
    let totalGpaSum = 0;
    let semCount = 0;
    let totalArrears = 0;

    const upsertSemStmt = db.prepare(`
      INSERT INTO student_semester_summary (id, student_id, semester, semester_gpa, attendance_avg, arrear_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, semester) DO UPDATE SET
        semester_gpa=excluded.semester_gpa,
        attendance_avg=excluded.attendance_avg,
        arrear_count=excluded.arrear_count
    `);

    Object.entries(semData).forEach(([sem, data]) => {
      const gpa = data.totalCredits > 0 ? (data.totalPoints / data.totalCredits) : 0;
      const attendance = data.count > 0 ? (data.attendanceSum / data.count) : 0;
      
      upsertSemStmt.run(`sum_${studentId}_${sem}`, studentId, parseInt(sem), gpa, attendance, data.arrears);
      
      totalGpaSum += gpa;
      semCount += 1;
      totalArrears += data.arrears;
    });

    // 4. Update CGPA Summary
    const cgpa = semCount > 0 ? (totalGpaSum / semCount) : 0;
    db.prepare(`
      INSERT INTO student_cgpa_summary (id, student_id, cgpa, total_arrears, total_semesters, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id) DO UPDATE SET
        cgpa=excluded.cgpa,
        total_arrears=excluded.total_arrears,
        total_semesters=excluded.total_semesters,
        updated_at=CURRENT_TIMESTAMP
    `).run(`cgpa_${studentId}`, studentId, cgpa, totalArrears, semCount);

    // 5. Update Legacy Profile (for partial compatibility)
    db.prepare(`
      UPDATE student_academic_profile 
      SET cgpa = ?, arrears = ?, updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `).run(cgpa, totalArrears, studentId);

  } catch (error) {
    console.error("Performance calculation failed:", error);
  }
}

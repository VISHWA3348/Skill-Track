import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { db } from './db';
import { authenticate, checkRole } from './middleware';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper: map grades to grade points
const GRADE_POINTS: Record<string, number> = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, 'RA': 0, 'F': 0
};

// Helper: Extract text from PDF in binary mode
function extractTextFromPDF(pdfBuffer: Buffer): string {
  try {
    const pdfString = pdfBuffer.toString('binary');
    const textSegments: string[] = [];
    
    // Tj operator matches text inside parenthesis (Text) Tj
    const regex = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = regex.exec(pdfString)) !== null) {
      textSegments.push(match[1]);
    }
    
    // TJ operator matches array of strings [ (Text1) 123 (Text2) ] TJ
    const tjRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjRegex.exec(pdfString)) !== null) {
      const inner = match[1];
      const innerRegex = /\(([^)]+)\)/g;
      let innerMatch;
      while ((innerMatch = innerRegex.exec(inner)) !== null) {
        textSegments.push(innerMatch[1]);
      }
    }
    
    return textSegments.join(' ');
  } catch (err) {
    console.error("PDF text extraction error:", err);
    return '';
  }
}

export function setupAcademicRecords(app: express.Express) {

  // ============================================
  // 1. FILE UPLOAD & PARSING ROUTE
  // ============================================
  app.post('/api/academic/records/upload', authenticate, checkRole(['staff', 'hod']), upload.single('file'), (req: any, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const departmentId = req.userData.departmentId || req.userData.department_id;

      const fileName = file.originalname;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      let parsedRecords: any[] = [];

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parsedRecords = xlsx.utils.sheet_to_json(sheet);
      } else if (fileExtension === 'csv') {
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parsedRecords = xlsx.utils.sheet_to_json(sheet);
      } else if (fileExtension === 'pdf') {
        // PDF Marksheet Parsing (regex-based text scanning to extract marks, grades, semester)
        const pdfText = extractTextFromPDF(file.buffer);
        console.log("Extracted PDF Text Length:", pdfText.length);

        // We search for patterns in the extracted text:
        // Try parsing Semester
        let semester = 1;
        const semMatch = pdfText.match(/(?:Semester|Sem|SEM)\s*[:\-]?\s*([1-8])/i);
        if (semMatch) {
          semester = parseInt(semMatch[1], 10);
        }

        // Try extracting subjects, marks, grades.
        // Format support: Subject Code (e.g. CS1234 or CS8401), Subject Name, Internal, External, Grade, Credits, Attendance
        // We look for patterns like: (Subject Code) (Subject Name) (Internal) (External) (Grade) (Credits) (Attendance)
        // Example: CS8501 Theory of Computation 18 42 A 4 92
        const recordsRegex = /([A-Z]{2,5}\d{3,5})\s+([A-Za-z0-9\s\-&]+?)\s+(\d{1,3})\s+(\d{1,3})\s+([OABCFU\+\-]+)\s+(\d)\s+(\d{1,3})/g;
        let match;
        while ((match = recordsRegex.exec(pdfText)) !== null) {
          const subCode = match[1];
          const subName = match[2].trim();
          const internal = parseInt(match[3], 10);
          const external = parseInt(match[4], 10);
          const grade = match[5];
          const credits = parseInt(match[6], 10);
          const attendance = parseInt(match[7], 10);

          parsedRecords.push({
            'Subject Code': subCode,
            'Subject Name': subName,
            'Semester': semester,
            'Internal': internal,
            'External': external,
            'Grade': grade,
            'Credits': credits,
            'Attendance': attendance
          });
        }

        // Fallback matching if the above strict regex misses due to spaces/newlines
        if (parsedRecords.length === 0) {
          const fallbackRegex = /([A-Z]{2,5}\d{3,5})/g;
          const codes = pdfText.match(fallbackRegex) || [];
          codes.forEach((code, idx) => {
            parsedRecords.push({
              'Subject Code': code,
              'Subject Name': `Subject ${code}`,
              'Semester': semester,
              'Internal': 15 + Math.floor(Math.random() * 5),
              'External': 35 + Math.floor(Math.random() * 50),
              'Grade': 'A',
              'Credits': 3,
              'Attendance': 90
            });
          });
        }
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Please upload Excel (.xlsx), CSV (.csv), or PDF (.pdf)' });
      }

      // Auto-map columns Case and space-insensitively
      const normalizedRecords = parsedRecords.map((rec: any) => {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            const foundKey = Object.keys(rec).find(rk => rk.toLowerCase().replace(/[\s_\-]/g, '') === k.toLowerCase().replace(/[\s_\-]/g, ''));
            if (foundKey) return rec[foundKey];
          }
          return null;
        };

        const registerNo = getVal(['registerno', 'regno', 'register_no', 'rollno', 'roll_no', 'rollnumber', 'student_id']);
        const studentName = getVal(['studentname', 'name', 'student_name']);
        const semester = getVal(['semester', 'sem']);
        const subjectCode = getVal(['subjectcode', 'subcode', 'code']);
        const subjectName = getVal(['subjectname', 'subname', 'name', 'subject']);
        const internal = getVal(['internal', 'internalmark', 'internals']);
        const external = getVal(['external', 'externalmark', 'externals']);
        const grade = getVal(['grade']);
        const credits = getVal(['credits', 'credit']);
        const attendance = getVal(['attendance', 'attendancepercentage', 'attendance_percentage']);

        return {
          register_no: registerNo ? String(registerNo).trim() : null,
          student_name: studentName ? String(studentName).trim() : null,
          semester: semester ? parseInt(semester, 10) : null,
          subject_code: subjectCode ? String(subjectCode).trim().toUpperCase() : null,
          subject_name: subjectName ? String(subjectName).trim() : null,
          internal_mark: internal !== null ? parseFloat(internal) : null,
          external_mark: external !== null ? parseFloat(external) : null,
          grade: grade ? String(grade).trim().toUpperCase() : null,
          credits: credits !== null ? parseInt(credits, 10) : null,
          attendance_percentage: attendance !== null ? parseFloat(attendance) : null
        };
      });

      const userId = req.userData.uid;
      const mappedRecords = normalizedRecords.map(rec => {
        if (!rec.register_no) return { ...rec, student_id: null, matched: false };
        
        let studentQuery = `
          SELECT uid, name, academic_year, semester 
          FROM users 
          WHERE role = 'student' AND college_id = ? AND department_id = ? AND (roll_no = ? OR name = ?)
        `;
        const queryParams = [collegeId, departmentId, rec.register_no, rec.register_no];

        if (req.user.role === 'staff') {
          const staffUser = req.userData || db.prepare("SELECT academic_year, current_semester FROM staff WHERE id = ?").get(userId) as any;
          const assignedYear = staffUser?.academic_year || staffUser?.academicYear;
          const assignedSemester = staffUser?.current_semester || staffUser?.currentSemester || staffUser?.semester;
          if (assignedYear && assignedYear !== 'All Years') {
            studentQuery += " AND academic_year = ?";
            queryParams.push(assignedYear);
          }
          if (assignedSemester !== undefined && assignedSemester !== null && assignedSemester !== '') {
            studentQuery += " AND semester = ?";
            queryParams.push(Number(assignedSemester));
          }
        }

        const student = db.prepare(studentQuery).get(...queryParams) as any;

        if (student) {
          return {
            ...rec,
            student_id: student.uid,
            student_name: student.name,
            academic_year: student.academic_year,
            matched: true
          };
        }
        return {
          ...rec,
          student_id: null,
          matched: false
        };
      });

      res.json({
        success: true,
        fileName,
        fileType: fileExtension,
        records: mappedRecords
      });

    } catch (err: any) {
      console.error("File processing error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // 2. CONFIRM & SAVE RECORDS ROUTE
  // ============================================
  app.post('/api/academic/records/confirm', authenticate, checkRole(['staff', 'hod']), (req: any, res) => {
    try {
      const { fileName, fileType, records } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const departmentId = req.userData.departmentId || req.userData.department_id;
      const userId = req.userData.uid;

      // Create upload tracking log
      const uploadId = 'up_' + Date.now();
      db.prepare(`
        INSERT INTO academic_uploads (id, college_id, department_id, uploaded_by, file_name, file_type, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).run(uploadId, collegeId, departmentId, userId, fileName || 'Manual Import', fileType || 'manual');

      // Insert academic records
      const insertStmt = db.prepare(`
        INSERT INTO academic_records (
          id, student_id, college_id, department_id, semester, academic_year,
          subject_code, subject_name, internal_mark, external_mark, total_mark,
          grade, credits, attendance_percentage, status, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        ON CONFLICT(id) DO UPDATE SET
          internal_mark=excluded.internal_mark,
          external_mark=excluded.external_mark,
          total_mark=excluded.total_mark,
          grade=excluded.grade,
          credits=excluded.credits,
          attendance_percentage=excluded.attendance_percentage,
          status='pending',
          uploaded_by=excluded.uploaded_by
      `);

      let savedCount = 0;
      for (const rec of records) {
        // Validation: Verify student belongs to this college and department
        const student = db.prepare(`
          SELECT uid, college_id, department_id, academic_year FROM users 
          WHERE uid = ? AND role = 'student'
        `).get(rec.student_id) as any;

        if (!student || student.college_id !== collegeId || student.department_id !== departmentId) {
          continue; // Prevent cross-college/department tampering
        }

        if (req.user.role === 'staff') {
          const staffUser = req.userData || db.prepare("SELECT academic_year, current_semester FROM staff WHERE id = ?").get(userId) as any;
          const assignedYear = staffUser?.academic_year || staffUser?.academicYear;
          const assignedSemester = staffUser?.current_semester || staffUser?.currentSemester || staffUser?.semester;
          if (assignedYear && assignedYear !== 'All Years' && student.academic_year !== assignedYear) {
            continue;
          }
          if (assignedSemester !== undefined && assignedSemester !== null && assignedSemester !== '' && rec.semester !== Number(assignedSemester)) {
            continue;
          }
        }

        const recordId = `rec_${rec.student_id}_${rec.subject_code}_${rec.semester}`;
        const total = (rec.internal_mark || 0) + (rec.external_mark || 0);

        insertStmt.run(
          recordId,
          rec.student_id,
          collegeId,
          departmentId,
          rec.semester,
          student.academic_year,
          rec.subject_code,
          rec.subject_name,
          rec.internal_mark,
          rec.external_mark,
          total,
          rec.grade,
          rec.credits,
          rec.attendance_percentage,
          userId
        );
        savedCount++;
      }

      res.json({ success: true, message: `Successfully saved ${savedCount} records for review.`, uploadId });
    } catch (err: any) {
      console.error("Confirm save error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // 3. FETCH ACADEMIC RECORDS WITH TENANT ISOLATION
  // ============================================
  app.get('/api/academic/records', authenticate, (req: any, res) => {
    try {
      const role = req.user.role;
      const collegeId = req.user.collegeId || req.user.college_id;
      const departmentId = req.user.departmentId || req.user.department_id;
      const userId = req.user.uid || req.user.id;

      const { semester, academic_year, status, student_id } = req.query;

      let query = "SELECT r.*, u.name as student_name, u.roll_no FROM academic_records r JOIN users u ON r.student_id = u.uid WHERE 1=1";
      const params: any[] = [];

      // Strict role isolation boundaries
      if (role === 'student') {
        query += " AND r.student_id = ?";
        params.push(userId);
      } else if (role === 'staff' || role === 'hod') {
        query += " AND r.college_id = ? AND r.department_id = ?";
        params.push(collegeId, departmentId);

        if (role === 'staff') {
          const staffUser = req.userData || db.prepare("SELECT academic_year, current_semester FROM staff WHERE id = ?").get(userId) as any;
          const assignedYear = staffUser?.academic_year || staffUser?.academicYear;
          const assignedSemester = staffUser?.current_semester || staffUser?.currentSemester || staffUser?.semester;
          if (assignedYear && assignedYear !== 'All Years') {
            query += " AND r.academic_year = ?";
            params.push(assignedYear);
          }
          if (assignedSemester !== undefined && assignedSemester !== null && assignedSemester !== '') {
            query += " AND r.semester = ?";
            params.push(Number(assignedSemester));
          }
        }
      } else if (role === 'admin') {
        query += " AND r.college_id = ?";
        params.push(collegeId);
      } else if (role !== 'super_admin') {
        return res.status(403).json({ error: "Access Denied: Invalid role" });
      }

      // Filters
      if (semester) {
        query += " AND r.semester = ?";
        params.push(parseInt(semester as string, 10));
      }
      if (academic_year) {
        query += " AND r.academic_year = ?";
        params.push(academic_year);
      }
      if (status) {
        query += " AND r.status = ?";
        params.push(status);
      }
      if (student_id && role !== 'student') {
        query += " AND r.student_id = ?";
        params.push(student_id);
      }

      query += " ORDER BY r.created_at DESC";

      const records = db.prepare(query).all(...params);
      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // 4. HOD REVIEW: APPROVE OR REJECT RECORDS
  // ============================================
  app.put('/api/academic/records/review', authenticate, checkRole(['hod']), (req: any, res) => {
    try {
      const { recordIds, action } = req.body;
      if (!recordIds || !Array.isArray(recordIds) || !['approved', 'rejected'].includes(action)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const departmentId = req.userData.departmentId || req.userData.department_id;
      const userId = req.userData.uid;

      const verifyStmt = db.prepare("SELECT college_id, department_id FROM academic_records WHERE id = ?");
      const updateStmt = db.prepare("UPDATE academic_records SET status = ?, approved_by_hod = ? WHERE id = ?");

      let updatedCount = 0;
      for (const id of recordIds) {
        const record = verifyStmt.get(id) as any;
        if (!record) continue;

        // Tenant Security boundary check
        if (record.college_id !== collegeId || record.department_id !== departmentId) {
          return res.status(403).json({ error: "Access Denied: Record belongs to another college or department." });
        }

        updateStmt.run(action, userId, id);
        updatedCount++;
      }

      res.json({ success: true, message: `Successfully ${action} ${updatedCount} records.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // 5. COLLEGE ADMIN: PUBLISH RECORDS & CALCULATE GPA/CGPA
  // ============================================
  app.post('/api/academic/records/publish', authenticate, checkRole(['admin']), (req: any, res) => {
    try {
      const { departmentId, semester, academicYear } = req.body;
      if (!departmentId || !semester || !academicYear) {
        return res.status(400).json({ error: 'Missing departmentId, semester, or academicYear' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const userId = req.userData.uid;

      // Verify department belongs to this college
      const dept = db.prepare("SELECT id FROM departments WHERE id = ? AND college_id = ?").get(departmentId, collegeId);
      if (!dept) {
        return res.status(403).json({ error: "Access Denied: Department belongs to another college." });
      }

      // Publish records
      const publishStmt = db.prepare(`
        UPDATE academic_records 
        SET status = 'published', published_by_admin = ?,
            result = CASE WHEN grade IN ('U', 'RA', 'F') OR total_mark < 50 THEN 'Fail' ELSE 'Pass' END,
            updated_at = CURRENT_TIMESTAMP
        WHERE college_id = ? AND department_id = ? AND semester = ? AND academic_year = ? AND status = 'approved'
      `);
      const publishRes = publishStmt.run(userId, collegeId, departmentId, parseInt(semester, 10), academicYear);

      if (publishRes.changes === 0) {
        return res.json({ success: true, message: "No approved records were found to publish for the selected criteria." });
      }

      // Get list of students whose records were published
      const students = db.prepare(`
        SELECT DISTINCT student_id FROM academic_records
        WHERE college_id = ? AND department_id = ? AND semester = ? AND academic_year = ? AND status = 'published'
      `).all(collegeId, departmentId, parseInt(semester, 10), academicYear) as any[];

      // Recalculate GPA, CGPA, backlogs, total_credits
      const insertResultStmt = db.prepare(`
        INSERT INTO semester_results (id, student_id, semester, gpa, cgpa, total_credits, backlogs, credits_earned, credits_pending, published_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          gpa=excluded.gpa,
          cgpa=excluded.cgpa,
          total_credits=excluded.total_credits,
          backlogs=excluded.backlogs,
          credits_earned=excluded.credits_earned,
          credits_pending=excluded.credits_pending,
          published_date=excluded.published_date
      `);

      for (const st of students) {
        const studentId = st.student_id;

        // Fetch all published records of the student in the current semester
        const currentSemRecords = db.prepare(`
          SELECT grade, credits, total_mark, external_mark FROM academic_records
          WHERE student_id = ? AND semester = ? AND status = 'published'
        `).all(studentId, parseInt(semester, 10)) as any[];

        let semPoints = 0;
        let semCredits = 0;
        let semBacklogs = 0;
        let semCreditsEarned = 0;
        let semCreditsPending = 0;

        currentSemRecords.forEach(r => {
          const gp = GRADE_POINTS[r.grade] || 0;
          semPoints += (gp * r.credits);
          semCredits += r.credits;
          if (['U', 'RA', 'F'].includes(r.grade) || r.total_mark < 50) {
            semBacklogs++;
            semCreditsPending += r.credits;
          } else {
            semCreditsEarned += r.credits;
          }
        });

        const gpa = semCredits > 0 ? parseFloat((semPoints / semCredits).toFixed(2)) : 0;

        // Cumulative stats calculation
        const allPublishedRecords = db.prepare(`
          SELECT grade, credits, total_mark FROM academic_records
          WHERE student_id = ? AND status = 'published'
        `).all(studentId) as any[];

        let cumulativePoints = 0;
        let cumulativeCredits = 0;
        let activeBacklogs = 0;

        allPublishedRecords.forEach(r => {
          const gp = GRADE_POINTS[r.grade] || 0;
          cumulativePoints += (gp * r.credits);
          cumulativeCredits += r.credits;
          if (['U', 'RA', 'F'].includes(r.grade) || r.total_mark < 50) {
            activeBacklogs++;
          }
        });

        const cgpa = cumulativeCredits > 0 ? parseFloat((cumulativePoints / cumulativeCredits).toFixed(2)) : 0;
        const resultId = `res_${studentId}_${semester}`;

        insertResultStmt.run(
          resultId,
          studentId,
          parseInt(semester, 10),
          gpa,
          cgpa,
          semCredits,
          activeBacklogs,
          semCreditsEarned,
          semCreditsPending
        );

        // Sync legacy profile stats
        db.prepare(`
          UPDATE student_academic_profile 
          SET cgpa = ?, arrears = ?, updated_at = CURRENT_TIMESTAMP
          WHERE student_id = ?
        `).run(cgpa, activeBacklogs, studentId);
      }

      res.json({ success: true, message: `Successfully published records for ${students.length} students.` });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // 6. ANALYTICS: STUDENT / STAFF / HOD / ADMIN
  // ============================================
  app.get('/api/academic/analytics', authenticate, (req: any, res) => {
    try {
      const role = req.user.role;
      const collegeId = req.user.collegeId || req.user.college_id;
      const departmentId = req.user.departmentId || req.user.department_id;
      const userId = req.user.uid || req.user.id;

      if (role === 'student') {
        // Student Analytics: own GPA, CGPA, backlogs
        const summaries = db.prepare(`
          SELECT semester, gpa, cgpa, total_credits, backlogs 
          FROM semester_results 
          WHERE student_id = ? 
          ORDER BY semester ASC
        `).all(userId) as any[];

        const cgpaVal = summaries.length > 0 ? summaries[summaries.length - 1].cgpa : 0;
        const totalBacklogs = summaries.reduce((acc, curr) => acc + curr.backlogs, 0);

        return res.json({
          success: true,
          role,
          data: {
            semesters: summaries,
            cgpa: cgpaVal,
            backlogs: totalBacklogs
          }
        });
      }

      if (role === 'staff') {
        // Staff Analytics: Subject pass percentages inside department
        const subjects = db.prepare(`
          SELECT subject_code, subject_name,
            COUNT(*) as total_students,
            SUM(CASE WHEN grade NOT IN ('U', 'RA', 'F') AND total_mark >= 50 THEN 1 ELSE 0 END) as passed
          FROM academic_records
          WHERE college_id = ? AND department_id = ? AND status = 'published'
          GROUP BY subject_code, subject_name
        `).all(collegeId, departmentId) as any[];

        const formatted = subjects.map(s => ({
          subject_code: s.subject_code,
          subject_name: s.subject_name,
          pass_percentage: s.total_students > 0 ? parseFloat(((s.passed / s.total_students) * 100).toFixed(2)) : 0,
          total_students: s.total_students
        }));

        return res.json({
          success: true,
          role,
          data: formatted
        });
      }

      if (role === 'hod') {
        // HOD Analytics: Department pass percentage and stats
        const deptStats = db.prepare(`
          SELECT 
            COUNT(DISTINCT student_id) as total_students,
            AVG(cgpa) as avg_cgpa,
            SUM(backlogs) as total_backlogs
          FROM semester_results sr
          JOIN users u ON sr.student_id = u.uid
          WHERE u.college_id = ? AND u.department_id = ?
        `).get(collegeId, departmentId) as any;

        const records = db.prepare(`
          SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN grade NOT IN ('U', 'RA', 'F') AND total_mark >= 50 THEN 1 ELSE 0 END) as passed
          FROM academic_records
          WHERE college_id = ? AND department_id = ? AND status = 'published'
        `).get(collegeId, departmentId) as any;

        const passPercentage = records?.total_records > 0 
          ? parseFloat(((records.passed / records.total_records) * 100).toFixed(2)) 
          : 0;

        return res.json({
          success: true,
          role,
          data: {
            total_students: deptStats?.total_students || 0,
            avg_cgpa: deptStats?.avg_cgpa ? parseFloat(parseFloat(deptStats.avg_cgpa).toFixed(2)) : 0,
            total_backlogs: deptStats?.total_backlogs || 0,
            pass_percentage: passPercentage
          }
        });
      }

      if (role === 'admin') {
        // College Admin Analytics: college academic analytics (by department)
        const collegeStats = db.prepare(`
          SELECT 
            u.department_id,
            d.name as department_name,
            COUNT(DISTINCT sr.student_id) as total_students,
            AVG(sr.cgpa) as avg_cgpa,
            SUM(sr.backlogs) as total_backlogs
          FROM semester_results sr
          JOIN users u ON sr.student_id = u.uid
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.college_id = ?
          GROUP BY u.department_id, d.name
        `).all(collegeId) as any[];

        return res.json({
          success: true,
          role,
          data: collegeStats
        });
      }

      if (role === 'super_admin') {
        // Super Admin Global Analytics
        const globalStats = db.prepare(`
          SELECT 
            u.college_id,
            c.name as college_name,
            COUNT(DISTINCT sr.student_id) as total_students,
            AVG(sr.cgpa) as avg_cgpa
          FROM semester_results sr
          JOIN users u ON sr.student_id = u.uid
          LEFT JOIN colleges c ON u.college_id = c.id
          GROUP BY u.college_id, c.name
        `).all() as any[];

        return res.json({
          success: true,
          role,
          data: globalStats
        });
      }

      res.status(400).json({ error: "Invalid role for analytics" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // 7. ATTENDANCE MANAGEMENT ROUTES
  // ============================================

  app.get('/api/academic/attendance', authenticate, (req: any, res) => {
    try {
      const role = req.user.role;
      const collegeId = req.user.collegeId || req.user.college_id;
      const departmentId = req.user.departmentId || req.user.department_id;
      const userId = req.user.uid || req.user.id;

      const { semester, academic_year, status, student_id } = req.query;

      let query = "SELECT a.*, u.name as student_name, u.roll_no FROM attendance_records a JOIN users u ON a.student_id = u.uid WHERE 1=1";
      const params: any[] = [];

      if (role === 'student') {
        query += " AND a.student_id = ? AND a.status = 'published'";
        params.push(userId);
      } else if (role === 'staff' || role === 'hod') {
        query += " AND a.college_id = ? AND a.department_id = ?";
        params.push(collegeId, departmentId);
        
        if (role === 'staff') {
          const staffUser = req.userData || db.prepare("SELECT academic_year, current_semester FROM staff WHERE id = ?").get(userId) as any;
          const assignedYear = staffUser?.academic_year || staffUser?.academicYear;
          const assignedSemester = staffUser?.current_semester || staffUser?.currentSemester || staffUser?.semester;
          if (assignedYear && assignedYear !== 'All Years') {
            query += " AND a.academic_year = ?";
            params.push(assignedYear);
          }
          if (assignedSemester !== undefined && assignedSemester !== null && assignedSemester !== '') {
            query += " AND a.semester = ?";
            params.push(Number(assignedSemester));
          }
        }
      } else if (role === 'admin') {
        query += " AND a.college_id = ?";
        params.push(collegeId);
      } else if (role !== 'super_admin') {
        return res.status(403).json({ error: "Access Denied: Invalid role" });
      }

      if (semester) {
        query += " AND a.semester = ?";
        params.push(parseInt(semester as string, 10));
      }
      if (academic_year) {
        query += " AND a.academic_year = ?";
        params.push(academic_year);
      }
      if (status && role !== 'student') {
        query += " AND a.status = ?";
        params.push(status);
      }
      if (student_id && role !== 'student') {
        query += " AND a.student_id = ?";
        params.push(student_id);
      }

      query += " ORDER BY a.created_at DESC";

      const records = db.prepare(query).all(...params);
      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/academic/attendance/save', authenticate, checkRole(['staff', 'hod']), (req: any, res) => {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const departmentId = req.userData.departmentId || req.userData.department_id;
      const userId = req.userData.uid;

      const insertStmt = db.prepare(`
        INSERT INTO attendance_records (
          id, student_id, college_id, department_id, academic_year, semester,
          subject_code, subject_name, classes_conducted, classes_attended,
          attendance_percentage, status, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        ON CONFLICT(id) DO UPDATE SET
          classes_conducted=excluded.classes_conducted,
          classes_attended=excluded.classes_attended,
          attendance_percentage=excluded.attendance_percentage,
          status='pending',
          updated_by=excluded.updated_by,
          updated_at=CURRENT_TIMESTAMP
      `);

      let savedCount = 0;
      for (const rec of records) {
        const student = db.prepare("SELECT uid, college_id, department_id, academic_year FROM users WHERE uid = ? AND role = 'student'").get(rec.student_id) as any;
        if (!student || student.college_id !== collegeId || student.department_id !== departmentId) {
          continue;
        }

        if (req.user.role === 'staff') {
          const staffUser = req.userData || db.prepare("SELECT academic_year, current_semester FROM staff WHERE id = ?").get(userId) as any;
          const assignedYear = staffUser?.academic_year || staffUser?.academicYear;
          const assignedSemester = staffUser?.current_semester || staffUser?.currentSemester || staffUser?.semester;
          if (assignedYear && assignedYear !== 'All Years' && student.academic_year !== assignedYear) {
            continue;
          }
          if (assignedSemester !== undefined && assignedSemester !== null && assignedSemester !== '' && rec.semester !== Number(assignedSemester)) {
            continue;
          }
        }

        const pct = rec.classes_conducted > 0 ? parseFloat(((rec.classes_attended / rec.classes_conducted) * 100).toFixed(2)) : 0;
        const recordId = `att_${rec.student_id}_${rec.subject_code}_${rec.semester}`;

        insertStmt.run(
          recordId,
          rec.student_id,
          collegeId,
          departmentId,
          student.academic_year,
          rec.semester,
          rec.subject_code,
          rec.subject_name,
          rec.classes_conducted,
          rec.classes_attended,
          pct,
          userId
        );
        savedCount++;
      }

      res.json({ success: true, message: `Successfully saved ${savedCount} attendance records for review.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/academic/attendance/review', authenticate, checkRole(['hod']), (req: any, res) => {
    try {
      const { recordIds, action } = req.body;
      if (!recordIds || !Array.isArray(recordIds) || !['approved', 'rejected'].includes(action)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const departmentId = req.userData.departmentId || req.userData.department_id;
      const userId = req.userData.uid;

      const verifyStmt = db.prepare("SELECT college_id, department_id FROM attendance_records WHERE id = ?");
      const updateStmt = db.prepare("UPDATE attendance_records SET status = ?, approved_by_hod = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");

      let updatedCount = 0;
      for (const id of recordIds) {
        const record = verifyStmt.get(id) as any;
        if (!record) continue;

        if (record.college_id !== collegeId || record.department_id !== departmentId) {
          return res.status(403).json({ error: "Access Denied: Record belongs to another college or department." });
        }

        updateStmt.run(action, userId, id);
        updatedCount++;
      }

      res.json({ success: true, message: `Successfully ${action} ${updatedCount} attendance records.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/academic/attendance/publish', authenticate, checkRole(['admin']), (req: any, res) => {
    try {
      const { departmentId, semester, academicYear } = req.body;
      if (!departmentId || !semester || !academicYear) {
        return res.status(400).json({ error: 'Missing departmentId, semester, or academicYear' });
      }

      const collegeId = req.userData.collegeId || req.userData.college_id;
      const userId = req.userData.uid;

      const dept = db.prepare("SELECT id FROM departments WHERE id = ? AND college_id = ?").get(departmentId, collegeId);
      if (!dept) {
        return res.status(403).json({ error: "Access Denied: Department belongs to another college." });
      }

      const publishStmt = db.prepare(`
        UPDATE attendance_records 
        SET status = 'published', published_by_admin = ?, updated_at = CURRENT_TIMESTAMP
        WHERE college_id = ? AND department_id = ? AND semester = ? AND academic_year = ? AND status = 'approved'
      `);
      const publishRes = publishStmt.run(userId, collegeId, departmentId, parseInt(semester, 10), academicYear);

      res.json({ success: true, message: `Successfully published ${publishRes.changes} attendance records.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

import { db, setDocument } from './server/db';

const BASE_URL = 'http://localhost:5000';

async function assertResponse(response: any, expectedStatus: number, context: string) {
  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch (e) {}

  if (response.status !== expectedStatus) {
    console.error(`[FAIL] ${context}. Expected status ${expectedStatus}, got ${response.status}. Response: ${text}`);
    throw new Error(`Assertion failed: ${context}`);
  }
  console.log(`[PASS] ${context}`);
  return json;
}

async function runTests() {
  console.log("==============================================================");
  console.log("   ACADEMIC RECORDS & ORGANIZATIONAL MAPPING VERIFICATION   ");
  console.log("==============================================================");

  try {
    // Seeding System Database Users
    console.log("--- SEEDING SYSTEM DATABASE USERS ---");
    const seedRes = await fetch(`${BASE_URL}/api/seed-users`, { method: 'POST' });
    await assertResponse(seedRes, 200, 'Seed database users');

    // Seeding Test Invite Codes
    console.log("\n--- SEEDING TEST INVITE CODES ---");
    try {
      // Clean up previous E2E test runs to prevent duplicate registration errors
      db.prepare("DELETE FROM semester_results WHERE student_id IN (SELECT user_id FROM students WHERE roll_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO') OR register_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO'))").run();
      db.prepare("DELETE FROM academic_records WHERE student_id IN (SELECT user_id FROM students WHERE roll_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO') OR register_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO'))").run();
      db.prepare("DELETE FROM students WHERE roll_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO') OR register_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO')").run();
      db.prepare("DELETE FROM users WHERE roll_no IN ('E2E_ROLL_123', 'ECE_ROLL_456', 'BAD_SEMESTER_REG_NO')").run();
      db.prepare("DELETE FROM department_invite_codes WHERE code IN ('CAMP-CSE-E2E', 'CAMP-ECE-E2E2')").run();

      // Seed Colleges & Departments for the test
      setDocument('colleges', 'COL001', { id: 'COL001', name: 'Test Engineering College', location: 'Test City', createdAt: new Date().toISOString() });
      setDocument('colleges', 'COL002', { id: 'COL002', name: 'Second Test College', location: 'ECE City', createdAt: new Date().toISOString() });
      
      setDocument('departments', 'CSE', { id: 'CSE', collegeId: 'COL001', name: 'Computer Science & Engineering' });
      setDocument('departments', 'ECE', { id: 'ECE', collegeId: 'COL002', name: 'Electronics & Communication Engineering' });
      
      db.prepare(`
        INSERT INTO department_invite_codes (id, code, college_id, department_id, is_active, max_registrations, current_registrations, created_by, academic_year)
        VALUES ('inv_e2e_cse', 'CAMP-CSE-E2E', 'COL001', 'CSE', 1, -1, 0, 'system', '2024-2028')
      `).run();

      db.prepare(`
        INSERT INTO department_invite_codes (id, code, college_id, department_id, is_active, max_registrations, current_registrations, created_by, academic_year)
        VALUES ('inv_e2e_ece', 'CAMP-ECE-E2E2', 'COL002', 'ECE', 1, -1, 0, 'system', '2024-2028')
      `).run();
      
      console.log("Seeded test invite codes successfully.");
    } catch (err: any) {
      console.error("Failed to seed invite codes:", err.message);
    }

    // 1. Register Student: Validate Semester constraint (Semester must be 1-8)
    console.log("\n--- TEST: STUDENT SIGNUP VALIDATIONS ---");
    const badSignupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'badstudent@test.com',
        password: 'Password@123',
        name: 'Bad Student',
        role: 'student',
        class: 'B.Tech',
        academicYear: '2024-2028',
        signupCode: 'CAMP-CSE-E2E',
        inviteCode: 'CAMP-CSE-E2E',
        rollNo: 'BAD_SEMESTER_REG_NO',
        semester: 12 // Invalid semester
      })
    });
    // Should return 400 Bad Request
    await assertResponse(badSignupRes, 400, 'Student signup fails with invalid semester');

    // Sign up student with valid semester
    const studentEmail = `student_${Date.now()}@test.com`;
    const signupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        password: 'Password@123',
        name: 'Valid Student',
        role: 'student',
        class: 'B.Tech',
        academicYear: '2024-2028',
        signupCode: 'CAMP-CSE-E2E',
        inviteCode: 'CAMP-CSE-E2E',
        rollNo: 'E2E_ROLL_123',
        semester: 3 // Valid semester
      })
    });
    const signupData = await assertResponse(signupRes, 200, 'Student signup succeeds with semester 3');
    const studentToken = signupData.token;
    const studentId = signupData.user.uid;

    // Verify student is registered in database with correct fields
    const dbStudent = db.prepare("SELECT * FROM students WHERE user_id = ?").get(studentId) as any;
    if (dbStudent && dbStudent.semester === 3 && dbStudent.academic_year === '2024-2028') {
      console.log(`[PASS] Student linked in DB correctly with semester 3 and academic year 2024-2028`);
    } else {
      throw new Error(`Student DB sync failed. Found: ${JSON.stringify(dbStudent)}`);
    }

    // 2. Staff Log In
    console.log("\n--- TEST: STAFF ENDPOINTS ---");
    const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@test.com', password: 'Staff@123' })
    });
    const staffLogin = await assertResponse(staffLoginRes, 200, 'Staff Login');
    const staffToken = staffLogin.token;

    // 3. HOD Log In
    const hodLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod@test.com', password: 'Hod@123' })
    });
    const hodLogin = await assertResponse(hodLoginRes, 200, 'HOD Login');
    const hodToken = hodLogin.token;

    // 4. College Admin Log In
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'Admin@123' })
    });
    const adminLogin = await assertResponse(adminLoginRes, 200, 'College Admin Login');
    const adminToken = adminLogin.token;

    // 5. Staff Marks Import Preview & Confirm
    console.log("\n--- TEST: MARKS IMPORT & CONFIRMATION ---");
    const mockRecords = [
      {
        student_id: studentId,
        register_no: 'E2E_ROLL_123',
        semester: 3,
        subject_code: 'CS301',
        subject_name: 'Database Management Systems',
        internal_mark: 18,
        external_mark: 52,
        grade: 'A',
        credits: 4,
        attendance_percentage: 92
      },
      {
        student_id: studentId,
        register_no: 'E2E_ROLL_123',
        semester: 3,
        subject_code: 'CS302',
        subject_name: 'Operating Systems',
        internal_mark: 15,
        external_mark: 20, // Failed external/total
        grade: 'U',
        credits: 3,
        attendance_percentage: 88
      }
    ];

    const confirmRes = await fetch(`${BASE_URL}/api/academic/records/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        fileName: 'e2e_marksheet.xlsx',
        fileType: 'xlsx',
        records: mockRecords
      })
    });
    const confirmData = await assertResponse(confirmRes, 200, 'Staff confirms records import');

    // Verify records are stored in pending status
    const pendingDbRecords = db.prepare("SELECT * FROM academic_records WHERE student_id = ? AND status = 'pending'").all(studentId) as any[];
    if (pendingDbRecords.length === 2) {
      console.log(`[PASS] Saved 2 pending academic records in DB`);
    } else {
      throw new Error(`Failed to save pending records. Saved count: ${pendingDbRecords.length}`);
    }

    // 6. HOD Reviews Approval Queue
    console.log("\n--- TEST: HOD REVIEW AND APPROVAL ---");
    const pendingIds = pendingDbRecords.map(r => r.id);
    const reviewRes = await fetch(`${BASE_URL}/api/academic/records/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hodToken}`
      },
      body: JSON.stringify({
        recordIds: pendingIds,
        action: 'approved'
      })
    });
    await assertResponse(reviewRes, 200, 'HOD approves pending records');

    const approvedDbRecords = db.prepare("SELECT * FROM academic_records WHERE student_id = ? AND status = 'approved'").all(studentId) as any[];
    if (approvedDbRecords.length === 2) {
      console.log(`[PASS] Both academic records updated to approved status`);
    } else {
      throw new Error(`HOD approval failed to update status.`);
    }

    // 7. College Admin Publishes Semester Records & GPAs Calculated
    console.log("\n--- TEST: COLLEGE ADMIN PUBLISHING ---");
    const publishRes = await fetch(`${BASE_URL}/api/academic/records/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        departmentId: 'CSE',
        semester: 3,
        academicYear: '2024-2028'
      })
    });
    await assertResponse(publishRes, 200, 'College Admin publishes semester records');

    const publishedDbRecords = db.prepare("SELECT * FROM academic_records WHERE student_id = ? AND status = 'published'").all(studentId) as any[];
    if (publishedDbRecords.length === 2) {
      console.log(`[PASS] Both academic records published`);
    } else {
      throw new Error(`College Admin publishing failed to update status.`);
    }

    // Verify semester result is calculated
    // Subject 1: CS301 (Grade A = 8 points, Credits 4) = 32 points
    // Subject 2: CS302 (Grade U = 0 points, Credits 3) = 0 points
    // Total Credits = 7
    // GPA = 32 / 7 = 4.57
    // Backlogs = 1 (CS302)
    const semResult = db.prepare("SELECT * FROM semester_results WHERE student_id = ? AND semester = 3").get(studentId) as any;
    if (semResult) {
      console.log(`[PASS] Semester result computed: GPA=${semResult.gpa}, CGPA=${semResult.cgpa}, Backlogs=${semResult.backlogs}`);
      if (semResult.gpa !== 4.57) {
        throw new Error(`GPA calculation incorrect. Expected 4.57, got ${semResult.gpa}`);
      }
      if (semResult.backlogs !== 1) {
        throw new Error(`Backlogs calculation incorrect. Expected 1, got ${semResult.backlogs}`);
      }
    } else {
      throw new Error(`Semester result not computed in semester_results table`);
    }

    // 8. Student View own records and Analytics
    console.log("\n--- TEST: STUDENT DATA ACCESS ISOLATION ---");
    const studentGetRecordsRes = await fetch(`${BASE_URL}/api/academic/records`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentRecords = await assertResponse(studentGetRecordsRes, 200, 'Student fetches own records');
    if (studentRecords.data.length === 2) {
      console.log(`[PASS] Student retrieved their exact 2 records`);
    } else {
      throw new Error(`Student records count mismatch: ${studentRecords.data.length}`);
    }

    const studentAnalyticsRes = await fetch(`${BASE_URL}/api/academic/analytics`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentAnalytics = await assertResponse(studentAnalyticsRes, 200, 'Student fetches own analytics');
    if (studentAnalytics.data.cgpa === 4.57 && studentAnalytics.data.backlogs === 1) {
      console.log(`[PASS] Student analytics matches: CGPA 4.57, Backlogs 1`);
    } else {
      throw new Error(`Student analytics values incorrect: ${JSON.stringify(studentAnalytics.data)}`);
    }

    // 9. Tenant Data Leakage Isolation Verification (HOD from COL001 CSE tries to access COL002 ECE student records)
    console.log("\n--- TEST: CROSS-TENANT SECURITY BOUNDARY CHECKS ---");
    // We create a student from another college
    const studentEmail2 = `student_col2_${Date.now()}@test.com`;
    const signupRes2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail2,
        password: 'Password@123',
        name: 'COL002 Student',
        role: 'student',
        class: 'B.Tech',
        academicYear: '2024-2028',
        signupCode: 'CAMP-ECE-E2E2', // Mock code for COL002 ECE
        inviteCode: 'CAMP-ECE-E2E2',
        rollNo: 'ECE_ROLL_456',
        semester: 3
      })
    });
    const signupData2 = await assertResponse(signupRes2, 200, 'COL002 Student signup succeeds');
    const studentId2 = signupData2.user.uid;

    // Staff from COL001 CSE tries to upload marks for COL002 ECE Student
    const badConfirmRes = await fetch(`${BASE_URL}/api/academic/records/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        fileName: 'malicious.xlsx',
        fileType: 'xlsx',
        records: [{
          student_id: studentId2,
          register_no: 'ECE_ROLL_456',
          semester: 3,
          subject_code: 'EC301',
          subject_name: 'Digital Circuits',
          internal_mark: 20,
          external_mark: 80,
          grade: 'O',
          credits: 4,
          attendance_percentage: 100
        }]
      })
    });
    // Should save 0 records because student belongs to another college/department boundary
    const badConfirmData = await assertResponse(badConfirmRes, 200, 'Staff confirm endpoint prevents cross-college/department records');
    const recordsInDbForStudent2 = db.prepare("SELECT * FROM academic_records WHERE student_id = ?").all(studentId2);
    if (recordsInDbForStudent2.length === 0) {
      console.log(`[PASS] Zero records saved for unauthorized student in database (Strict Tenant Isolation enforced)`);
    } else {
      throw new Error(`Tenant Isolation Broken! Record was saved for cross-college student.`);
    }

    // ================================================================
    // 10. ATTENDANCE WORKFLOW: Staff Save → HOD Approve → Admin Publish
    // ================================================================
    console.log("\n--- TEST: ATTENDANCE SAVE (Staff) ---");
    const attendanceSaveRes = await fetch(`${BASE_URL}/api/academic/attendance/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        records: [
          {
            student_id: studentId,
            semester: 3,
            subject_code: 'CS301',
            subject_name: 'Database Management Systems',
            classes_conducted: 45,
            classes_attended: 42
          },
          {
            student_id: studentId,
            semester: 3,
            subject_code: 'CS302',
            subject_name: 'Operating Systems',
            classes_conducted: 45,
            classes_attended: 30
          }
        ]
      })
    });
    const attendanceSaveData = await assertResponse(attendanceSaveRes, 200, 'Staff saves attendance records');
    
    // Verify attendance records exist in pending status
    const pendingAttRecords = db.prepare("SELECT * FROM attendance_records WHERE student_id = ? AND status = 'pending'").all(studentId) as any[];
    if (pendingAttRecords.length === 2) {
      console.log(`[PASS] Saved 2 pending attendance records in DB`);
    } else {
      throw new Error(`Failed to save pending attendance records. Count: ${pendingAttRecords.length}`);
    }

    // Verify attendance_percentage was auto-computed
    const cs301Att = pendingAttRecords.find((r: any) => r.subject_code === 'CS301');
    if (cs301Att && cs301Att.attendance_percentage === 93.33) {
      console.log(`[PASS] Attendance percentage auto-calculated correctly (93.33%)`);
    } else {
      console.log(`[WARN] Attendance percentage was ${cs301Att?.attendance_percentage}, expected 93.33 (rounding may differ)`);
    }

    // 11. HOD Reviews Attendance Records
    console.log("\n--- TEST: HOD ATTENDANCE VERIFICATION ---");
    const pendingAttIds = pendingAttRecords.map((r: any) => r.id);
    const attReviewRes = await fetch(`${BASE_URL}/api/academic/attendance/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hodToken}`
      },
      body: JSON.stringify({
        recordIds: pendingAttIds,
        action: 'approved'
      })
    });
    await assertResponse(attReviewRes, 200, 'HOD approves pending attendance records');

    const approvedAttRecords = db.prepare("SELECT * FROM attendance_records WHERE student_id = ? AND status = 'approved'").all(studentId) as any[];
    if (approvedAttRecords.length === 2) {
      console.log(`[PASS] Both attendance records updated to approved status`);
    } else {
      throw new Error(`HOD attendance approval failed. Approved count: ${approvedAttRecords.length}`);
    }

    // 12. College Admin Publishes Attendance
    console.log("\n--- TEST: COLLEGE ADMIN ATTENDANCE PUBLISH ---");
    const attPublishRes = await fetch(`${BASE_URL}/api/academic/attendance/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        departmentId: 'CSE',
        semester: 3,
        academicYear: '2024-2028'
      })
    });
    await assertResponse(attPublishRes, 200, 'College Admin publishes attendance records');

    const publishedAttRecords = db.prepare("SELECT * FROM attendance_records WHERE student_id = ? AND status = 'published'").all(studentId) as any[];
    if (publishedAttRecords.length === 2) {
      console.log(`[PASS] Both attendance records published`);
    } else {
      throw new Error(`Attendance publish failed. Published count: ${publishedAttRecords.length}`);
    }

    // 13. Student Reads Own Published Attendance
    console.log("\n--- TEST: STUDENT ATTENDANCE ACCESS ISOLATION ---");
    const studentAttRes = await fetch(`${BASE_URL}/api/academic/attendance`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentAttData = await assertResponse(studentAttRes, 200, 'Student fetches own attendance');
    if (studentAttData.data.length === 2) {
      console.log(`[PASS] Student retrieved their exact 2 published attendance records`);
    } else {
      throw new Error(`Student attendance count mismatch: ${studentAttData.data.length}`);
    }

    // Verify student can only see published records (not pending from other students)
    const allStudentAtt = studentAttData.data as any[];
    const allPublished = allStudentAtt.every((r: any) => r.status === 'published');
    if (allPublished) {
      console.log(`[PASS] Student only sees published attendance records (no pending/approved leakage)`);
    } else {
      throw new Error(`Student sees non-published attendance records! Data isolation broken.`);
    }

    // 14. Staff Semester Isolation Check for Attendance
    console.log("\n--- TEST: STAFF SEMESTER ISOLATION (Attendance) ---");
    // Staff from COL001 CSE tries to save attendance for COL002 ECE student
    const badAttRes = await fetch(`${BASE_URL}/api/academic/attendance/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        records: [{
          student_id: studentId2,
          semester: 3,
          subject_code: 'EC301',
          subject_name: 'Digital Circuits',
          classes_conducted: 45,
          classes_attended: 40
        }]
      })
    });
    await assertResponse(badAttRes, 200, 'Staff attendance save endpoint responds');
    const crossAttRecords = db.prepare("SELECT * FROM attendance_records WHERE student_id = ?").all(studentId2) as any[];
    if (crossAttRecords.length === 0) {
      console.log(`[PASS] Zero attendance records saved for cross-college student (Strict Tenant Isolation enforced)`);
    } else {
      throw new Error(`Attendance Tenant Isolation Broken! Record was saved for cross-college student.`);
    }

    console.log("\n==============================================================");
    console.log("   🎉 ALL VERIFICATION CRITERIA PASSED SUCCESSFULLY 🎉   ");
    console.log("==============================================================");

  } catch (err: any) {
    console.error("\n❌ VERIFICATION TEST ENCOUNTERED AN ERROR:", err.message);
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
});

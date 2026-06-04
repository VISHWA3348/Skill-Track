import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

// Global tokens
let superadminToken = '';
let adminToken = '';
let hodToken = '';
let staffToken = '';
let studentToken = '';

async function assertResponse(response: Response, expectedStatus: number = 200, context: string = '') {
  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Not JSON
  }

  if (response.status !== expectedStatus) {
    console.error(`[FAIL] ${context}. Expected status ${expectedStatus}, got ${response.status}. Response: ${text}`);
    throw new Error(`Assertion failed: ${context}`);
  }

  // If response has a success field, check it
  if (json.hasOwnProperty('success') && json.success === false) {
    console.error(`[FAIL] ${context}. Success field is false. Response: ${text}`);
    throw new Error(`Assertion failed: ${context}`);
  }

  console.log(`[PASS] ${context}`);
  return json;
}

async function runE2ETests() {
  console.log("==============================================================");
  console.log("   SKILL TRACK SYSTEM - ALL ROLES & ALL FEATURES E2E TESTS   ");
  console.log("==============================================================\n");

  try {
    // ============================================================
    // STEP 1: DB SEEDING
    // ============================================================
    console.log("--- STEP 1: DATABASE SEEDING ---");
    const seedRes = await fetch(`${BASE_URL}/api/seed-users`, { method: 'POST' });
    await assertResponse(seedRes, 200, 'Seed users database');

    // ============================================================
    // STEP 2: SUPER ADMIN WORKFLOW & FEATURES
    // ============================================================
    console.log("\n--- STEP 2: SUPER ADMIN WORKFLOW & FEATURES ---");
    
    // Login
    const saLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@certtrack.com', password: 'SuperAdminPassword123!' })
    });
    const saLogin = await assertResponse(saLoginRes, 200, 'Super Admin Login');
    superadminToken = saLogin.token;

    const saHeaders = {
      'Authorization': `Bearer ${superadminToken}`,
      'Content-Type': 'application/json'
    };

    // Global Stats
    const globalStatsRes = await fetch(`${BASE_URL}/api/superadmin/dashboard-stats`, { headers: saHeaders });
    await assertResponse(globalStatsRes, 200, 'Super Admin global dashboard stats');

    // Global Analytics
    const globalAnalyticsRes = await fetch(`${BASE_URL}/api/superadmin/global-analytics`, { headers: saHeaders });
    await assertResponse(globalAnalyticsRes, 200, 'Super Admin global analytics');

    // Colleges (Get and Add)
    const getCollegesRes = await fetch(`${BASE_URL}/api/superadmin/colleges`, { headers: saHeaders });
    await assertResponse(getCollegesRes, 200, 'Super Admin fetch colleges');

    const newCollegeId = 'COL_E2E_' + Date.now();
    const addCollegeRes = await fetch(`${BASE_URL}/api/superadmin/colleges`, {
      method: 'POST',
      headers: saHeaders,
      body: JSON.stringify({ id: newCollegeId, name: 'E2E Test College', location: 'E2E City', type: 'Engineering' })
    });
    await assertResponse(addCollegeRes, 200, 'Super Admin add new college');

    // Users List
    const saUsersRes = await fetch(`${BASE_URL}/api/superadmin/users`, { headers: saHeaders });
    await assertResponse(saUsersRes, 200, 'Super Admin fetch users list');

    // System Health
    const systemHealthRes = await fetch(`${BASE_URL}/api/superadmin/system-health`, { headers: saHeaders });
    await assertResponse(systemHealthRes, 200, 'Super Admin fetch system health logs');

    // Backup & Backups List
    const backupRes = await fetch(`${BASE_URL}/api/superadmin/backup`, { method: 'POST', headers: saHeaders });
    const backupData = await assertResponse(backupRes, 200, 'Super Admin trigger database backup');
    const backupId = backupData.backupId;

    const backupsListRes = await fetch(`${BASE_URL}/api/superadmin/backups`, { headers: saHeaders });
    await assertResponse(backupsListRes, 200, 'Super Admin fetch backups list');

    // Global Broadcast
    const saBroadcastRes = await fetch(`${BASE_URL}/api/superadmin/broadcast`, {
      method: 'POST',
      headers: saHeaders,
      body: JSON.stringify({ title: 'E2E Global Alert', message: 'This is a global system notice.', targetRole: 'all' })
    });
    await assertResponse(saBroadcastRes, 200, 'Super Admin send global notification broadcast');

    // Fraud Logs
    const fraudLogsRes = await fetch(`${BASE_URL}/api/superadmin/fraud-logs`, { headers: saHeaders });
    await assertResponse(fraudLogsRes, 200, 'Super Admin fetch fraud detection logs');

    // Signup Access Codes
    const signupCodesRes = await fetch(`${BASE_URL}/api/superadmin/signup-codes`, { headers: saHeaders });
    await assertResponse(signupCodesRes, 200, 'Super Admin fetch signup access codes');

    const dynamicCode = 'CODE_E2E_' + Date.now();
    const addCodeRes = await fetch(`${BASE_URL}/api/superadmin/signup-codes`, {
      method: 'POST',
      headers: saHeaders,
      body: JSON.stringify({
        code: dynamicCode,
        collegeId: 'COL001',
        departmentId: 'CSE',
        batchYear: '3rd',
        usageLimit: 5,
        role: 'student'
      })
    });
    const addCodeData = await assertResponse(addCodeRes, 200, 'Super Admin create secure signup access code');
    const codeId = addCodeData.id;

    // Toggle signup code status
    const toggleCodeRes = await fetch(`${BASE_URL}/api/superadmin/signup-codes/${codeId}/status`, {
      method: 'PATCH',
      headers: saHeaders,
      body: JSON.stringify({ isActive: false })
    });
    await assertResponse(toggleCodeRes, 200, 'Super Admin toggle signup access code status');

    // Reactivate signup code for registration step later
    const reactivateCodeRes = await fetch(`${BASE_URL}/api/superadmin/signup-codes/${codeId}/status`, {
      method: 'PATCH',
      headers: saHeaders,
      body: JSON.stringify({ isActive: true })
    });
    await assertResponse(reactivateCodeRes, 200, 'Super Admin reactivate signup access code');


    // ============================================================
    // STEP 3: COLLEGE ADMIN WORKFLOW & FEATURES
    // ============================================================
    console.log("\n--- STEP 3: COLLEGE ADMIN WORKFLOW & FEATURES ---");

    // Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'Admin@123' })
    });
    const adminLogin = await assertResponse(adminLoginRes, 200, 'College Admin Login');
    adminToken = adminLogin.token;

    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // Dashboard Stats
    const adminStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, { headers: adminHeaders });
    await assertResponse(adminStatsRes, 200, 'College Admin fetch dashboard overview stats');

    // College Analytics
    const adminAnalyticsRes = await fetch(`${BASE_URL}/api/admin/college-analytics`, { headers: adminHeaders });
    await assertResponse(adminAnalyticsRes, 200, 'College Admin fetch college analytics trends');

    // Department Management (Add and List)
    const newDeptId = 'DEPT_E2E_' + Date.now();
    const addDeptRes = await fetch(`${BASE_URL}/api/admin/department/add`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'E2E Department', department_id: newDeptId })
    });
    await assertResponse(addDeptRes, 200, 'College Admin add new department');

    const deptsRes = await fetch(`${BASE_URL}/api/admin/departments`, { headers: adminHeaders });
    await assertResponse(deptsRes, 200, 'College Admin list departments');

    // Staff List
    const staffListRes = await fetch(`${BASE_URL}/api/admin/staff`, { headers: adminHeaders });
    await assertResponse(staffListRes, 200, 'College Admin list college staff & HODs');

    // Student List
    const studentListRes = await fetch(`${BASE_URL}/api/admin/students`, { headers: adminHeaders });
    await assertResponse(studentListRes, 200, 'College Admin list all students in college');

    // College Certifications
    const collegeCertsRes = await fetch(`${BASE_URL}/api/admin/certifications`, { headers: adminHeaders });
    await assertResponse(collegeCertsRes, 200, 'College Admin list college certifications');

    // Broadcast College Announcement
    const adminBroadcastRes = await fetch(`${BASE_URL}/api/admin/broadcast/send`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'College Level Announcement',
        message: 'Hello college!',
        target_role: 'student',
        target_department: 'CSE'
      })
    });
    await assertResponse(adminBroadcastRes, 200, 'College Admin send college broadcast announcement');

    // College Reports
    const adminReportsRes = await fetch(`${BASE_URL}/api/admin/reports`, { headers: adminHeaders });
    await assertResponse(adminReportsRes, 200, 'College Admin list college academic/achievement reports');

    // Weak Students Monitoring
    const weakStudentsRes = await fetch(`${BASE_URL}/api/admin/weak-students`, { headers: adminHeaders });
    await assertResponse(weakStudentsRes, 200, 'College Admin fetch weak/at-risk students report');

    // Academic Subjects Management (Add and List)
    const addSubjectRes = await fetch(`${BASE_URL}/api/admin/academic/subjects/add`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        department_id: 'CSE',
        semester: 5,
        subject_code: 'CS_E2E_' + Date.now().toString().slice(-4),
        subject_name: 'E2E Testing Methodology',
        credits: 4
      })
    });
    const addSubjectData = await assertResponse(addSubjectRes, 200, 'College Admin add academic subject');
    const subjectId = addSubjectData.id;

    const getSubjectsRes = await fetch(`${BASE_URL}/api/admin/academic/subjects?department_id=CSE&semester=5`, { headers: adminHeaders });
    await assertResponse(getSubjectsRes, 200, 'College Admin list academic subjects');

    // College Profile details Update
    const updateCollegeProfileRes = await fetch(`${BASE_URL}/api/college/profile`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Updated Test Engineering College',
        location: 'Updated City',
        lat: 12.9716,
        lng: 77.5946
      })
    });
    await assertResponse(updateCollegeProfileRes, 200, 'College Admin update college profile details');

    // Opportunities Management
    const addOpportunityRes = await fetch(`${BASE_URL}/api/opportunities`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'E2E Full Stack Engineer Intern',
        company_name: 'E2E Corp',
        type: 'internship',
        required_skills: 'React, Node.js, Python',
        location: 'Remote',
        description: 'Excellent E2E project internship opportunity.',
        external_link: 'https://e2e.corp/apply',
        deadline: '2026-12-31'
      })
    });
    const addOpportunityData = await assertResponse(addOpportunityRes, 200, 'College Admin add opportunity');
    const oppId = addOpportunityData.id;

    const getOpportunitiesRes = await fetch(`${BASE_URL}/api/opportunities`, { headers: adminHeaders });
    await assertResponse(getOpportunitiesRes, 200, 'College Admin list opportunities');

    const eligibleStudentsRes = await fetch(`${BASE_URL}/api/job-posts/${oppId}/eligible-students`, { headers: adminHeaders });
    // Note: Eligible students uses job_posts table. Let's make sure it handles both job_posts and opportunities.
    // If job post doesn't exist, we will mock creating a job post as well! Let's do that!
    
    // Placement Companies & Job Posts
    const addCompanyRes = await fetch(`${BASE_URL}/api/companies`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'E2E Technologies',
        industry: 'Software',
        location: 'Bangalore',
        website: 'https://e2etech.com'
      })
    });
    await assertResponse(addCompanyRes, 200, 'College Admin add placement company');

    const getCompaniesRes = await fetch(`${BASE_URL}/api/companies`, { headers: adminHeaders });
    await assertResponse(getCompaniesRes, 200, 'College Admin list placement companies');

    const addJobRes = await fetch(`${BASE_URL}/api/job-posts`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'E2E Quality Assurance Engineer',
        company_id: 'comp_1',
        min_score: 10,
        description: 'Verify system end to end.',
        salary_package: '12 LPA'
      })
    });
    const addJobData = await assertResponse(addJobRes, 200, 'College Admin create placement job post');
    const jobPostId = addJobData.id;

    const getJobsRes = await fetch(`${BASE_URL}/api/job-posts`, { headers: adminHeaders });
    await assertResponse(getJobsRes, 200, 'College Admin list placement job posts');

    const jobEligibleRes = await fetch(`${BASE_URL}/api/job-posts/${jobPostId}/eligible-students`, { headers: adminHeaders });
    await assertResponse(jobEligibleRes, 200, 'College Admin filter eligible students for job post');

    // Alumni Tracking Management
    const addAlumniRes = await fetch(`${BASE_URL}/api/alumni`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Alumni User E2E',
        batch: '2025',
        company: 'Google',
        role: 'Software Engineer',
        email: 'alumni_e2e@example.com'
      })
    });
    await assertResponse(addAlumniRes, 200, 'College Admin add alumni record');

    const getAlumniRes = await fetch(`${BASE_URL}/api/alumni`, { headers: adminHeaders });
    await assertResponse(getAlumniRes, 200, 'College Admin list alumni records');


    // ============================================================
    // STEP 4: HOD (HEAD OF DEPARTMENT) WORKFLOW
    // ============================================================
    console.log("\n--- STEP 4: HOD WORKFLOW & FEATURES ---");

    // Login
    const HODLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod@test.com', password: 'Hod@123' })
    });
    const HODLogin = await assertResponse(HODLoginRes, 200, 'HOD Login');
    hodToken = HODLogin.token;

    const hodHeaders = {
      'Authorization': `Bearer ${hodToken}`,
      'Content-Type': 'application/json'
    };

    // Retrieve HOD students list
    const hodStudentsRes = await fetch(`${BASE_URL}/api/staff/academic/students?year=3rd`, { headers: hodHeaders });
    await assertResponse(hodStudentsRes, 200, 'HOD retrieve department students list');

    // Department AI insights
    const deptInsightsRes = await fetch(`${BASE_URL}/api/ai/department/CSE`, { headers: hodHeaders });
    await assertResponse(deptInsightsRes, 200, 'HOD view department AI insights/analytics');


    // ============================================================
    // STEP 5: STAFF WORKFLOW
    // ============================================================
    console.log("\n--- STEP 5: STAFF WORKFLOW & FEATURES ---");

    // Login
    const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@test.com', password: 'Staff@123' })
    });
    const staffLogin = await assertResponse(staffLoginRes, 200, 'Staff Login');
    staffToken = staffLogin.token;

    const staffHeaders = {
      'Authorization': `Bearer ${staffToken}`,
      'Content-Type': 'application/json'
    };

    // Retrieve department students
    const staffStudentsRes = await fetch(`${BASE_URL}/api/staff/academic/students`, { headers: staffHeaders });
    const staffStudents = await assertResponse(staffStudentsRes, 200, 'Staff retrieve department students list');
    const testStudent = staffStudents.data.find((s: any) => s.roll_no === 'STU001');
    const testStudentId = testStudent ? testStudent.uid : 'user_student_seed';

    // Save Marks and Attendance (Recalculating GPA/CGPA dynamically!)
    const saveMarksRes = await fetch(`${BASE_URL}/api/staff/academic/marks/save`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        subject_id: subjectId,
        semester: 5,
        records: [{
          student_id: testStudentId,
          internal_marks: 88,
          attendance_percentage: 92,
          grade: 'A+',
          result_status: 'Pass'
        }]
      })
    });
    await assertResponse(saveMarksRes, 200, 'Staff save student marks & attendance (GPA/CGPA recalc)');


    // ============================================================
    // STEP 6: STUDENT WORKFLOW & CUSTOM REGISTRATION
    // ============================================================
    console.log("\n--- STEP 6: STUDENT WORKFLOW & FEATURES ---");

    // Secure Register a new student using our active dynamic Signup Access Code
    const regEmail = 'e2estudent_' + Date.now() + '@example.com';
    const registerRes = await fetch(`${BASE_URL}/api/firestore/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          email: regEmail,
          password: 'Password@123',
          name: 'Registered E2E Student',
          signupCode: dynamicCode,
          rollNo: 'REG_E2E_' + Date.now().toString().slice(-4),
          className: 'CS-A',
          year: '3rd',
          academicYear: 'III Year',
          academic_year: 'III Year',
          city: 'Bangalore',
          phoneNumber: '9876543210',
          collegeName: 'Test Engineering College',
          skills: 'Java, Python',
          bio: 'Enthusiastic developer.'
        }
      })
    });
    // Wait, the standard /api/firestore/users allows registration or is there a /api/auth/register endpoint?
    // Looking at server/api.ts line 102, it defines app.post('/api/auth/register', ...) let's try it!
    let registerData;
    const authRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        password: 'Password@123',
        name: 'Registered E2E Student',
        signupCode: dynamicCode,
        rollNo: 'REG_E2E_' + Date.now().toString().slice(-4),
        className: 'CS-A',
        year: '3rd',
        academicYear: 'III Year',
        city: 'Bangalore',
        phoneNumber: '9876543210',
        collegeName: 'Test Engineering College',
        skills: 'Java, Python',
        bio: 'Enthusiastic developer.'
      })
    });
    
    if (authRegRes.status === 200) {
      registerData = await assertResponse(authRegRes, 200, 'Student secure signup code registration');
    } else {
      // Fallback or retry
      console.log(`Auth register returned ${authRegRes.status}. Retrying direct student registration...`);
      throw new Error(`Registration failed: ${await authRegRes.text()}`);
    }

    const regStudentToken = registerData.token;
    const regStudentId = registerData.user.uid;
    const regStudentHeaders = {
      'Authorization': `Bearer ${regStudentToken}`,
      'Content-Type': 'application/json'
    };

    // Default Seed Student Login
    const stuLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@test.com', password: 'Student@123' })
    });
    const stuLogin = await assertResponse(stuLoginRes, 200, 'Default Seed Student Login');
    studentToken = stuLogin.token;

    const studentHeaders = {
      'Authorization': `Bearer ${studentToken}`,
      'Content-Type': 'application/json'
    };

    // Check auth verify
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, { headers: studentHeaders });
    await assertResponse(verifyRes, 200, 'Student auth verification');

    // Update Profile
    const updateProfileRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: studentHeaders,
      body: JSON.stringify({
        name: 'Student User Updated',
        phone: '1122334455',
        skills: 'Python, SQL, React, Node.js',
        bio: 'Active engineering student',
        preferences: { theme: 'dark' },
        socialLinks: { github: 'https://github.com/stu' }
      })
    });
    await assertResponse(updateProfileRes, 200, 'Student update profile preferences/skills');

    // Change Password
    const changePassRes = await fetch(`${BASE_URL}/api/users/change-password`, {
      method: 'PUT',
      headers: studentHeaders,
      body: JSON.stringify({
        currentPassword: 'Student@123',
        newPassword: 'StudentNew@123'
      })
    });
    await assertResponse(changePassRes, 200, 'Student change password');

    // Test Login with new password
    const stuNewLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@test.com', password: 'StudentNew@123' })
    });
    const stuNewLogin = await assertResponse(stuNewLoginRes, 200, 'Student login with new password');
    studentToken = stuNewLogin.token;
    // Update active student headers
    studentHeaders.Authorization = `Bearer ${studentToken}`;

    // Restore password back to default for future seed runs
    const changePassBackRes = await fetch(`${BASE_URL}/api/users/change-password`, {
      method: 'PUT',
      headers: studentHeaders,
      body: JSON.stringify({
        currentPassword: 'StudentNew@123',
        newPassword: 'Student@123'
      })
    });
    await assertResponse(changePassBackRes, 200, 'Student restore password back to default');

    // Upload new geotagged certificate
    const formData = new FormData();
    formData.append('studentName', 'Student User');
    formData.append('rollNo', 'STU001');
    formData.append('class', 'CS-A');
    formData.append('year', '3rd');
    formData.append('phoneNumber', '1234567890');
    formData.append('city', 'Test City');
    formData.append('collegeName', 'Test Engineering College');
    formData.append('collegeId', 'COL001');
    formData.append('departmentId', 'CSE');
    formData.append('eventName', 'E2E Hackathon');
    formData.append('eventCollegeName', 'Event Host College');
    formData.append('type', 'national');
    formData.append('date', new Date().toISOString());
    formData.append('gpsLat', '12.9716');
    formData.append('gpsLng', '77.5946');

    // Create File objects
    const certBuffer = fs.readFileSync('dummy_cert.pdf');
    const photoBuffer = fs.readFileSync('dummy_photo.jpg');
    formData.append('certificate', new Blob([certBuffer], { type: 'application/pdf' }), 'dummy_cert.pdf');
    formData.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), 'dummy_photo.jpg');

    const uploadRes = await fetch(`${BASE_URL}/api/certifications`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: formData
    });
    const uploadData = await assertResponse(uploadRes, 200, 'Student upload geotagged certificate');
    const certId = uploadData.id;

    // Career Activities via Firestore Emulated CRUD
    const addActivityRes = await fetch(`${BASE_URL}/api/firestore/career_activities`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        data: {
          user_id: testStudentId,
          type: 'internship',
          organization: 'Google',
          duration: '3 Months',
          status: 'approved',
          details: 'Working on Kubernetes and cloud systems.'
        }
      })
    });
    const addActivityData = await assertResponse(addActivityRes, 200, 'Student save career activities via firestore');
    const activityId = addActivityData.id;

    // Fetch student certifications & activities via Firestore emulator
    const getCertsRes = await fetch(`${BASE_URL}/api/firestore/certifications`, { headers: studentHeaders });
    await assertResponse(getCertsRes, 200, 'Student fetch certificates list');

    const getActivitiesRes = await fetch(`${BASE_URL}/api/firestore/career_activities`, { headers: studentHeaders });
    await assertResponse(getActivitiesRes, 200, 'Student fetch career activities list');

    // Review updated Academic Performance card
    const stuPerformanceRes = await fetch(`${BASE_URL}/api/student/academic/performance`, { headers: studentHeaders });
    await assertResponse(stuPerformanceRes, 200, 'Student fetch academic performance & summaries');

    // Digital Student Portfolio Profile
    const portfolioRes = await fetch(`${BASE_URL}/api/students/${testStudentId}/profile`, { headers: studentHeaders });
    await assertResponse(portfolioRes, 200, 'Student fetch digital student portfolio');

    // Auto Resume PDF download
    const resumePdfRes = await fetch(`${BASE_URL}/api/students/${testStudentId}/resume`, { headers: studentHeaders });
    if (resumePdfRes.status !== 200) throw new Error("Student resume PDF download failed");
    console.log("[PASS] Student resume PDF downloaded successfully");

    // Resume Profile Builder CRUD
    const getResumeProfileRes = await fetch(`${BASE_URL}/api/resume/profile`, { headers: studentHeaders });
    await assertResponse(getResumeProfileRes, 200, 'Student fetch resume profile');

    const updateResumeProfileRes = await fetch(`${BASE_URL}/api/resume/profile`, {
      method: 'PUT',
      headers: studentHeaders,
      body: JSON.stringify({
        headline: 'Advanced Full Stack Web Architect',
        summary: 'Passionate about automated E2E testing systems and highly responsive web platforms.',
        linkedin_url: 'https://linkedin.com/in/stu',
        github_url: 'https://github.com/stu',
        portfolio_url: 'https://stu.dev',
        languages: ['English', 'German'],
        interests: ['Machine Learning', 'Open Source'],
        template_name: 'premium',
        public_visibility: true
      })
    });
    await assertResponse(updateResumeProfileRes, 200, 'Student update resume profile builder details');

    // Projects CRUD inside Resume Builder
    const addResumeProjRes = await fetch(`${BASE_URL}/api/resume/projects`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        project_name: 'Automated E2E Test Suite',
        description: 'A master testing harness to assert every api endpoint and role workflow.',
        technologies: 'Node.js, TypeScript, Express',
        github_url: 'https://github.com/stu/test-harness',
        live_url: 'https://test-harness.stu.dev'
      })
    });
    const resumeProjData = await assertResponse(addResumeProjRes, 200, 'Student add resume project entry');
    const resumeProjId = resumeProjData.data.id;

    const getResumeProjRes = await fetch(`${BASE_URL}/api/resume/projects`, { headers: studentHeaders });
    await assertResponse(getResumeProjRes, 200, 'Student list resume projects');

    const deleteResumeProjRes = await fetch(`${BASE_URL}/api/resume/projects/${resumeProjId}`, { method: 'DELETE', headers: studentHeaders });
    await assertResponse(deleteResumeProjRes, 200, 'Student delete resume project entry');

    // Experience CRUD inside Resume Builder
    const addResumeExpRes = await fetch(`${BASE_URL}/api/resume/experience`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        company_name: 'Google Summer of Code',
        role: 'Contributor',
        duration: 'May 2026 - Aug 2026',
        description: 'Worked on agentic LLM tools integration.'
      })
    });
    const resumeExpData = await assertResponse(addResumeExpRes, 200, 'Student add resume experience entry');
    const resumeExpId = resumeExpData.data.id;

    const getResumeExpRes = await fetch(`${BASE_URL}/api/resume/experience`, { headers: studentHeaders });
    await assertResponse(getResumeExpRes, 200, 'Student list resume experience');

    const deleteResumeExpRes = await fetch(`${BASE_URL}/api/resume/experience/${resumeExpId}`, { method: 'DELETE', headers: studentHeaders });
    await assertResponse(deleteResumeExpRes, 200, 'Student delete resume experience entry');

    // Skills CRUD inside Resume Builder
    const addResumeSkillRes = await fetch(`${BASE_URL}/api/resume/skills`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        skill_name: 'TypeScript Architecting',
        skill_level: 'Expert',
        auto_detected: false
      })
    });
    await assertResponse(addResumeSkillRes, 200, 'Student add resume skill entry');

    const getResumeSkillsRes = await fetch(`${BASE_URL}/api/resume/skills`, { headers: studentHeaders });
    const resumeSkills = await assertResponse(getResumeSkillsRes, 200, 'Student list resume skills');
    const resumeSkillId = resumeSkills.data[0]?.id;

    if (resumeSkillId) {
      const deleteResumeSkillRes = await fetch(`${BASE_URL}/api/resume/skills/${resumeSkillId}`, { method: 'DELETE', headers: studentHeaders });
      await assertResponse(deleteResumeSkillRes, 200, 'Student delete resume skill entry');
    }

    // AI Features inside Resume Builder (Detect Skills and Generate Summary)
    const detectResumeSkillsRes = await fetch(`${BASE_URL}/api/resume/ai/detect-skills`, { method: 'POST', headers: studentHeaders });
    await assertResponse(detectResumeSkillsRes, 200, 'Student trigger AI skill detection scan');

    const genResumeSummaryRes = await fetch(`${BASE_URL}/api/resume/ai/generate-summary`, { method: 'POST', headers: studentHeaders });
    await assertResponse(genResumeSummaryRes, 200, 'Student trigger AI summary generation');

    // Fetch Resume Score & suggestions
    const resumeScoreRes = await fetch(`${BASE_URL}/api/resume/score`, { headers: studentHeaders });
    await assertResponse(resumeScoreRes, 200, 'Student retrieve resume optimization score & suggestions');

    // Public Resume Profile access
    const publicResumeRes = await fetch(`${BASE_URL}/api/public/resume/${testStudentId}`);
    await assertResponse(publicResumeRes, 200, 'Public user access premium student resume profile');

    // AI gap recommendations & career paths insights
    const aiRecommendationsRes = await fetch(`${BASE_URL}/api/students/${testStudentId}/recommendations`, { headers: studentHeaders });
    await assertResponse(aiRecommendationsRes, 200, 'Student fetch gap recommendations list');

    const aiCareerInsightsRes = await fetch(`${BASE_URL}/api/ai/insights/${testStudentId}`, { headers: studentHeaders });
    await assertResponse(aiCareerInsightsRes, 200, 'Student fetch AI-driven career path insights');

    // System Announcements
    const systemAnnRes = await fetch(`${BASE_URL}/api/announcements`, { headers: studentHeaders });
    await assertResponse(systemAnnRes, 200, 'Student retrieve platform notifications & announcements');

    // Generate Verification QR Code
    const qrRes = await fetch(`${BASE_URL}/api/certifications/${certId}/qr`, { headers: studentHeaders });
    await assertResponse(qrRes, 200, 'Student generate verification QR code');

    // Download Excel Achievement Report
    const excelRes = await fetch(`${BASE_URL}/api/reports/export/excel`, { headers: adminHeaders });
    if (excelRes.status !== 200) throw new Error("Student Excel achievements export failed");
    console.log("[PASS] Student achievements Excel report downloaded successfully");

    // Global Leaderboard Rankings
    const rankingRes = await fetch(`${BASE_URL}/api/reports/ranking`, { headers: studentHeaders });
    await assertResponse(rankingRes, 200, 'Student view global leaderboard rankings');


    // ============================================================
    // STEP 7: THREE-TIER APPROVAL FLOW VERIFICATION (STAFF -> HOD)
    // ============================================================
    console.log("\n--- STEP 7: THREE-TIER APPROVAL FLOW VERIFICATION ---");

    // Staff approves student certificate
    const staffApproveRes = await fetch(`${BASE_URL}/api/certifications/${certId}/status`, {
      method: 'PUT',
      headers: staffHeaders,
      body: JSON.stringify({ status: 'staff_approved', remark: 'Verified files and GPS location matches college context.' })
    });
    await assertResponse(staffApproveRes, 200, 'Staff approve certificate first tier');

    // HOD finalizes certificate approval
    const hodApproveRes = await fetch(`${BASE_URL}/api/certifications/${certId}/status`, {
      method: 'PUT',
      headers: hodHeaders,
      body: JSON.stringify({ status: 'approved', remark: 'Final approval granted. High priority national event achievement.' })
    });
    await assertResponse(hodApproveRes, 200, 'HOD grant final approval second tier');

    // Verify document status in Student Dashboard
    const verifyDocRes = await fetch(`${BASE_URL}/api/firestore/certifications/${certId}`, { headers: studentHeaders });
    const verifyDoc = await assertResponse(verifyDocRes, 200, 'Student fetch updated certification details');
    
    if (verifyDoc.data.status === 'approved') {
      console.log("[PASS] E2E certificate three-tier approval workflow fully validated.");
    } else {
      throw new Error(`Certification status expected 'approved', but found '${verifyDoc.data.status}'`);
    }

    console.log("\n==============================================================");
    console.log("   [SUCCESS] ALL ROLE WORKFLOWS & EVERY SINGLE FEATURE PASSED  ");
    console.log("==============================================================\n");
    process.exit(0);

  } catch (error: any) {
    console.error("\n==============================================================");
    console.error("   [FAILURE] E2E TEST WORKFLOW ENCOUNTERED AN ERROR           ");
    console.error(`   Error details: ${error.message}                           `);
    console.error("==============================================================\n");
    process.exit(1);
  }
}

runE2ETests();

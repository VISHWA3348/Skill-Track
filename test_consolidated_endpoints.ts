import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

async function assertResponse(response: Response, context: string = '') {
  const start = Date.now();
  const text = await response.text();
  const duration = Date.now() - start;
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Not JSON
  }

  if (response.status !== 200) {
    console.error(`❌ [FAIL] ${context}. Expected 200, got ${response.status}. Response: ${text}`);
    throw new Error(`Assertion failed: ${context}`);
  }

  if (json.success === false) {
    console.error(`❌ [FAIL] ${context}. Success is false. Response: ${text}`);
    throw new Error(`Assertion failed: ${context}`);
  }

  console.log(`✅ [PASS] ${context} (${duration}ms)`);
  return json;
}

async function runTests() {
  console.log("==============================================================");
  console.log("   VERIFYING CONSOLIDATED & OPTIMIZED SCALABILITY ENDPOINTS   ");
  console.log("==============================================================\n");

  try {
    // 1. Seed database
    console.log("--- Seeding Database ---");
    const seedRes = await fetch(`${BASE_URL}/api/seed-users`, { method: 'POST' });
    await assertResponse(seedRes, 'Database seeding');

    // 2. Student Authentication & Dashboard Overview Test
    console.log("\n--- Student Role Tests ---");
    const studentLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@test.com', password: 'Student@123' })
    });
    const { token: studentToken } = await assertResponse(studentLogin, 'Student Login');
    const studentHeaders = { 'Authorization': `Bearer ${studentToken}` };

    const studentDashboard = await fetch(`${BASE_URL}/api/student/dashboard-overview`, { headers: studentHeaders });
    const studentData = await assertResponse(studentDashboard, 'GET /api/student/dashboard-overview');
    
    // Assert student data structure
    if (!studentData.data.stats || !studentData.data.opportunities || !studentData.data.academicProfile || !studentData.data.notifications || !studentData.data.academicPerformance) {
      throw new Error("Student dashboard response missing required keys.");
    }
    console.log("   👉 Student stats:", JSON.stringify(studentData.data.stats));
    console.log("   👉 Opportunities count:", studentData.data.opportunities.length);
    console.log("   👉 Notifications count:", studentData.data.notifications.length);

    // Resume Profile Test
    const studentResume = await fetch(`${BASE_URL}/api/resume/full-profile`, { headers: studentHeaders });
    const resumeData = await assertResponse(studentResume, 'GET /api/resume/full-profile');
    if (!resumeData.data.profile || !resumeData.data.projects || !resumeData.data.experience || !resumeData.data.skills || !resumeData.data.scoreInfo) {
      throw new Error("Resume profile response missing required keys.");
    }
    console.log("   👉 Resume Score Info:", JSON.stringify(resumeData.data.scoreInfo));

    // 3. Staff Authentication & Dashboard Overview Test
    console.log("\n--- Staff Role Tests ---");
    const staffLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@test.com', password: 'Staff@123' })
    });
    const { token: staffToken } = await assertResponse(staffLogin, 'Staff Login');
    const staffHeaders = { 'Authorization': `Bearer ${staffToken}` };

    const staffDashboard = await fetch(`${BASE_URL}/api/staff/dashboard-overview`, { headers: staffHeaders });
    const staffData = await assertResponse(staffDashboard, 'GET /api/staff/dashboard-overview');
    if (!staffData.data.stats || !staffData.data.students || !staffData.data.analytics) {
      throw new Error("Staff dashboard response missing required keys.");
    }
    console.log("   👉 Staff stats:", JSON.stringify(staffData.data.stats));
    console.log("   👉 Staff students count:", staffData.data.students.length);

    // 4. HOD Authentication & Query Optimization Test
    console.log("\n--- HOD Role Tests ---");
    const HODLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod@test.com', password: 'Hod@123' })
    });
    const { token: hodToken } = await assertResponse(HODLogin, 'HOD Login');
    const hodHeaders = { 'Authorization': `Bearer ${hodToken}`, 'Content-Type': 'application/json' };

    // Optimized HOD student list test
    const hodStudents = await fetch(`${BASE_URL}/api/hod/students`, { headers: hodHeaders });
    const hodStudentsData = await assertResponse(hodStudents, 'GET /api/hod/students (Optimized LEFT JOIN)');
    console.log("   👉 HOD student list length:", hodStudentsData.data.length);
    if (hodStudentsData.data.length > 0) {
      const firstStudent = hodStudentsData.data[0];
      console.log(`   👉 First student certsCount: ${firstStudent.certsCount}, activitiesCount: ${firstStudent.activitiesCount}`);
      if (firstStudent.certsCount === undefined || firstStudent.activitiesCount === undefined) {
        throw new Error("HOD students count enrichment failed.");
      }
    }

    // Optimized Staff Performance list test
    const staffPerf = await fetch(`${BASE_URL}/api/hod/staff-performance`, { headers: hodHeaders });
    const staffPerfData = await assertResponse(staffPerf, 'GET /api/hod/staff-performance (Loop-extracted)');
    console.log("   👉 Staff performance entries count:", staffPerfData.data.length);

    // Broadcast Announcement Offloading test
    console.log("\n--- HOD Announcement Background Job Offloading Test ---");
    const announceRes = await fetch(`${BASE_URL}/api/hod/announcements/send`, {
      method: 'POST',
      headers: hodHeaders,
      body: JSON.stringify({
        title: 'Important Exam Notice',
        message: 'Please register for upcoming examinations.',
        target_year: '3rd',
        target_section: 'A'
      })
    });
    const announceData = await assertResponse(announceRes, 'POST /api/hod/announcements/send (Enqueued)');
    console.log("   👉 Response message:", announceData.message);

    // 5. Ranking list query optimization test
    console.log("\n--- Leaderboard Ranking Optimization Test ---");
    const rankingRes = await fetch(`${BASE_URL}/api/reports/ranking`, { headers: studentHeaders });
    const rankingData = await assertResponse(rankingRes, 'GET /api/reports/ranking (Optimized memory group)');
    console.log("   👉 Leaderboard students count:", rankingData.data.length);

    console.log("\n==============================================================");
    console.log("   🎉 ALL CONSOLIDATED & OPTIMIZED API VERIFICATIONS PASSED   ");
    console.log("==============================================================\n");
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ Test execution failed:", error.message);
    process.exit(1);
  }
}

runTests();

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
  console.log("    🚀 ACADEMIC CALENDAR & SEMESTER PROMOTION ENGINE TESTS    ");
  console.log("==============================================================");

  try {
    // 1. Clean up and Seed database for testing
    console.log("\n--- PREPARING DATABASE SEEDS ---");
    
    // Clear previous runs
    db.prepare("DELETE FROM student_promotions WHERE student_id IN (SELECT user_id FROM students WHERE roll_no = 'PROMO_ROLL_999')").run();
    db.prepare("DELETE FROM students WHERE roll_no = 'PROMO_ROLL_999'").run();
    db.prepare("DELETE FROM users WHERE roll_no = 'PROMO_ROLL_999'").run();
    db.prepare("DELETE FROM academic_calendar WHERE college_id = 'COL_PROMO_TEST'").run();
    db.prepare("DELETE FROM department_invite_codes WHERE college_id = 'COL_PROMO_TEST' OR code = 'CAMP-PROMO-E2E'").run();
    db.prepare("DELETE FROM departments WHERE college_id = 'COL_PROMO_TEST'").run();
    db.prepare("DELETE FROM colleges WHERE id = 'COL_PROMO_TEST'").run();

    // Seed test college with duration = 4 years
    setDocument('colleges', 'COL_PROMO_TEST', {
      id: 'COL_PROMO_TEST',
      name: 'Promo Test Engineering College',
      location: 'Test City',
      college_duration_years: 4,
      collegeDurationYears: 4,
      createdAt: new Date().toISOString()
    });

    // Seed department and signup invite code
    setDocument('departments', 'CSE_PROMO', { id: 'CSE_PROMO', collegeId: 'COL_PROMO_TEST', name: 'Computer Science & Engineering' });
    
    db.prepare(`
      INSERT INTO department_invite_codes (id, code, college_id, department_id, is_active, max_registrations, current_registrations, created_by, academic_year)
      VALUES ('inv_promo_e2e', 'CAMP-PROMO-E2E', 'COL_PROMO_TEST', 'CSE_PROMO', 1, -1, 0, 'system', '2025-2029')
    `).run();

    // Map the standard test admin 'admin@test.com' to COL_PROMO_TEST
    db.prepare("UPDATE users SET college_id = 'COL_PROMO_TEST' WHERE email = 'admin@test.com'").run();
    db.prepare("UPDATE college_admins SET college_id = 'COL_PROMO_TEST' WHERE email = 'admin@test.com'").run();

    console.log("Test college, department, invite codes, and admin mappings initialized.");

    // 2. Login College Admin
    console.log("\n--- TEST: LOGIN COLLEGE ADMIN ---");
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'Admin@123' })
    });
    const adminLogin = await assertResponse(adminLoginRes, 200, 'College Admin Login');
    const adminToken = adminLogin.token;

    // 3. Register Student: Starts in Semester 1
    console.log("\n--- TEST: REGISTER STUDENT IN SEMESTER 1 ---");
    const studentEmail = `student_promo_${Date.now()}@test.com`;
    const signupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        password: 'Password@123',
        name: 'Promo Student',
        role: 'student',
        class: 'B.Tech',
        academicYear: '2025-2029',
        signupCode: 'CAMP-PROMO-E2E',
        inviteCode: 'CAMP-PROMO-E2E',
        rollNo: 'PROMO_ROLL_999',
        semester: 1 // Start at Semester 1
      })
    });
    const signupData = await assertResponse(signupRes, 200, 'Student signup');
    const studentId = signupData.user.uid;

    // Verify student initial state: Sem 1, Yr 1 (default calculated since Math.ceil(1/2) = 1)
    let studentObj = db.prepare("SELECT * FROM students WHERE user_id = ?").get(studentId) as any;
    if (studentObj && studentObj.current_semester === 1) {
      console.log(`[PASS] Student registered in Semester 1 correctly`);
    } else {
      throw new Error(`Student registration semester check failed: ${JSON.stringify(studentObj)}`);
    }

    // 4. Generate Calendar Semesters (should generate 8 semesters for 4-year duration)
    console.log("\n--- TEST: AUTO GENERATE CALENDAR SEMESTERS ---");
    const genRes = await fetch(`${BASE_URL}/api/admin/academic-calendar/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    await assertResponse(genRes, 200, 'Generate 8 semesters for 4-year program');

    const calendarCount = db.prepare("SELECT COUNT(*) as count FROM academic_calendar WHERE college_id = 'COL_PROMO_TEST'").get() as any;
    if (calendarCount && Number(calendarCount.count) === 8) {
      console.log(`[PASS] Successfully auto-generated 8 semesters`);
    } else {
      throw new Error(`Expected 8 semesters, found: ${calendarCount?.count}`);
    }

    // 5. Configure Semester 1 end date in the past
    console.log("\n--- TEST: SET SEMESTER 1 END DATE IN PAST & TRIGGER AUTO PROMOTION ENGINE ---");
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(); // 5 days ago
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days future

    // Update Semester 1 to end in the past
    db.prepare(`
      UPDATE academic_calendar 
      SET semester_end_date = ?, status = 'active'
      WHERE id = 'cal_COL_PROMO_TEST_sem_1'
    `).run(pastDate);

    // Update other semesters to end in the future
    db.prepare(`
      UPDATE academic_calendar 
      SET semester_end_date = ?, status = 'scheduled'
      WHERE college_id = 'COL_PROMO_TEST' AND semester > 1
    `).run(futureDate);

    // Call test route to run promotion engine
    const triggerRes1 = await fetch(`${BASE_URL}/api/admin/promote/trigger-auto-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const triggerResult1 = await assertResponse(triggerRes1, 200, 'Trigger promotion engine for Semester 1');
    console.log(`Engine results:`, triggerResult1.data);

    // Verify student is promoted to Semester 2 (still Year 1)
    studentObj = db.prepare("SELECT * FROM students WHERE user_id = ?").get(studentId) as any;
    if (studentObj && studentObj.current_semester === 2 && studentObj.current_year === 1) {
      console.log(`[PASS] Student promoted to Semester 2, Year 1`);
    } else {
      throw new Error(`Auto promotion to Sem 2, Year 1 failed. Found: ${JSON.stringify(studentObj)}`);
    }

    // Verify calendar entry is marked completed
    const calEntry1 = db.prepare("SELECT * FROM academic_calendar WHERE id = 'cal_COL_PROMO_TEST_sem_1'").get() as any;
    if (calEntry1 && calEntry1.status === 'completed' && calEntry1.promotion_date !== null) {
      console.log(`[PASS] Semester 1 calendar status updated to 'completed' and marked with promotion date.`);
    } else {
      throw new Error(`Calendar Semester 1 was not updated correctly: ${JSON.stringify(calEntry1)}`);
    }

    // Verify promotion log is stored
    let promoLogs = db.prepare("SELECT * FROM student_promotions WHERE student_id = ?").all(studentId) as any[];
    if (promoLogs.length === 1 && promoLogs[0].old_semester === 1 && promoLogs[0].new_semester === 2) {
      console.log(`[PASS] Student promotion log saved successfully.`);
    } else {
      throw new Error(`Promotion history log missing or incorrect: ${JSON.stringify(promoLogs)}`);
    }

    // 6. Configure Semester 2 end date in the past
    console.log("\n--- TEST: SET SEMESTER 2 END DATE IN PAST & TRIGGER AUTO PROMOTION ENGINE ---");
    
    // Set Semester 2 status = active and end date in the past
    db.prepare(`
      UPDATE academic_calendar 
      SET semester_end_date = ?, status = 'active'
      WHERE id = 'cal_COL_PROMO_TEST_sem_2'
    `).run(pastDate);

    // Trigger promotion engine
    const triggerRes2 = await fetch(`${BASE_URL}/api/admin/promote/trigger-auto-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    await assertResponse(triggerRes2, 200, 'Trigger promotion engine for Semester 2');

    // Verify student is promoted to Semester 3 and Year 2 (since Math.ceil(3/2) = 2)
    studentObj = db.prepare("SELECT * FROM students WHERE user_id = ?").get(studentId) as any;
    if (studentObj && studentObj.current_semester === 3 && studentObj.current_year === 2) {
      console.log(`[PASS] Student promoted to Semester 3, Year 2 successfully`);
    } else {
      throw new Error(`Auto promotion to Sem 3, Year 2 failed. Found: ${JSON.stringify(studentObj)}`);
    }

    // Verify logs
    promoLogs = db.prepare("SELECT * FROM student_promotions WHERE student_id = ? ORDER BY promotion_date DESC").all(studentId) as any[];
    if (promoLogs.length === 2 && promoLogs[0].old_semester === 2 && promoLogs[0].new_semester === 3 && promoLogs[0].new_year === 2) {
      console.log(`[PASS] Second student promotion log saved successfully.`);
    } else {
      throw new Error(`Promotion history log missing or incorrect: ${JSON.stringify(promoLogs)}`);
    }

    // 7. Manual Rollback (verify they return to Semester 2, Year 1)
    console.log("\n--- TEST: MANUAL ROLLBACK ---");
    const rollbackRes = await fetch(`${BASE_URL}/api/admin/promote/rollback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ studentId })
    });
    await assertResponse(rollbackRes, 200, 'Roll back last promotion');

    // Verify student is reverted back to Sem 2, Yr 1
    studentObj = db.prepare("SELECT * FROM students WHERE user_id = ?").get(studentId) as any;
    if (studentObj && studentObj.current_semester === 2 && studentObj.current_year === 1) {
      console.log(`[PASS] Student successfully rolled back to Semester 2, Year 1`);
    } else {
      throw new Error(`Rollback failed. Found student state: ${JSON.stringify(studentObj)}`);
    }

    // Verify last log was removed
    promoLogs = db.prepare("SELECT * FROM student_promotions WHERE student_id = ?").all(studentId) as any[];
    if (promoLogs.length === 1) {
      console.log(`[PASS] Rollback removed the latest log correctly`);
    } else {
      throw new Error(`Expected 1 promotion log, found: ${promoLogs.length}`);
    }

    // 8. Manual Promotion Override
    console.log("\n--- TEST: MANUAL PROMOTION OVERRIDE ---");
    const manualPromoteRes = await fetch(`${BASE_URL}/api/admin/promote/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ studentId })
    });
    await assertResponse(manualPromoteRes, 200, 'Manually promote student');

    // Verify student is back to Sem 3, Yr 2
    studentObj = db.prepare("SELECT * FROM students WHERE user_id = ?").get(studentId) as any;
    if (studentObj && studentObj.current_semester === 3 && studentObj.current_year === 2) {
      console.log(`[PASS] Student manually promoted to Semester 3, Year 2`);
    } else {
      throw new Error(`Manual promotion failed. Found: ${JSON.stringify(studentObj)}`);
    }

    // Verify log is created with manual trigger source
    promoLogs = db.prepare("SELECT * FROM student_promotions WHERE student_id = ? ORDER BY promotion_date DESC").all(studentId) as any[];
    if (promoLogs.length === 2 && promoLogs[0].triggered_by !== 'auto_engine') {
      console.log(`[PASS] Manual promotion log recorded with triggered_by = ${promoLogs[0].triggered_by}`);
    } else {
      throw new Error(`Manual promotion log check failed: ${JSON.stringify(promoLogs)}`);
    }

    // 9. Verify GET promote/history endpoint
    console.log("\n--- TEST: GET PROMOTION HISTORY LIST ---");
    const historyListRes = await fetch(`${BASE_URL}/api/admin/promote/history`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const historyListData = await assertResponse(historyListRes, 200, 'Get promotion history list');
    if (historyListData.data && historyListData.data.length >= 2) {
      console.log(`[PASS] Retrieved ${historyListData.data.length} history records successfully`);
    } else {
      throw new Error(`Expected at least 2 history records, got: ${JSON.stringify(historyListData)}`);
    }

    console.log("\n==============================================================");
    console.log("   🎉 ALL CALENDAR & PROMOTION TESTS PASSED SUCCESSFULLY 🎉   ");
    console.log("==============================================================");

  } catch (err: any) {
    console.error("\n❌ PROMOTION VERIFICATION TEST FAILED:", err.message);
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
});

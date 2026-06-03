import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TABLES_TO_TRUNCATE = [
  "academic_subjects",
  "ai_analytics_summary",
  "ai_career_insights",
  "alumni",
  "announcements",
  "audit_logs",
  "career_activities",
  "certifications",
  "college_announcements",
  "college_reports",
  "colleges",
  "companies",
  "department_invite_codes",
  "department_monthly_reports",
  "department_performance",
  "departments",
  "documents",
  "fraud_detection_logs",
  "hod_department_announcements",
  "hod_student_flags",
  "job_posts",
  "notifications",
  "opportunities",
  "platform_backups",
  "resume_experience",
  "resume_profiles",
  "resume_projects",
  "resume_skills",
  "security_events",
  "signup_codes",
  "staff_student_remarks",
  "student_academic_profile",
  "student_academic_records",
  "student_attendance",
  "student_cgpa_summary",
  "student_goals",
  "student_notifications",
  "student_performance_logs",
  "student_resume_data",
  "student_semester_summary",
  "student_skills",
  "students",
  "system_health_logs"
];

const PRESERVED_TABLES = [
  "settings",
  "permissions"
];

async function getRowCounts(client: any): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  // All tables
  const allTables = [...TABLES_TO_TRUNCATE, ...PRESERVED_TABLES, "users"];
  for (const table of allTables) {
    try {
      const res = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      counts[table] = parseInt(res.rows[0].cnt, 10);
    } catch (err) {
      counts[table] = -1; // Indicates table didn't exist or had query error
    }
  }
  return counts;
}

async function main() {
  console.log("🚀 Starting Skill Track Production Database Cleanup...");
  
  const client = await pool.connect();
  try {
    // --- Pre-flight Check ---
    console.log("🔍 Running pre-flight check...");
    const checkUser = await client.query(`SELECT * FROM users WHERE email = 'zinointech@gmail.com'`);
    if (checkUser.rows.length === 0) {
      console.error("❌ CRITICAL ERROR: Protected user 'zinointech@gmail.com' was not found in the 'users' table.");
      console.error("⛔ Aborting cleanup execution to protect database integrity.");
      process.exit(1);
    }
    const protectedUser = checkUser.rows[0];
    console.log(`✅ Pre-flight check passed. Protected User exists: email=${protectedUser.email}, role=${protectedUser.role}, status=${protectedUser.status}`);

    // --- Row counts before cleanup ---
    console.log("\n📊 Gathering row counts before cleanup...");
    const countsBefore = await getRowCounts(client);
    
    // --- Execute Cleanup ---
    console.log("\n🗑️ Executing database purges...");
    
    // Disable replication triggers/foreign key checks during bulk truncation
    await client.query("SET session_replication_role = 'replica'");
    await client.query("BEGIN");

    // 1. Purge all test users except zinointech@gmail.com
    console.log("- Cleaning 'users' table...");
    const userDeleteRes = await client.query(`DELETE FROM users WHERE email != 'zinointech@gmail.com'`);
    console.log(`  Deleted ${userDeleteRes.rowCount} test/seed/demo users.`);

    // 2. Truncate all target tables
    for (const table of TABLES_TO_TRUNCATE) {
      if (countsBefore[table] > 0) {
        console.log(`- Truncating table '${table}' (${countsBefore[table]} rows)...`);
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } else {
        // Run truncate anyway to ensure it is clean
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }
    }

    await client.query("COMMIT");
    await client.query("SET session_replication_role = 'origin'");
    console.log("✨ All purges completed successfully.");

    // --- Post-Cleanup Verification ---
    console.log("\n🔍 Running post-cleanup validation checks...");
    
    // Verify protected user still exists
    const checkUserPost = await client.query(`SELECT * FROM users WHERE email = 'zinointech@gmail.com'`);
    if (checkUserPost.rows.length === 0) {
      throw new Error("Protected user 'zinointech@gmail.com' was deleted during the cleanup process!");
    }
    console.log("✓ Verified: Protected user 'zinointech@gmail.com' still exists.");

    // Row counts after cleanup
    const countsAfter = await getRowCounts(client);
    
    // Verification checks
    let integrityPassed = true;
    
    console.log("\n==================================================");
    console.log("            CLEANUP REPORT SUMMARY");
    console.log("==================================================");
    console.log(
      String("Table").padEnd(30) + 
      String("Before").padStart(10) + 
      String("After").padStart(10) + 
      String("Status").padStart(12)
    );
    console.log("-".repeat(62));

    // Users
    console.log(
      "users".padEnd(30) + 
      String(countsBefore["users"]).padStart(10) + 
      String(countsAfter["users"]).padStart(10) + 
      (countsAfter["users"] === 1 ? "✓ Preserved" : "❌ FAILED").padStart(12)
    );
    if (countsAfter["users"] !== 1) integrityPassed = false;

    // Preserved Tables
    for (const table of PRESERVED_TABLES) {
      const match = countsBefore[table] === countsAfter[table];
      console.log(
        table.padEnd(30) + 
        String(countsBefore[table]).padStart(10) + 
        String(countsAfter[table]).padStart(10) + 
        (match ? "✓ Preserved" : "❌ Modified").padStart(12)
      );
      if (!match) integrityPassed = false;
    }

    // Truncated Tables
    for (const table of TABLES_TO_TRUNCATE) {
      if (countsAfter[table] === -1) continue; // Skip non-existent tables if any
      const isHealthLog = table === "system_health_logs";
      const match = isHealthLog ? (countsAfter[table] <= 2) : (countsAfter[table] === 0);
      const statusText = match ? (isHealthLog && countsAfter[table] > 0 ? "✓ Cleared (Active)" : "✓ Cleared") : "❌ FAILED";
      console.log(
        table.padEnd(30) + 
        String(countsBefore[table]).padStart(10) + 
        String(countsAfter[table]).padStart(10) + 
        statusText.padStart(12)
      );
      if (!match) integrityPassed = false;
    }

    console.log("=".repeat(62));
    
    if (integrityPassed) {
      console.log("🎉 DATABASE INTEGRITY VERIFIED: SUCCESS");
    } else {
      console.error("❌ DATABASE INTEGRITY CHECK: FAILED");
      process.exit(2);
    }

  } catch (error) {
    console.error("❌ Cleanup encountered a fatal database error:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

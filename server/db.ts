import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

// Ensure DB directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(path.join(dbDir, 'certtrack.db'));

export function initDb() {
  // Enable Foreign Keys and WAL Mode
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT DEFAULT 'student',
      college_id TEXT,
      department_id TEXT,
      roll_no TEXT,
      class TEXT,
      year TEXT,
      section TEXT,
      city TEXT,
      phone_number TEXT,
      profile_photo TEXT,
      college_name TEXT,
      skills TEXT,
      bio TEXT,
      is_active INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      login_attempts INTEGER DEFAULT 0,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 1.1 Students Table (Extended profile for students)
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      user_id TEXT PRIMARY KEY,
      roll_no TEXT UNIQUE,
      class TEXT,
      year TEXT,
      section TEXT,
      department_id TEXT,
      college_id TEXT,
      enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 2. Colleges Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS colleges (
      id TEXT PRIMARY KEY,
      college_id TEXT UNIQUE,
      name TEXT NOT NULL,
      type TEXT,
      location TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      pincode TEXT,
      lat REAL,
      lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Departments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      department_id TEXT UNIQUE,
      college_id TEXT,
      name TEXT NOT NULL,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
    );
  `);

  // 4. Certifications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS certifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      student_name TEXT,
      roll_no TEXT,
      class TEXT,
      year TEXT,
      phone_number TEXT,
      city TEXT,
      college_name TEXT,
      college_id TEXT,
      department_id TEXT,
      event_name TEXT,
      event_college_name TEXT,
      event_location TEXT,
      date DATETIME,
      type TEXT,
      file_url TEXT,
      photo_url TEXT,
      gps_lat REAL,
      gps_lng REAL,
      prize_position TEXT,
      custom_prize_position TEXT,
      prize_type TEXT,
      cash_prize_amount REAL,
      prize_description TEXT,
      gps_photo_url TEXT,
      gps_photo_lat REAL,
      gps_photo_lng REAL,
      gps_photo_timestamp DATETIME,
      gps_verified INTEGER DEFAULT 0,
      fraud_flag INTEGER DEFAULT 0,
      fraud_reason TEXT,
      file_hash TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT, -- JSON array
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL
    );
  `);

  // 5. Career Activities Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS career_activities (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      user_id TEXT,
      college_id TEXT,
      department_id TEXT,
      type TEXT,
      organization TEXT,
      duration TEXT,
      details TEXT,
      status TEXT DEFAULT 'pending',
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 6. Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT,
      details TEXT,
      college_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Notifications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      message TEXT,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 8. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT, -- JSON
      category TEXT,
      description TEXT
    );
  `);

  // 9. Permissions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      role TEXT,
      module TEXT,
      action TEXT,
      allowed INTEGER DEFAULT 1
    );
  `);

  // 10. Companies Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      website TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Job Posts Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_posts (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      requirements TEXT,
      min_score REAL DEFAULT 0,
      salary_range TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // 12. Announcements Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_role TEXT DEFAULT 'all',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 13. Student Academic Profile Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_academic_profile (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT,
      roll_no TEXT,
      register_no TEXT,
      department TEXT,
      department_id TEXT,
      class TEXT,
      section TEXT,
      year TEXT,
      semester TEXT,
      college_id TEXT,
      college_name TEXT,
      cgpa REAL DEFAULT 0,
      percentage REAL DEFAULT 0,
      total_subjects INTEGER DEFAULT 0,
      arrears INTEGER DEFAULT 0,
      attendance_percentage REAL DEFAULT 0,
      placement_readiness_score REAL DEFAULT 0,
      internship_count INTEGER DEFAULT 0,
      workshop_count INTEGER DEFAULT 0,
      seminar_count INTEGER DEFAULT 0,
      certification_count INTEGER DEFAULT 0,
      github_url TEXT,
      linkedin_url TEXT,
      portfolio_url TEXT,
      resume_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 14. Student Skills Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_skills (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      skill_level TEXT, -- beginner, intermediate, expert
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 15. Student Goals Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_goals (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      goal_title TEXT NOT NULL,
      goal_description TEXT,
      target_date DATETIME,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 16. Student Notifications Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_notifications (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 17. Student Resume Data Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_resume_data (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      objective TEXT,
      projects TEXT, -- JSON string
      achievements TEXT, -- JSON string
      certifications TEXT, -- JSON string
      experience TEXT, -- JSON string
      languages TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 18. Alumni Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS alumni (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      company TEXT,
      role TEXT,
      salary TEXT,
      graduation_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 15. Opportunities Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      type TEXT NOT NULL,
      required_skills TEXT,
      location TEXT,
      description TEXT,
      external_link TEXT,
      deadline DATETIME,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 16. Staff Student Remarks Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_student_remarks (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      remark_type TEXT NOT NULL, -- academic, behavior, achievement
      remark TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 17. Student Attendance Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      department_id TEXT,
      class TEXT,
      semester TEXT,
      attendance_percentage REAL DEFAULT 0,
      month TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 18. Student Performance Logs Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_performance_logs (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      cgpa REAL,
      arrears INTEGER,
      placement_score REAL,
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 19. HOD Department Announcements [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS hod_department_announcements (
      id TEXT PRIMARY KEY,
      hod_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_year TEXT,
      target_section TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hod_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 20. HOD Student Flags [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS hod_student_flags (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      flagged_by TEXT NOT NULL,
      flag_type TEXT NOT NULL,
      reason TEXT,
      severity TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE,
      FOREIGN KEY (flagged_by) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 21. Department Monthly Reports [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS department_monthly_reports (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      month TEXT NOT NULL,
      avg_cgpa REAL DEFAULT 0,
      placement_score REAL DEFAULT 0,
      certificate_count INTEGER DEFAULT 0,
      activity_count INTEGER DEFAULT 0,
      arrear_count INTEGER DEFAULT 0,
      attendance_avg REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 22. College Announcements [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS college_announcements (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_role TEXT DEFAULT 'all',
      target_department TEXT,
      target_year TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 23. College Reports [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS college_reports (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      report_data TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (generated_by) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 24. Department Performance [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS department_performance (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      avg_cgpa REAL DEFAULT 0,
      total_certificates INTEGER DEFAULT 0,
      total_activities INTEGER DEFAULT 0,
      placement_score REAL DEFAULT 0,
      arrear_count INTEGER DEFAULT 0,
      attendance_avg REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );
  `);

  // 25. System Health Logs [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_health_logs (
      id TEXT PRIMARY KEY,
      cpu_usage REAL,
      ram_usage REAL,
      storage_usage REAL,
      active_sessions INTEGER,
      db_size REAL,
      api_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 26. Security Events [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      event_type TEXT,
      user_id TEXT,
      ip_address TEXT,
      description TEXT,
      severity TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 27. Platform Backups [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_backups (
      id TEXT PRIMARY KEY,
      backup_name TEXT,
      backup_size INTEGER,
      backup_path TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 28. Fraud Detection Logs [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS fraud_detection_logs (
      id TEXT PRIMARY KEY,
      certificate_id TEXT,
      student_id TEXT,
      fraud_type TEXT,
      confidence_score REAL,
      status TEXT DEFAULT 'flagged',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 29. Academic Subjects Master [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS academic_subjects (
      id TEXT PRIMARY KEY,
      college_id TEXT,
      department_id TEXT,
      semester INTEGER,
      subject_code TEXT,
      subject_name TEXT,
      credits INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 30. Student Academic Records [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_academic_records (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      subject_id TEXT,
      semester INTEGER,
      internal_marks REAL,
      attendance_percentage REAL,
      grade TEXT,
      grade_point INTEGER,
      result_status TEXT, -- Pass, Fail, Arrear
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES academic_subjects(id) ON DELETE CASCADE
    );
  `);

  // 31. Student Semester Summary [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_semester_summary (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      semester INTEGER,
      semester_gpa REAL,
      attendance_avg REAL,
      arrear_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, semester),
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 32. Student CGPA Summary [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_cgpa_summary (
      id TEXT PRIMARY KEY,
      student_id TEXT UNIQUE,
      cgpa REAL DEFAULT 0,
      total_arrears INTEGER DEFAULT 0,
      total_semesters INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 33. AI Career Insights Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_career_insights (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      placement_readiness_score REAL DEFAULT 0,
      recommended_skills TEXT, -- JSON array
      missing_skills TEXT, -- JSON array
      suggested_certifications TEXT, -- JSON array
      suggested_internships TEXT, -- JSON array
      career_path_suggestions TEXT, -- JSON array
      course_recommendations TEXT, -- JSON array
      smart_alerts TEXT, -- JSON array
      analysis_summary TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 34. AI Analytics Summary Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_analytics_summary (
      id TEXT PRIMARY KEY,
      scope_type TEXT NOT NULL, -- 'department' or 'college'
      scope_id TEXT NOT NULL,
      skill_gaps TEXT, -- JSON array
      top_skills TEXT, -- JSON array
      readiness_stats TEXT, -- JSON object
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_analytics_scope ON ai_analytics_summary(scope_type, scope_id);
  `);

  // 35. Resume Profiles Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_profiles (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      headline TEXT,
      summary TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      portfolio_url TEXT,
      languages TEXT, -- JSON string
      interests TEXT, -- JSON string
      template_name TEXT DEFAULT 'modern',
      public_visibility INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 34. Resume Projects Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_projects (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      description TEXT,
      technologies TEXT, -- Comma separated
      github_url TEXT,
      live_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 35. Resume Experience Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_experience (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      role TEXT NOT NULL,
      duration TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 36. Resume Skills Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_skills (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      skill_level TEXT, -- Beginner, Intermediate, Expert
      auto_detected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(uid) ON DELETE CASCADE
    );
  `);

  // 37. Signup Access Codes Table [NEW]
  db.exec(`
    CREATE TABLE IF NOT EXISTS signup_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      college_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      batch_year TEXT,
      usage_limit INTEGER DEFAULT 1, -- 1 for single, >1 for multi, -1 for unlimited
      usage_count INTEGER DEFAULT 0,
      expiry_date DATETIME,
      is_active INTEGER DEFAULT 1,
      role TEXT DEFAULT 'student',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );
  `);

  // Column enhancements for existing tables
  try {
    // Users: score, otp, otp_expiry, preferences, social_links, skills
    const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (!userCols.find(c => c.name === 'score')) db.exec("ALTER TABLE users ADD COLUMN score REAL DEFAULT 0;");
    if (!userCols.find(c => c.name === 'otp')) db.exec("ALTER TABLE users ADD COLUMN otp TEXT;");
    if (!userCols.find(c => c.name === 'otp_expiry')) db.exec("ALTER TABLE users ADD COLUMN otp_expiry DATETIME;");
    if (!userCols.find(c => c.name === 'preferences')) db.exec("ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';");
    if (!userCols.find(c => c.name === 'social_links')) db.exec("ALTER TABLE users ADD COLUMN social_links TEXT DEFAULT '{}';");
    if (!userCols.find(c => c.name === 'skills')) db.exec("ALTER TABLE users ADD COLUMN skills TEXT;");
    if (!userCols.find(c => c.name === 'bio')) db.exec("ALTER TABLE users ADD COLUMN bio TEXT;");
    if (!userCols.find(c => c.name === 'profile_photo')) db.exec("ALTER TABLE users ADD COLUMN profile_photo TEXT;");
    
    const certCols = db.prepare("PRAGMA table_info(certifications)").all() as any[];
    if (!certCols.find(c => c.name === 'verification_slug')) db.exec("ALTER TABLE certifications ADD COLUMN verification_slug TEXT;");

    // Colleges: city, state, country, pincode
    const colCols = db.prepare("PRAGMA table_info(colleges)").all() as any[];
    if (!colCols.find(c => c.name === 'college_id')) db.exec("ALTER TABLE colleges ADD COLUMN college_id TEXT;");
    if (!colCols.find(c => c.name === 'type')) db.exec("ALTER TABLE colleges ADD COLUMN type TEXT;");
    if (!colCols.find(c => c.name === 'city')) db.exec("ALTER TABLE colleges ADD COLUMN city TEXT;");
    if (!colCols.find(c => c.name === 'state')) db.exec("ALTER TABLE colleges ADD COLUMN state TEXT;");
    if (!colCols.find(c => c.name === 'country')) db.exec("ALTER TABLE colleges ADD COLUMN country TEXT;");
    if (!colCols.find(c => c.name === 'pincode')) db.exec("ALTER TABLE colleges ADD COLUMN pincode TEXT;");
    
    // Data Healing for Colleges
    db.exec(`UPDATE colleges SET college_id = id WHERE college_id IS NULL OR college_id = '';`);

    const deptCols = db.prepare("PRAGMA table_info(departments)").all() as any[];
    if (!deptCols.find(c => c.name === 'department_id')) db.exec("ALTER TABLE departments ADD COLUMN department_id TEXT;");
    
    // Data Healing for Departments (Ensure they reference existing colleges by ID)
    db.exec(`UPDATE departments SET department_id = id WHERE department_id IS NULL OR department_id = '';`);
    // Attempt to fix college_id in departments to point to colleges.id if it was pointing to colleges.college_id
    try {
      db.exec(`
        UPDATE departments 
        SET college_id = (SELECT id FROM colleges WHERE colleges.college_id = departments.college_id)
        WHERE college_id IN (SELECT college_id FROM colleges WHERE college_id != id);
      `);
    } catch (e) {
      console.warn("Soft healing for departments failed (minor):", e);
    }
    
    // Ensure UNIQUE constraints are enforced
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_colleges_college_id ON colleges(college_id);");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_department_id ON departments(department_id);");

    // Enhance student_academic_profile
    const profileCols = db.prepare("PRAGMA table_info(student_academic_profile)").all() as any[];
    if (!profileCols.find(c => c.name === 'department')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN department TEXT;");
    if (!profileCols.find(c => c.name === 'department_id')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN department_id TEXT;");
    if (!profileCols.find(c => c.name === 'college_id')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN college_id TEXT;");
    if (!profileCols.find(c => c.name === 'college_name')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN college_name TEXT;");
    if (!profileCols.find(c => c.name === 'placement_readiness_score')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN placement_readiness_score REAL DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'attendance_percentage')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN attendance_percentage REAL DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'cgpa')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN cgpa REAL DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'arrears')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN arrears INTEGER DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'internship_count')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN internship_count INTEGER DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'workshop_count')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN workshop_count INTEGER DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'seminar_count')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN seminar_count INTEGER DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'certification_count')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN certification_count INTEGER DEFAULT 0;");
    if (!profileCols.find(c => c.name === 'github_url')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN github_url TEXT;");
    if (!profileCols.find(c => c.name === 'linkedin_url')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN linkedin_url TEXT;");
    if (!profileCols.find(c => c.name === 'portfolio_url')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN portfolio_url TEXT;");
    if (!profileCols.find(c => c.name === 'resume_url')) db.exec("ALTER TABLE student_academic_profile ADD COLUMN resume_url TEXT;");


  } catch (err) {
    console.error("Schema enhancement failed:", err);
  }

  // Legacy JSON table (for backwards compatibility during migration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      collectionName TEXT,
      id TEXT,
      data TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collectionName, id)
    );
  `);

  migrateLegacyData();
}

function migrateLegacyData() {
  try {
    const legacyStmt = db.prepare(`SELECT collectionName, id, data FROM documents`);
    const legacyRows = legacyStmt.all() as any[];
    
    if (legacyRows.length === 0) return;

    for (const row of legacyRows) {
      const data = JSON.parse(row.data);
      const collection = row.collectionName;

      // Skip if already in new table (basic check)
      if (collection === 'users') {
        const check = db.prepare('SELECT uid FROM users WHERE uid = ? OR email = ?').get(row.id, data.email);
        if (!check) {
          db.prepare(`
            INSERT INTO users (uid, name, email, password_hash, role, college_id, department_id, roll_no, class, year, city, phone_number, photo_url, college_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            row.id, 
            data.name || data.displayName || 'Unknown', 
            data.email, 
            data.passwordHash || data.password_hash || null,
            data.role || 'student', 
            data.collegeId || null, 
            data.departmentId || null, 
            data.rollNo || null, 
            data.class || null, 
            data.year || null, 
            data.city || null, 
            data.phoneNumber || null, 
            data.photoUrl || null, 
            data.collegeName || null, 
            data.createdAt || new Date().toISOString()
          );
        }
      } else if (collection === 'certifications') {
        const check = db.prepare('SELECT id FROM certifications WHERE id = ?').get(row.id);
        if (!check) {
          db.prepare(`
            INSERT INTO certifications (id, user_id, student_name, roll_no, class, year, phone_number, city, college_name, college_id, department_id, event_name, event_college_name, event_location, date, type, file_url, photo_url, gps_lat, gps_lng, status, remarks, is_deleted, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            row.id, 
            data.userId || null, 
            data.studentName || null, 
            data.rollNo || null, 
            data.class || null, 
            data.year || null, 
            data.phoneNumber || null, 
            data.city || null, 
            data.collegeName || null, 
            data.collegeId || null, 
            data.departmentId || null, 
            data.eventName || null, 
            data.eventCollegeName || null, 
            data.eventLocation || null, 
            data.date || null, 
            data.type || null, 
            data.fileUrl || null, 
            data.photoUrl || null, 
            data.gps?.lat || null, 
            data.gps?.lng || null, 
            data.status || 'pending', 
            JSON.stringify(data.remarks || []), 
            data.is_deleted ? 1 : 0, 
            data.createdAt || new Date().toISOString()
          );
        }
      }
      // Add other collections as needed...
    }
    
    // Seed new structure if empty (Permissions & Settings)
    seedRelationalData();
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

function seedRelationalData() {
  // Seed Default Permissions
  const permCheck = db.prepare('SELECT count(*) as count FROM permissions').get() as any;
  if (permCheck.count === 0) {
    const defaultPerms = [
      ['perm_1', 'super_admin', '*', '*', 1],
      ['perm_2', 'admin', 'Users', '*', 1],
      ['perm_3', 'hod', 'Certifications', 'approve', 1],
      ['perm_4', 'staff', 'Certifications', 'view', 1],
      ['perm_5', 'student', 'Certifications', 'upload', 1],
    ];
    const stmt = db.prepare('INSERT INTO permissions (id, role, module, action, allowed) VALUES (?, ?, ?, ?, ?)');
    defaultPerms.forEach(p => stmt.run(...p));
  }

  // Seed Settings
  const setCheck = db.prepare('SELECT count(*) as count FROM settings').get() as any;
  if (setCheck.count === 0) {
    const settings = [
      ['max_file_size', JSON.stringify(5242880), 'upload', 'Max file size in bytes'],
      ['allowed_extensions', JSON.stringify(['.pdf', '.jpg', '.png']), 'upload', 'Allowed formats'],
      ['session_timeout', JSON.stringify(30), 'security', 'Timeout in minutes'],
      ['maintenance_mode', JSON.stringify(false), 'security', 'Prevent non-admin logins'],
      ['registration_enabled', JSON.stringify(true), 'security', 'Allow new user signup'],
      ['min_password_length', JSON.stringify(8), 'security', 'Minimum password complexity'],
    ];
    const stmt = db.prepare('INSERT INTO settings (key, value, category, description) VALUES (?, ?, ?, ?)');
    settings.forEach(s => stmt.run(...s));
  }
}

// Generic helpers (for transitional period)
export function setDocument(collectionName: string, id: string, data: any) {
  const tableMap: Record<string, string> = {
    'careerActivities': 'career_activities',
    'auditLogs': 'audit_logs',
    'colleges': 'colleges',
    'departments': 'departments',
    'certifications': 'certifications',
    'certificates': 'certifications',
    'users': 'users',
    'students': 'students'
  };
  const tableName = tableMap[collectionName] || collectionName;

  if (tableName === 'users') {
    const existing = getDocument('users', id) || {};
    const merged = { ...existing, ...data };
    
    db.prepare(`
      INSERT INTO users (uid, name, email, password_hash, role, college_id, department_id, roll_no, class, year, section, city, phone_number, profile_photo, college_name, status, is_active, last_login, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name=excluded.name, email=excluded.email, password_hash=COALESCE(excluded.password_hash, users.password_hash),
        role=excluded.role, college_id=excluded.college_id, department_id=excluded.department_id,
        roll_no=excluded.roll_no, class=excluded.class, year=excluded.year, section=excluded.section,
        city=excluded.city, phone_number=excluded.phone_number, profile_photo=excluded.profile_photo,
        college_name=excluded.college_name, status=excluded.status, is_active=excluded.is_active
    `).run(
      id, 
      (merged.name || merged.displayName) ?? null, 
      (merged.email || merged.contact) ?? null, 
      (merged.password_hash || merged.passwordHash) ?? null,
      merged.role ?? 'student', 
      (merged.college_id || merged.collegeId) ?? null, 
      (merged.department_id || merged.departmentId || merged.department) ?? null, 
      (merged.roll_no || merged.rollNo || merged.id) ?? null, 
      merged.class ?? null, 
      merged.year ?? null, 
      merged.section ?? null,
      merged.city ?? null, 
      (merged.phone_number || merged.phoneNumber) ?? null, 
      (merged.profile_photo || merged.profilePhoto || merged.photo_url || merged.photoUrl) ?? null,
      (merged.college_name || merged.collegeName) ?? null, 
      merged.status ?? 'active', 
      (merged.is_active || merged.isActive) ? 1 : 1, 
      (merged.last_login || merged.lastLogin) ?? null, 
      (merged.created_at || merged.createdAt || new Date().toISOString()) ?? null
    );
  } else if (tableName === 'students') {
    // Synchronize both Users and Students tables
    const studentId = data.roll_no || data.rollNo || data.id;
    const departmentId = data.department_id || data.departmentId || data.department;
    
    // 1. Ensure User exists/updated
    const existingUser = getDocument('users', id) || {};
    const passHash = data.password_hash || data.passwordHash || existingUser.password_hash || existingUser.passwordHash || null;

    db.prepare(`
      INSERT INTO users (uid, name, email, password_hash, role, college_id, department_id, roll_no, class, year, section, photo_url, status, is_active, created_at)
      VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name=excluded.name, email=excluded.email, password_hash=COALESCE(excluded.password_hash, users.password_hash),
        college_id=excluded.college_id, department_id=excluded.department_id, 
        roll_no=excluded.roll_no, class=excluded.class, year=excluded.year, section=excluded.section, 
        photo_url=excluded.photo_url
    `).run(
      id, 
      data.name || existingUser.name || 'Student', 
      data.email || data.contact || existingUser.email || `${id}@student.local`,
      passHash,
      data.college_id || data.collegeId,
      departmentId,
      studentId,
      data.class,
      data.year,
      data.section,
      data.photo_url || data.photoUrl || data.photoURL,
      data.created_at || data.createdAt || new Date().toISOString()
    );

    // 2. Ensure Student bridge table updated
    db.prepare(`
      INSERT INTO students (user_id, roll_no, class, year, section, department_id, college_id, enrollment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        roll_no=excluded.roll_no, class=excluded.class, year=excluded.year, section=excluded.section,
        department_id=excluded.department_id, college_id=excluded.college_id
    `).run(
      id,
      studentId,
      data.class,
      data.year,
      data.section,
      departmentId,
      data.college_id || data.collegeId,
      data.created_at || data.createdAt || new Date().toISOString()
    );
  } else if (tableName === 'certifications') {
    const existing = getDocument('certifications', id) || {};
    const merged = { ...existing, ...data };
    
    db.prepare(`
      INSERT INTO certifications (id, user_id, student_name, roll_no, class, year, phone_number, city, college_name, college_id, department_id, event_name, event_college_name, event_location, date, type, file_url, photo_url, gps_lat, gps_lng, prize_position, custom_prize_position, prize_type, cash_prize_amount, prize_description, gps_photo_url, gps_photo_lat, gps_photo_lng, gps_photo_timestamp, gps_verified, fraud_flag, fraud_reason, file_hash, status, remarks, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        student_name=excluded.student_name, roll_no=excluded.roll_no, class=excluded.class, year=excluded.year,
        event_name=excluded.event_name, date=excluded.date, status=excluded.status, 
        remarks=excluded.remarks, is_deleted=excluded.is_deleted, updated_at=CURRENT_TIMESTAMP
    `).run(
      id, 
      (merged.user_id || merged.userId) ?? null, 
      (merged.student_name || merged.studentName) ?? null, 
      (merged.roll_no || merged.rollNo) ?? null, 
      merged.class ?? null, 
      merged.year ?? null, 
      (merged.phone_number || merged.phoneNumber) ?? null, 
      merged.city ?? null, 
      (merged.college_name || merged.collegeName) ?? null, 
      (merged.college_id || merged.collegeId) ?? null, 
      (merged.department_id || merged.departmentId) ?? null, 
      (merged.event_name || merged.eventName) ?? null, 
      (merged.event_college_name || merged.eventCollegeName) ?? null, 
      (merged.event_location || merged.eventLocation) ?? null, 
      merged.date ?? null, 
      merged.type ?? null, 
      (merged.file_url || merged.fileUrl) ?? null, 
      (merged.photo_url || merged.photoUrl) ?? null, 
      (merged.gps?.lat || merged.gps_lat) ?? null, 
      (merged.gps?.lng || merged.gps_lng) ?? null, 
      (merged.prize_position || merged.prizePosition) ?? null, 
      (merged.custom_prize_position || merged.customPrizePosition) ?? null, 
      (merged.prize_type || merged.prizeType) ?? null, 
      (merged.cash_prize_amount || merged.cashPrizeAmount) ?? null, 
      (merged.prize_description || merged.prizeDescription) ?? null, 
      (merged.gps_photo_url || merged.gpsPhotoUrl) ?? null, 
      (merged.gps_photo_lat || merged.gpsPhotoLat) ?? null, 
      (merged.gps_photo_lng || merged.gpsPhotoLng) ?? null, 
      (merged.gps_photo_timestamp || merged.gpsPhotoTimestamp) ?? null, 
      (merged.gps_verified || merged.gpsVerified) ? 1 : 0, 
      (merged.fraud_flag || merged.fraudFlag) ? 1 : 0, 
      (merged.fraud_reason || merged.fraudReason) ?? null, 
      (merged.file_hash || merged.fileHash) ?? null, 
      (merged.status || 'pending') ?? null, 
      JSON.stringify(merged.remarks || []), 
      merged.is_deleted ? 1 : 0, 
      (merged.created_at || merged.createdAt || new Date().toISOString()) ?? null, 
      new Date().toISOString()
    );
  } else if (tableName === 'career_activities') {
    db.prepare(`
      INSERT INTO career_activities (id, user_id, student_id, college_id, department_id, type, organization, duration, details, status, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type, organization=excluded.organization, duration=excluded.duration,
        details=excluded.details, status=excluded.status, is_deleted=excluded.is_deleted,
        updated_at=CURRENT_TIMESTAMP
    `).run(
      id, 
      (data.user_id || data.userId) ?? null, 
      (data.student_id || data.studentId) ?? null, 
      (data.college_id || data.collegeId) ?? null, 
      (data.department_id || data.departmentId) ?? null, 
      data.type ?? null, 
      data.organization ?? null, 
      data.duration ?? null, 
      data.details ?? null, 
      data.status || 'pending', 
      data.is_deleted ? 1 : 0, 
      (data.created_at || data.createdAt || new Date().toISOString()) ?? null, 
      new Date().toISOString()
    );
  } else if (tableName === 'colleges') {
    db.prepare(`
      INSERT INTO colleges (id, college_id, name, type, location, city, state, country, pincode, lat, lng, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        college_id=excluded.college_id, name=excluded.name, type=excluded.type, location=excluded.location,
        city=excluded.city, state=excluded.state, country=excluded.country, pincode=excluded.pincode,
        lat=excluded.lat, lng=excluded.lng
    `).run(
      id, 
      (data.college_id || data.collegeId || id) ?? null,
      (data.name || data.college_name || data.displayName) ?? 'Unknown College', 
      data.type ?? null,
      data.location ?? null, 
      data.city ?? null, 
      data.state ?? null, 
      data.country ?? null, 
      data.pincode ?? null, 
      data.lat ?? null, 
      data.lng ?? null, 
      (data.created_at || data.createdAt || new Date().toISOString()) ?? null
    );
  } else if (tableName === 'departments') {
    db.prepare(`
      INSERT INTO departments (id, department_id, college_id, name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        department_id=excluded.department_id, college_id=excluded.college_id, name=excluded.name
    `).run(
      id, 
      (data.department_id || data.departmentId || id) ?? null, 
      (data.college_id || data.collegeId) ?? null, 
      (data.name || data.department_name || data.departmentName) ?? 'Unknown Department'
    );
  } else {
    // Fallback for smaller/config tables
    const existing = getDocument(collectionName, id) || {};
    const merged = { ...existing, ...data };
    db.prepare(`INSERT INTO documents (collectionName, id, data, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(collectionName, id) DO UPDATE SET data = excluded.data`).run(collectionName, id, JSON.stringify(merged));
    return merged;
  }
  return data;
}

export function getDocument(collectionName: string, id: string) {
  const tableMap: Record<string, string> = {
    'careerActivities': 'career_activities',
    'auditLogs': 'audit_logs',
    'certifications': 'certifications',
    'certificates': 'certifications',
    'users': 'users'
  };
  const tableName = tableMap[collectionName] || collectionName;

  if (['users', 'certifications', 'career_activities', 'colleges', 'departments'].includes(tableName)) {
    const pk = tableName === 'users' ? 'uid' : 'id';
    const row = db.prepare(`SELECT * FROM ${tableName} WHERE ${pk} = ?`).get(id) as any;
    if (row && tableName === 'certifications') {
       row.remarks = JSON.parse(row.remarks || '[]');
    }
    return row;
  }

  const stmt = db.prepare(`SELECT data FROM documents WHERE collectionName = ? AND id = ?`);
  const row = stmt.get(collectionName, id) as any;
  return row ? JSON.parse(row.data) : null;
}

export function getCollection(collectionName: string) {
  return queryDocuments(collectionName);
}

export function deleteDocument(collectionName: string, id: string) {
  const tableMap: Record<string, string> = {
    'careerActivities': 'career_activities',
    'auditLogs': 'audit_logs',
    'certifications': 'certifications',
    'users': 'users',
    'students': 'students'
  };
  const tableName = tableMap[collectionName] || collectionName;

  if (['users', 'certifications', 'career_activities', 'students', 'colleges', 'departments'].includes(tableName)) {
    const pk = (tableName === 'users' || tableName === 'students') ? (tableName === 'users' ? 'uid' : 'user_id') : 'id';
    
    // If deleting from students, we also delete from users (cascade would handle the other way)
    if (tableName === 'students') {
       db.prepare(`DELETE FROM users WHERE uid = ?`).run(id);
    } else {
       db.prepare(`DELETE FROM ${tableName} WHERE ${pk} = ?`).run(id);
    }
  } else {
    db.prepare(`DELETE FROM documents WHERE collectionName = ? AND id = ?`).run(collectionName, id);
  }
}

export function queryDocuments(collectionName: string, conditions: any[] = [], orderBys: any[] = [], limitNum?: number) {
  // Mapping some collection names that might differ
  const tableMap: Record<string, string> = {
    'careerActivities': 'career_activities',
    'certificates': 'certifications',
    'certifications': 'certifications',
    'auditLogs': 'audit_logs'
  };
  const tableName = tableMap[collectionName] || collectionName;

  // Basic validation to prevent SQL injection on table names
  const validTables = [
    'users', 'students', 'colleges', 'departments', 'certifications', 'career_activities', 
    'audit_logs', 'notifications', 'settings', 'permissions', 'documents',
    'announcements', 'companies', 'job_posts', 'alumni'
  ];
  if (!validTables.includes(tableName)) {
    console.error(`Invalid table: ${tableName}`);
    return [];
  }

  let sql = '';
  const params: any[] = [];

  if (tableName === 'students') {
    sql = `SELECT s.*, s.user_id as docId, s.roll_no as id, s.department_id as department, u.name, u.email as contact, u.photo_url, u.profile_photo, u.profile_photo as profilePhoto, u.profile_photo as photoUrl FROM students s JOIN users u ON s.user_id = u.uid WHERE 1=1`;
  } else if (tableName === 'users') {
    sql = `SELECT *, profile_photo as profilePhoto, profile_photo as photoUrl FROM users WHERE 1=1`;
  } else {
    sql = `SELECT * FROM ${tableName} WHERE 1=1`;
  }

  for (const cond of conditions) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(cond.field)) continue;
    
    // Mapping camelCase to snake_case for common fields if they come from frontend
    let field = cond.field;
    const fieldMap: Record<string, string> = {
      'userId': ['career_activities', 'certifications', 'students', 'notifications'].includes(tableName) ? 'user_id' : 'uid',
      'uid': ['students', 'notifications', 'certifications', 'career_activities'].includes(tableName) ? 'user_id' : 'uid',
      'id': tableName === 'students' ? 'user_id' : 'id',
      'docId': tableName === 'students' ? 'user_id' : 'id',
      'name': tableName === 'students' ? 'u.name' : 'name',
      'email': tableName === 'students' ? 'u.email' : 'email',
      'collegeId': 'college_id',
      'departmentId': 'department_id',
      'rollNo': 'roll_no',
      'profilePhoto': 'profile_photo',
      'studentId': tableName === 'career_activities' || tableName === 'students' ? (tableName === 'students' ? 'user_id' : 'student_id') : 'user_id',
      'studentName': tableName === 'students' ? 'u.name' : 'student_name',
      'eventName': 'event_name',
      'isDeleted': 'is_deleted',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };
    field = fieldMap[field] || field;

    if (cond.operator === '==') {
      sql += ` AND ${field} = ?`;
      params.push(cond.value);
    } else if (cond.operator === '!=') {
      sql += ` AND ${field} != ?`;
      params.push(cond.value);
    } else if (cond.operator === 'in') {
      if (Array.isArray(cond.value) && cond.value.length > 0) {
        const placeholders = cond.value.map(() => '?').join(',');
        sql += ` AND ${field} IN (${placeholders})`;
        params.push(...cond.value);
      } else {
        return [];
      }
    }
  }

  if (orderBys.length > 0) {
    sql += ' ORDER BY ';
    const clauses = orderBys.map(ob => {
       let f = ob.field;
       if (f === 'createdAt') f = 'created_at';
       if (f === 'timestamp') f = 'created_at';
       return `${f} ${ob.direction === 'desc' ? 'DESC' : 'ASC'}`;
    });
    sql += clauses.join(', ');
  }

  if (limitNum) {
    sql += ` LIMIT ?`;
    params.push(limitNum);
  }

  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    
    // For legacy 'documents' table, we return the parsed JSON 'data'
    if (tableName === 'documents') {
       return rows.map(r => JSON.parse(r.data));
    }
    
    return rows.map(row => {
      // Common field normalization
      if (row.created_at) { row.createdAt = row.created_at; }
      if (row.updated_at) { row.updatedAt = row.updated_at; }
      
      // Table specific normalization
      if (tableName === 'certifications' && typeof row.remarks === 'string') {
        try { row.remarks = JSON.parse(row.remarks); } catch(e) { row.remarks = []; }
      }
      return row;
    });
  } catch (err) {
    console.error("SQL Query Failed:", sql, err);
    return [];
  }
}

initDb();

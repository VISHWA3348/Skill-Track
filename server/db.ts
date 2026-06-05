import { Worker } from 'worker_threads';
import path from 'path';

// Initialize worker thread with SharedArrayBuffer for synchronous query execution
const sharedBuffer = new SharedArrayBuffer(1024 * 1024 * 16); // 16MB result buffer
const int32Array = new Int32Array(sharedBuffer);

const workerPath = path.resolve(process.cwd(), 'server', 'db_worker.ts');
const worker = new Worker(workerPath, {
  workerData: { sharedBuffer },
  execArgv: ['--import', 'tsx']
});

function sendQueryToWorker(action: string, sql: string, params: any[]): any {
  worker.postMessage({ action, sql, params });
  Atomics.wait(int32Array, 0, 0);

  const length = int32Array[1];
  const decoder = new TextDecoder();
  const bytes = new Uint8Array(sharedBuffer, 8, length);
  const jsonStr = decoder.decode(bytes);

  int32Array[0] = 0;

  const res = JSON.parse(jsonStr);
  if (res.error) {
    throw new Error(res.error);
  }
  return res.result;
}

export const db = {
  prepare(sql: string) {
    return {
      all(...params: any[]) {
        return sendQueryToWorker('all', sql, params);
      },
      get(...params: any[]) {
        return sendQueryToWorker('get', sql, params);
      },
      run(...params: any[]) {
        return sendQueryToWorker('run', sql, params);
      }
    };
  },
  exec(sql: string) {
    return sendQueryToWorker('exec', sql, []);
  }
};

export function initDb() {
  console.log("🌐 Database engine: Supabase PostgreSQL (Prisma Client backend via worker)");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS department_invite_codes (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        college_id VARCHAR(255) NOT NULL,
        department_id VARCHAR(255) NOT NULL,
        academic_year VARCHAR(20),
        is_active INTEGER DEFAULT 1,
        max_registrations INTEGER DEFAULT -1,
        current_registrations INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes safely
    try { db.exec("CREATE INDEX IF NOT EXISTS idx_invite_code ON department_invite_codes(code)"); } catch(e){}
    try { db.exec("CREATE INDEX IF NOT EXISTS idx_invite_college ON department_invite_codes(college_id)"); } catch(e){}
    try { db.exec("CREATE INDEX IF NOT EXISTS idx_invite_dept ON department_invite_codes(department_id)"); } catch(e){}

  // ─── Phase 1: High-frequency query indexes ───────────────────────────────
  // users table
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_dept_id ON users(department_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_college_role ON users(college_id, role)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_dept_role ON users(department_id, role)"); } catch(e){}

  // certifications table
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_user_id ON certifications(user_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_status ON certifications(status)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_college_id ON certifications(college_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_dept_id ON certifications(department_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_college_status ON certifications(college_id, status)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_dept_status ON certifications(department_id, status)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_certs_deleted ON certifications(is_deleted)"); } catch(e){}

  // career_activities table
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_careers_user_id ON career_activities(user_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_careers_status ON career_activities(status)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_careers_college_id ON career_activities(college_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_careers_dept_id ON career_activities(department_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_careers_deleted ON career_activities(is_deleted)"); } catch(e){}

  // audit_logs table
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_audit_college_id ON audit_logs(college_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC)"); } catch(e){}

  // notifications table
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id)"); } catch(e){}

  // students table
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_students_dept_id ON students(department_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_students_college_id ON students(college_id)"); } catch(e){}

  // career_activities student_id index
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_careers_student_id ON career_activities(student_id)"); } catch(e){}

  // student sub-tables indexes
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_skills_sid ON student_skills(student_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_goals_sid ON student_goals(student_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_notif_sid ON student_notifications(student_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_resume_sid ON student_resume_data(student_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_remarks_sid ON staff_student_remarks(student_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_attendance_sid ON student_attendance(student_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_st_perf_logs_sid ON student_performance_logs(student_id)"); } catch(e){}

  // signup and invite codes
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_signup_codes_val ON signup_codes(code)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_signup_codes_active ON signup_codes(is_active)"); } catch(e){}

  console.log("✅ Performance indexes verified in PostgreSQL");

  // safe alterations for advanced GPS, EXIF, Cloudinary metadata, and audit logs
  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_public_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_file_type VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_file_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_uploaded_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_academic_year VARCHAR(20);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
      ALTER TABLE career_activities ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
      ALTER TABLE student_academic_profile ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
      ALTER TABLE department_invite_codes ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
  } catch(e){}
  
  try {
    db.exec(`
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS altitude DOUBLE PRECISION;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS street VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS area VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS locality VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS district VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS state VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS country VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS postal_code VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS timezone VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS device_timestamp TIMESTAMP;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS browser_timestamp TIMESTAMP;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_url TEXT;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_public_id VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_type VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_name VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_uploaded_at TIMESTAMP;

      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_url TEXT;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_public_id VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_file_type VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_file_name VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_uploaded_at TIMESTAMP;

      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_lat DOUBLE PRECISION;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_lng DOUBLE PRECISION;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_timestamp TIMESTAMP;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_camera VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_device VARCHAR(255);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_verification_result VARCHAR(50);

      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS section VARCHAR(50);
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS browser_metadata TEXT;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS verification_metadata TEXT;
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
  } catch(e){}

  try {
    db.exec(`
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(255);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(50);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS remarks TEXT;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(255);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS gps_verification_result VARCHAR(50);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS certificate_id VARCHAR(255);
    `);
  } catch(e){}

  try {
    db.exec(`
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(50) DEFAULT 'GLOBAL';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS college_id VARCHAR(255);
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS target_college_ids TEXT;
    `);
  } catch(e){}
    
    console.log("✅ department_invite_codes table successfully verified in PostgreSQL");
  } catch (err) {
    console.error("⚠️ Failed to verify department_invite_codes schema at boot:", err);
  }
}

// Generic helpers (for transitional period)

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
      INSERT INTO users (uid, name, email, password_hash, role, college_id, department_id, roll_no, class, year, section, city, phone_number, profile_photo, college_name, status, is_active, last_login, created_at, address, profile_photo_public_id, profile_photo_file_type, profile_photo_file_name, profile_photo_uploaded_at, academic_year, assigned_academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name=excluded.name, email=excluded.email, password_hash=COALESCE(excluded.password_hash, users.password_hash),
        role=excluded.role, college_id=excluded.college_id, department_id=excluded.department_id,
        roll_no=excluded.roll_no, class=excluded.class, year=excluded.year, section=excluded.section,
        city=excluded.city, phone_number=excluded.phone_number, profile_photo=excluded.profile_photo,
        college_name=excluded.college_name, status=excluded.status, is_active=excluded.is_active,
        address=excluded.address, profile_photo_public_id=excluded.profile_photo_public_id,
        profile_photo_file_type=excluded.profile_photo_file_type, profile_photo_file_name=excluded.profile_photo_file_name,
        profile_photo_uploaded_at=excluded.profile_photo_uploaded_at,
        academic_year=excluded.academic_year, assigned_academic_year=excluded.assigned_academic_year
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
      (merged.created_at || merged.createdAt || new Date().toISOString()) ?? null,
      merged.address ?? null,
      merged.profile_photo_public_id ?? null,
      merged.profile_photo_file_type ?? null,
      merged.profile_photo_file_name ?? null,
      merged.profile_photo_uploaded_at ?? null,
      (merged.academic_year || merged.academicYear) ?? null,
      (merged.assigned_academic_year || merged.assignedAcademicYear) ?? null
    );
  } else if (tableName === 'students') {
    // Synchronize both Users and Students tables
    const studentId = data.roll_no || data.rollNo || data.id;
    const departmentId = data.department_id || data.departmentId || data.department;
    
    // 1. Ensure User exists/updated
    const existingUser = getDocument('users', id) || {};
    const passHash = data.password_hash || data.passwordHash || existingUser.password_hash || existingUser.passwordHash || null;

    db.prepare(`
      INSERT INTO users (uid, name, email, password_hash, role, college_id, department_id, roll_no, class, year, section, photo_url, status, is_active, created_at, academic_year, assigned_academic_year)
      VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name=excluded.name, email=excluded.email, password_hash=COALESCE(excluded.password_hash, users.password_hash),
        college_id=excluded.college_id, department_id=excluded.department_id, 
        roll_no=excluded.roll_no, class=excluded.class, year=excluded.year, section=excluded.section, 
        photo_url=excluded.photo_url, academic_year=excluded.academic_year, assigned_academic_year=excluded.assigned_academic_year
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
      data.created_at || data.createdAt || new Date().toISOString(),
      (data.academic_year || data.academicYear) ?? null,
      (data.assigned_academic_year || data.assignedAcademicYear) ?? null
    );

    // 2. Ensure Student bridge table updated
    db.prepare(`
      INSERT INTO students (user_id, roll_no, class, year, section, department_id, college_id, enrollment_date, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        roll_no=excluded.roll_no, class=excluded.class, year=excluded.year, section=excluded.section,
        department_id=excluded.department_id, college_id=excluded.college_id, academic_year=excluded.academic_year
    `).run(
      id,
      studentId,
      data.class,
      data.year,
      data.section,
      departmentId,
      data.college_id || data.collegeId,
      data.created_at || data.createdAt || new Date().toISOString(),
      (data.academic_year || data.academicYear) ?? null
    );
  } else if (tableName === 'certifications') {
    const existing = getDocument('certifications', id) || {};
    const merged = { ...existing, ...data };
    
    let finalAcademicYear = (merged.academic_year || merged.academicYear) ?? null;
    if (!finalAcademicYear && (merged.user_id || merged.userId)) {
      const studentUser = db.prepare('SELECT academic_year FROM users WHERE uid = ?').get(merged.user_id || merged.userId) as any;
      if (studentUser) {
        finalAcademicYear = studentUser.academic_year;
      }
    }

    db.prepare(`
      INSERT INTO certifications (
        id, user_id, student_name, roll_no, class, year, phone_number, city, college_name, college_id, department_id, event_name, event_college_name, event_location, date, type, file_url, photo_url, gps_lat, gps_lng, prize_position, custom_prize_position, prize_type, cash_prize_amount, prize_description, gps_photo_url, gps_photo_lat, gps_photo_lng, gps_photo_timestamp, gps_verified, fraud_flag, fraud_reason, file_hash, status, remarks, is_deleted, created_at, updated_at,
        altitude, accuracy, street, area, locality, district, state, country, postal_code, timezone, device_timestamp, browser_timestamp, google_maps_url,
        certificate_url, certificate_public_id, certificate_file_type, certificate_file_name, certificate_uploaded_at,
        proof_photo_url, proof_photo_public_id, proof_photo_file_type, proof_photo_file_name, proof_photo_uploaded_at,
        exif_lat, exif_lng, exif_timestamp, exif_camera, exif_device, exif_verification_result,
        section, browser_metadata, verification_metadata, upload_timestamp, academic_year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        student_name=excluded.student_name, roll_no=excluded.roll_no, class=excluded.class, year=excluded.year,
        event_name=excluded.event_name, date=excluded.date, status=excluded.status, 
        remarks=excluded.remarks, is_deleted=excluded.is_deleted, updated_at=CURRENT_TIMESTAMP,
        altitude=excluded.altitude, accuracy=excluded.accuracy, street=excluded.street, area=excluded.area, locality=excluded.locality, district=excluded.district, state=excluded.state, country=excluded.country, postal_code=excluded.postal_code, timezone=excluded.timezone, device_timestamp=excluded.device_timestamp, browser_timestamp=excluded.browser_timestamp, google_maps_url=excluded.google_maps_url,
        certificate_url=excluded.certificate_url, certificate_public_id=excluded.certificate_public_id, certificate_file_type=excluded.certificate_file_type, certificate_file_name=excluded.certificate_file_name, certificate_uploaded_at=excluded.certificate_uploaded_at,
        proof_photo_url=excluded.proof_photo_url, proof_photo_public_id=excluded.proof_photo_public_id, proof_photo_file_type=excluded.proof_photo_file_type, proof_photo_file_name=excluded.proof_photo_file_name, proof_photo_uploaded_at=excluded.proof_photo_uploaded_at,
        exif_lat=excluded.exif_lat, exif_lng=excluded.exif_lng, exif_timestamp=excluded.exif_timestamp, exif_camera=excluded.exif_camera, exif_device=excluded.exif_device, exif_verification_result=excluded.exif_verification_result,
        section=excluded.section, browser_metadata=excluded.browser_metadata, verification_metadata=excluded.verification_metadata, upload_timestamp=excluded.upload_timestamp, academic_year=excluded.academic_year
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
      (merged.file_url || merged.fileUrl || merged.certificate_url) ?? null, 
      (merged.photo_url || merged.photoUrl || merged.proof_photo_url) ?? null, 
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
      new Date().toISOString(),
      
      // New GPS Fields
      merged.altitude ?? null,
      merged.accuracy ?? null,
      merged.street ?? null,
      merged.area ?? null,
      merged.locality ?? null,
      merged.district ?? null,
      merged.state ?? null,
      merged.country ?? null,
      merged.postal_code ?? merged.postalCode ?? null,
      merged.timezone ?? null,
      merged.device_timestamp ?? merged.deviceTimestamp ?? null,
      merged.browser_timestamp ?? merged.browserTimestamp ?? null,
      merged.google_maps_url ?? merged.googleMapsUrl ?? null,
      
      // New Cloudinary Fields
      (merged.certificate_url || merged.certificateUrl || merged.file_url || merged.fileUrl) ?? null,
      (merged.certificate_public_id || merged.certificatePublicId) ?? null,
      (merged.certificate_file_type || merged.certificateFileType) ?? null,
      (merged.certificate_file_name || merged.certificateFileName) ?? null,
      (merged.certificate_uploaded_at || merged.certificateUploadedAt) ?? null,
      
      (merged.proof_photo_url || merged.proofPhotoUrl || merged.photo_url || merged.photoUrl) ?? null,
      (merged.proof_photo_public_id || merged.proofPhotoPublicId) ?? null,
      (merged.proof_photo_file_type || merged.proofPhotoFileType) ?? null,
      (merged.proof_photo_file_name || merged.proofPhotoFileName) ?? null,
      (merged.proof_photo_uploaded_at || merged.proofPhotoUploadedAt) ?? null,
      
      // New EXIF Fields
      (merged.exif_lat || merged.exifLatitude) ?? null,
      (merged.exif_lng || merged.exifLongitude) ?? null,
      (merged.exif_timestamp || merged.exifTimestamp) ?? null,
      (merged.exif_camera || merged.exifCamera) ?? null,
      (merged.exif_device || merged.exifDevice) ?? null,
      (merged.exif_verification_result || merged.exifVerificationResult || merged.verificationStatus) ?? null,
      
      merged.section ?? null,
      merged.browser_metadata ?? merged.browserMetadata ?? null,
      merged.verification_metadata ?? merged.verificationMetadata ?? null,
      (merged.upload_timestamp || merged.uploadTimestamp || new Date().toISOString()),
      finalAcademicYear
    );
  } else if (tableName === 'career_activities') {
    let finalAcademicYear = (data.academic_year || data.academicYear) ?? null;
    if (!finalAcademicYear && (data.user_id || data.userId)) {
      const studentUser = db.prepare('SELECT academic_year FROM users WHERE uid = ?').get(data.user_id || data.userId) as any;
      if (studentUser) {
        finalAcademicYear = studentUser.academic_year;
      }
    }

    db.prepare(`
      INSERT INTO career_activities (id, user_id, student_id, college_id, department_id, type, organization, duration, details, status, is_deleted, created_at, updated_at, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type, organization=excluded.organization, duration=excluded.duration,
        details=excluded.details, status=excluded.status, is_deleted=excluded.is_deleted,
        updated_at=CURRENT_TIMESTAMP, academic_year=excluded.academic_year
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
      new Date().toISOString(),
      finalAcademicYear
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
    const deptId = (data.department_id || data.departmentId || id);
    const collegeId = (data.college_id || data.collegeId);
    
    db.prepare(`
      INSERT INTO departments (id, department_id, college_id, name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        department_id=excluded.department_id, college_id=excluded.college_id, name=excluded.name
    `).run(
      id, 
      deptId ?? null, 
      collegeId ?? null, 
      (data.name || data.department_name || data.departmentName) ?? 'Unknown Department'
    );

    if (deptId && collegeId) {
      const existingCode = db.prepare('SELECT id FROM department_invite_codes WHERE department_id = ?').get(deptId);
      if (!existingCode) {
        const academicYear = data.academicYear || data.academic_year || null;
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const codePrefix = deptId.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        let yrSuffix = '';
        if (academicYear) {
          if (academicYear.includes('I Year PG')) yrSuffix = '-1YPG';
          else if (academicYear.includes('II Year PG')) yrSuffix = '-2YPG';
          else if (academicYear.includes('I Year')) yrSuffix = '-1Y';
          else if (academicYear.includes('II Year')) yrSuffix = '-2Y';
          else if (academicYear.includes('III Year')) yrSuffix = '-3Y';
          else if (academicYear.includes('IV Year')) yrSuffix = '-4Y';
          else yrSuffix = '-' + academicYear.replace(/\s+/g, '').substring(0, 4).toUpperCase();
        }
        
        const inviteCode = `${codePrefix}${yrSuffix}-${random}`;
        const newCodeId = 'dic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        try {
          db.prepare(`
            INSERT INTO department_invite_codes (id, code, college_id, department_id, is_active, max_registrations, current_registrations, created_at, created_by, academic_year)
            VALUES (?, ?, ?, ?, 1, -1, 0, CURRENT_TIMESTAMP, 'system_auto', ?)
          `).run(newCodeId, inviteCode, collegeId, deptId, academicYear);
        } catch(e) {
          console.error("Failed to auto-generate invite code in DB trigger:", e);
        }
      }
    }
  } else if (tableName === 'audit_logs') {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, college_id, timestamp, reviewer_id, reviewer_role, action_type, remarks, ip_address, gps_verification_result, certificate_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      (data.user_id || data.userId) ?? null,
      data.action ?? null,
      data.details ?? null,
      (data.college_id || data.collegeId) ?? null,
      (data.timestamp || new Date().toISOString()),
      (data.reviewer_id || data.reviewerId) ?? null,
      (data.reviewer_role || data.reviewerRole) ?? null,
      (data.action_type || data.actionType) ?? null,
      data.remarks ?? null,
      (data.ip_address || data.ipAddress) ?? null,
      (data.gps_verification_result || data.gpsVerificationResult) ?? null,
      (data.certificate_id || data.certificateId) ?? null
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
    
    // Skip department_id/departmentId for colleges table as it doesn't have it
    if (tableName === 'colleges' && (cond.field === 'departmentId' || cond.field === 'department_id')) {
      continue;
    }
    
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
      'academicYear': 'academic_year',
      'assignedAcademicYear': 'assigned_academic_year',
      'studentId': tableName === 'career_activities' || tableName === 'students' ? (tableName === 'students' ? 'user_id' : 'student_id') : 'user_id',
      'studentName': tableName === 'students' ? 'u.name' : 'student_name',
      'eventName': 'event_name',
      'isDeleted': 'is_deleted',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };
    field = fieldMap[field] || field;

    if (tableName === 'notifications' || tableName === 'audit_logs') {
      if (field === 'created_at' || field === 'createdAt') {
        field = 'timestamp';
      }
    }

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
       if (tableName === 'notifications' || tableName === 'audit_logs') {
         if (f === 'createdAt' || f === 'created_at' || f === 'timestamp') {
           f = 'timestamp';
         }
       } else {
         if (f === 'createdAt') f = 'created_at';
         if (f === 'timestamp') f = 'created_at';
       }
       return `${f} ${ob.direction === 'desc' ? 'DESC' : 'ASC'}`;
    });
    sql += clauses.join(', ');
  }

  if (limitNum) {
    sql += ` LIMIT ?`;
    params.push(limitNum);
  }

  try {
    let rows: any[] = [];
    try {
      const stmt = db.prepare(sql);
      rows = stmt.all(...params) as any[];
    } catch (err: any) {
      if (orderBys.length > 0) {
        console.warn(`⚠️ Query on ${tableName} failed with ORDER BY, attempting fallback without ORDER BY:`, err.message);
        let fallbackSql = sql;
        const orderByIdx = sql.lastIndexOf(' ORDER BY ');
        if (orderByIdx !== -1) {
          const beforeOrder = sql.substring(0, orderByIdx);
          const limitIdx = sql.indexOf(' LIMIT ', orderByIdx);
          if (limitIdx !== -1) {
            fallbackSql = beforeOrder + sql.substring(limitIdx);
          } else {
            fallbackSql = beforeOrder;
          }
        }
        try {
          const stmt = db.prepare(fallbackSql);
          rows = stmt.all(...params) as any[];
        } catch (fallbackErr: any) {
          console.error("❌ Fallback query also failed:", fallbackErr.message);
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }
    
    // For legacy 'documents' table, we return the parsed JSON 'data'
    if (tableName === 'documents') {
       return rows.map(r => JSON.parse(r.data));
    }
    
    return rows.map(row => {
      // Common field normalization
      if (row.created_at) { row.createdAt = row.created_at; }
      if (row.updated_at) { row.updatedAt = row.updated_at; }
      
      // Table specific normalization
      if (tableName === 'certifications') {
        if (typeof row.remarks === 'string') {
          try { row.remarks = JSON.parse(row.remarks); } catch(e) { row.remarks = []; }
        }
        row.gpsVerified = row.gps_verified === 1;
        row.fraudFlag = row.fraud_flag === 1;
        row.gpsPhotoUrl = row.gps_photo_url;
        row.gpsPhotoLat = row.gps_photo_lat;
        row.gpsPhotoLng = row.gps_photo_lng;
        row.gpsPhotoTimestamp = row.gps_photo_timestamp;
        
        row.altitude = row.altitude;
        row.accuracy = row.accuracy;
        row.street = row.street;
        row.area = row.area;
        row.locality = row.locality;
        row.district = row.district;
        row.state = row.state;
        row.country = row.country;
        row.postalCode = row.postal_code;
        row.timezone = row.timezone;
        row.deviceTimestamp = row.device_timestamp;
        row.browserTimestamp = row.browser_timestamp;
        row.googleMapsUrl = row.google_maps_url;
        
        row.certificateUrl = row.certificate_url || row.file_url;
        row.fileUrl = row.certificate_url || row.file_url;
        row.certificatePublicId = row.certificate_public_id;
        row.certificateFileType = row.certificate_file_type;
        row.certificateFileName = row.certificate_file_name;
        row.certificateUploadedAt = row.certificate_uploaded_at;
        
        row.proofPhotoUrl = row.proof_photo_url || row.photo_url;
        row.photoUrl = row.proof_photo_url || row.photo_url;
        row.proofPhotoPublicId = row.proof_photo_public_id;
        row.proofPhotoFileType = row.proof_photo_file_type;
        row.proofPhotoFileName = row.proof_photo_file_name;
        row.proofPhotoUploadedAt = row.proof_photo_uploaded_at;
        
        row.exifLatitude = row.exif_lat;
        row.exifLongitude = row.exif_lng;
        row.exifTimestamp = row.exif_timestamp;
        row.exifCamera = row.exif_camera;
        row.exifDevice = row.exif_device;
        row.exifVerificationResult = row.exif_verification_result;
        row.verificationStatus = row.exif_verification_result || 'Missing EXIF';
        row.academicYear = row.academic_year;
        row.academic_year = row.academic_year;
      }
      return row;
    });
  } catch (err) {
    console.error("SQL Query Failed:", sql, err);
    return [];
  }
}

initDb();

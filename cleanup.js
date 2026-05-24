import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new Database(dbPath);

console.log('Running cleanup...');

const emails = [
  'superadmin@certtrack.com',
  'admin@test.com',
  'hod@test.com',
  'staff@test.com',
  'student@test.com'
];

for (const email of emails) {
  const user = db.prepare('SELECT uid FROM users WHERE email = ?').get(email);
  if (user) {
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    db.prepare('DELETE FROM students WHERE user_id = ?').run(user.uid);
    console.log(`Deleted user: ${email}`);
  }
}

console.log('Done cleanup.');

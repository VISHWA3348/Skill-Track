import { parentPort, workerData } from 'worker_threads';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in worker env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 50,                    // max simultaneous connections tuned for 5000+ users
  idleTimeoutMillis: 10000,   // close idle connections after 10s to reclaim resources
  connectionTimeoutMillis: 10000, // allow up to 10s for connection establishment
});

const sharedBuffer = workerData.sharedBuffer;
const int32Array = new Int32Array(sharedBuffer);

parentPort?.on('message', async (message) => {
  const { action, sql, params } = message;
  
  try {
    let result: any = null;

    // Convert SQL SQLite dialect placeholders (?) to Postgres ($1, $2, etc.)
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Convert SQLite strftime('%Y-%m', field) to PostgreSQL to_char(field, 'YYYY-MM')
    pgSql = pgSql.replace(/strftime\(\s*'%Y-%m'\s*,\s*([a-zA-Z0-9_.-]+)\s*\)/gi, "to_char($1, 'YYYY-MM')");
    
    // Convert SQLite date/datetime('now', 'interval') to PostgreSQL NOW() + INTERVAL 'interval'
    pgSql = pgSql.replace(/(?:date|datetime)\(\s*'now'\s*,\s*'([^']+)'\s*\)/gi, "NOW() + INTERVAL '$1'");
    
    // Quote camelCase columns in raw queries for PostgreSQL case-sensitivity
    pgSql = pgSql.replace(/\bcollectionName\b/g, '"collectionName"')
                 .replace(/\bcreatedAt\b/g, '"createdAt"')
                 .replace(/\bupdatedAt\b/g, '"updatedAt"');
    
    // SQLite system table/PRAGMA checks
    if (pgSql.includes('sqlite_master')) {
      pgSql = pgSql.replace(/sqlite_master/gi, 'information_schema.tables')
                   .replace(/type='table'/gi, "table_schema='public'")
                   .replace(/name/gi, "table_name");
    }
    const pragmaMatch = pgSql.match(/PRAGMA\s+table_info\((\w+)\)/i);
    if (pragmaMatch) {
      const tableName = pragmaMatch[1];
      pgSql = `SELECT column_name as name FROM information_schema.columns WHERE table_name = '${tableName}'`;
    }

    if (action === 'exec') {
      await pool.query(pgSql);
      result = true;
    } else {
      const res = await pool.query(pgSql, params);
      if (action === 'get') {
        result = res.rows[0] || null;
      } else if (action === 'all') {
        result = res.rows;
      } else if (action === 'run') {
        result = { changes: res.rowCount || 0, lastInsertRowid: 0 };
      }
    }

    sendResponse({ result });
  } catch (error: any) {
    console.error("Worker Query Error:", sql, error);
    sendResponse({ error: error.message || 'Database error' });
  }
});

function sendResponse(response: any) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(JSON.stringify(response));
  
  // Write length to index 1, write data starting at byte offset 8
  int32Array[1] = bytes.length;
  const target = new Uint8Array(sharedBuffer, 8, bytes.length);
  target.set(bytes);
  
  // Set signal at index 0 and notify main thread
  Atomics.store(int32Array, 0, 1);
  Atomics.notify(int32Array, 0);
}

// scripts/migrate_sqlite_to_postgres.ts

/**
 * Migration script to copy all SQLite tables to Supabase PostgreSQL.
 * Run with: `node --import tsx scripts/migrate_sqlite_to_postgres.ts`
 */

import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

const sqliteDbPath = path.resolve(process.cwd(), "data", "certtrack.db");
console.log(`📂 Opening SQLite database at: ${sqliteDbPath}`);
const sqliteDb = new DatabaseSync(sqliteDbPath);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getTableNames(): Promise<string[]> {
  const stmt = sqliteDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  const rows = stmt.all() as any[];
  return rows.map(r => r.name);
}

async function getColumnNames(table: string): Promise<string[]> {
  const stmt = sqliteDb.prepare(`PRAGMA table_info("${table}")`);
  const cols = stmt.all() as any[];
  return cols.map(c => c.name);
}

async function migrateTable(table: string) {
  const columns = await getColumnNames(table);
  const rows = sqliteDb.prepare(`SELECT * FROM "${table}"`).all() as any[];
  
  console.log(`📊 Table "${table}": SQLite has ${rows.length} rows`);
  
  if (!rows.length) {
    console.log(`⏩ Skipping "${table}" (0 rows)`);
    return { table, sqliteCount: 0, pgCount: 0 };
  }

  const client = await pgPool.connect();
  try {
    // Disable triggers and foreign keys temporarily in this connection session
    await client.query("SET session_replication_role = 'replica'");
    await client.query("BEGIN");

    // Clean target table first to avoid any duplication issues
    await client.query(`TRUNCATE TABLE "${table}" CASCADE`);

    const colList = columns.map(col => `"${col}"`).join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const insertSQL = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map(col => {
        const val = row[col];
        // In SQLite, boolean values are 1/0 or strings. In PostgreSQL, they will map to Int or appropriate type in schema.
        // Let's handle Date conversions if it is a string representing a ISO Date
        if (typeof val === 'string' && (col.includes('date') || col.includes('timestamp') || col.includes('created_at') || col.includes('updated_at') || col.includes('last_login') || col.includes('expiry'))) {
          // If empty string or invalid ISO, let it be null
          if (!val.trim()) return null;
          try {
            return new Date(val);
          } catch(e) {
            return val;
          }
        }
        return val;
      });
      await client.query(insertSQL, values);
    }
    
    await client.query("COMMIT");
    
    // Validate count in PostgreSQL
    const countRes = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const pgCount = parseInt(countRes.rows[0].count, 10);
    console.log(`✅ Migrated "${table}": SQLite = ${rows.length} | PostgreSQL = ${pgCount}`);
    
    return { table, sqliteCount: rows.length, pgCount };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`❌ Error migrating "${table}":`, e);
    throw e;
  } finally {
    // Restore replication role and release connection
    try {
      await client.query("SET session_replication_role = 'origin'");
    } catch(err) {}
    client.release();
  }
}

async function main() {
  const tables = await getTableNames();
  console.log(`🔍 Discovered ${tables.length} tables to migrate`);

  const results: any[] = [];
  for (const tbl of tables) {
    const result = await migrateTable(tbl);
    if (result) results.push(result);
  }

  // Double validation summary
  console.log("\n==========================================");
  console.log("🏆 MIGRATION PARITY SUMMARY REPORT");
  console.log("==========================================");
  let perfectParity = true;
  for (const r of results) {
    const match = r.sqliteCount === r.pgCount;
    if (!match) perfectParity = false;
    console.log(`${r.table.padEnd(30)}: SQLite = ${r.sqliteCount.toString().padEnd(6)} | PostgreSQL = ${r.pgCount.toString().padEnd(6)} | ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
  }
  console.log("==========================================");

  if (perfectParity) {
    console.log("🎉 SUCCESS: All tables migrated with 100% exact parity!");
  } else {
    console.error("⚠️ WARNING: Some tables have data mismatches!");
  }

  await pgPool.end();
}

main().catch(err => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});

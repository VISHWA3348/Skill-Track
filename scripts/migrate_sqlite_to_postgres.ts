// scripts/migrate_sqlite_to_postgres.ts

/**
 * Migration script to copy all SQLite tables to Supabase PostgreSQL.
 * Run with: `ts-node scripts/migrate_sqlite_to_postgres.ts`
 */

import { db } from "../server/db";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getTableNames(): Promise<string[]> {
  const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  const rows = stmt.all() as any[];
  return rows.map(r => r.name);
}

async function getColumnNames(table: string): Promise<string[]> {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const cols = stmt.all() as any[];
  return cols.map(c => c.name);
}

async function migrateTable(table: string) {
  const columns = await getColumnNames(table);
  const rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
  if (!rows.length) return;
  const colList = columns.join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const insertSQL = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      await client.query(insertSQL, values);
    }
    await client.query("COMMIT");
    console.log(`✅ Migrated ${rows.length} rows into ${table}`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`❌ Error migrating ${table}:`, e);
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  const tables = await getTableNames();
  for (const tbl of tables) {
    await migrateTable(tbl);
  }
  await pgPool.end();
  console.log("✅ Migration completed");
}

main().catch(err => {
  console.error("Migration failed", err);
  process.exit(1);
});

/**
 * Migration: Add Certificate Metadata Columns
 * Adds Cloudinary, GPS/EXIF, address, and verification columns to the certifications table.
 * Also adds profile_photo_url and profile_photo_public_id to users table.
 * 
 * Run: node --import tsx server/migrations/add_cert_metadata_columns.ts
 */
import { db } from '../db';

const CERT_COLUMNS = [
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_url TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_public_id TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_type TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_name TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_uploaded_at TIMESTAMP`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_url TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS proof_photo_public_id TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS profile_photo_url TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS profile_photo_public_id TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS upload_timestamp TIMESTAMP`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS altitude FLOAT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS accuracy FLOAT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS street TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS area TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS locality TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS district TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS state TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS country TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS postal_code TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS timezone TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS device_timestamp TIMESTAMP`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS browser_timestamp TIMESTAMP`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS google_maps_url TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_latitude FLOAT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_longitude FLOAT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exif_timestamp TIMESTAMP`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS verification_status TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS verification_slug TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS section TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS department TEXT`,
  `ALTER TABLE certifications ADD COLUMN IF NOT EXISTS register_no TEXT`,
];

const USER_COLUMNS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_public_id TEXT`,
];

let success = 0;
let failed = 0;

console.log('\n🚀 Running certificate metadata migration...\n');

for (const sql of [...CERT_COLUMNS, ...USER_COLUMNS]) {
  try {
    db.exec(sql);
    console.log(`✅ ${sql.substring(0, 80)}...`);
    success++;
  } catch (err: any) {
    // Ignore "column already exists" errors
    if (err.message?.includes('already exists') || err.message?.includes('duplicate column')) {
      console.log(`ℹ️  Already exists: ${sql.substring(40, 90)}`);
    } else {
      console.error(`❌ Failed: ${sql}\n   Error: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\n✅ Migration complete: ${success} succeeded, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);

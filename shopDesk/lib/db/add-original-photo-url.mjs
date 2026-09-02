/**
 * One-time migration: add original_photo_url column to products table.
 * Run with:
 *   node scripts/add-original-photo-url.mjs
 * from the shopDesk directory with DATABASE_URL in the environment.
 */
import pg from "pg";

const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected to database.");

  // Add the column only if it doesn't already exist (idempotent)
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS original_photo_url TEXT;
  `);

  console.log("✓ Column 'original_photo_url' added to 'products' table (or already existed).");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}

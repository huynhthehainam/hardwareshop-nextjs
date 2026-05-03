const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

async function migrate() {
  let DB_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!DB_URL && SUPABASE_URL && DATABASE_PASSWORD) {
    console.log('Constructing DATABASE_URL from SUPABASE_URL and DATABASE_PASSWORD...');
    try {
      const projectRef = SUPABASE_URL.split('.')[0].split('//')[1];
      if (!projectRef) throw new Error('Could not parse project reference from SUPABASE_URL');
      DB_URL = `postgresql://postgres:${encodeURIComponent(DATABASE_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`;
    } catch (err) {
      console.error('Error constructing DB URL:', err.message);
      process.exit(1);
    }
  }

  if (!DB_URL) {
    console.error('Error: Database connection info missing.');
    process.exit(1);
  }

  const client = new Client({ connectionString: DB_URL, connectionTimeoutMillis: 10000 });
  await client.connect();

  try {
    console.log('Connected to Postgres. Initializing migration tracking...');

    // Ensure migration history table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Scan migration directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      // Check if already executed
      const res = await client.query('SELECT 1 FROM migration_history WHERE filename = $1', [filename]);
      
      if (res.rowCount > 0) {
        console.log(`Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`Applying ${filename}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migration_history (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      
      console.log(`✅ Applied ${filename}`);
    }

    console.log('🚀 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error('Error details:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✓ Database connected');
    
    // Test if table exists
    const result = await client.query(`
      SELECT EXISTS(
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_roles'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✓ user_roles table exists');
      
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('✗ user_roles table does NOT exist');
      console.log('\nCreating tables...');
      
      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          clerk_user_id TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          address TEXT NOT NULL DEFAULT '',
          phone TEXT NOT NULL DEFAULT '',
          next_of_kin_name TEXT NOT NULL DEFAULT '',
          next_of_kin_phone TEXT NOT NULL DEFAULT '',
          position TEXT NOT NULL DEFAULT '',
          application_notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          role TEXT,
          permissions TEXT[],
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      console.log('✓ user_roles table created');
    }
    
    client.release();
  } catch (error) {
    console.error('✗ Database error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

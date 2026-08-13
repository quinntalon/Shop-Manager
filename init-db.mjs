#!/usr/bin/env node

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

console.log('Connecting to database...');

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 5000,
  max: 1,
});

pool.on('error', (err) => {
  console.error('Pool error:', err.message);
  process.exit(1);
});

async function initDB() {
  const client = await pool.connect();
  
  try {
    console.log('Creating tables...\n');

    // Create user_roles table
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
    console.log('✓ Created user_roles table');

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created sessions table');

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category_id INTEGER,
        price NUMERIC(10, 2) NOT NULL,
        cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created products table');

    // Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created categories table');

    // Create sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        receipt_number TEXT NOT NULL UNIQUE,
        cashier_id INTEGER REFERENCES user_roles(id),
        total NUMERIC(10, 2) NOT NULL,
        paid NUMERIC(10, 2) NOT NULL,
        change NUMERIC(10, 2) NOT NULL,
        payment_method TEXT,
        customer_id INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created sales table');

    // Create stock_transfers table  
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        transfer_type TEXT NOT NULL,
        from_location TEXT,
        to_location TEXT,
        transferred_by TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created stock_transfers table');

    // Create loyalty_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        points_change INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created loyalty_transactions table');

    // Create receipt_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipt_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created receipt_templates table');

    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created settings table');

    console.log('\n✓ Database initialized successfully!');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

const url = new URL(connectionString);
url.searchParams.delete('sslmode');
const cleanConnectionString = url.toString();

const poolConfig: PoolConfig = {
  connectionString: cleanConnectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
};

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });

console.log('✅ Connected to Supabase PostgreSQL database');

export async function initializeDatabase() {
  try {
    console.log('⏳ Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection verified');
    
    console.log('⏳ Setting up database constraints...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_open_session 
      ON attendance (gym_id, member_id) 
      WHERE status = 'in' AND check_out_time IS NULL
    `);
    console.log('✅ Database constraints verified');
  } catch (error: any) {
    console.error('❌ Error connecting to database:', error.message || error);
    console.error('⚠️  Please check your DATABASE_URL and ensure Supabase allows connections from this IP');
    throw error;
  }
}

export { pool };

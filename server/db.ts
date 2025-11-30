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
};

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });

console.log('✅ Connected to Supabase PostgreSQL database');

export async function initializeDatabase() {
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection verified');
    
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_open_session 
      ON attendance (gym_id, member_id) 
      WHERE status = 'in' AND check_out_time IS NULL
    `);
    console.log('✅ Database constraints verified');
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    throw error;
  }
}

export { pool };

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolConfig } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const connectionString = process.env.DATABASE_URL;

export let supabase: SupabaseClient | null = null;
export let db: NodePgDatabase<typeof schema> | null = null;
export let pool: Pool | null = null;

let useSupabaseClient = false;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  useSupabaseClient = true;
  console.log('✅ Supabase client initialized');
}

if (connectionString) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    const cleanConnectionString = url.toString();

    const poolConfig: PoolConfig = {
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10,
    };

    pool = new Pool(poolConfig);
    db = drizzle(pool, { schema });
    console.log('✅ PostgreSQL pool initialized');
  } catch (error) {
    console.log('⚠️ PostgreSQL connection string parsing failed, using Supabase client only');
  }
}

if (!supabase && !db) {
  throw new Error('Either SUPABASE_URL/SUPABASE_ANON_KEY or DATABASE_URL must be configured');
}

export function isUsingSupabaseClient(): boolean {
  return useSupabaseClient && supabase !== null;
}

export async function initializeDatabase() {
  if (supabase) {
    try {
      console.log('⏳ Testing Supabase connection...');
      const { data, error } = await supabase.from('gyms').select('count').limit(1);
      
      if (error) {
        console.log('⚠️ Supabase query test:', error.message);
        if (error.message.includes('does not exist')) {
          console.log('📋 Tables may need to be created. Running schema setup...');
        }
      } else {
        console.log('✅ Supabase connection verified');
      }
    } catch (error: any) {
      console.error('❌ Supabase connection error:', error.message);
    }
  }

  if (pool) {
    try {
      console.log('⏳ Testing PostgreSQL connection...');
      const result = await pool.query('SELECT 1 as test');
      console.log('✅ PostgreSQL connection verified');

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_open_session 
        ON attendance (gym_id, member_id) 
        WHERE status = 'in' AND check_out_time IS NULL
      `);
      console.log('✅ Database constraints verified');
    } catch (error: any) {
      console.log('⚠️ PostgreSQL connection failed:', error.message);
      console.log('📌 Disabling PostgreSQL, using Supabase client for database operations');
      db = null;
      pool = null;
    }
  }
}

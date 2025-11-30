process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL must be set');
  process.exit(1);
}

const url = new URL(connectionString);
url.searchParams.delete('sslmode');
const cleanConnectionString = url.toString();

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runChecks() {
  console.log('🔍 Running database sanity checks...\n');

  try {
    const gymsResult = await pool.query('SELECT COUNT(*) as count FROM gyms');
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const membersResult = await pool.query('SELECT COUNT(*) as count FROM members');
    const leadsResult = await pool.query('SELECT COUNT(*) as count FROM leads');
    const trainersResult = await pool.query('SELECT COUNT(*) as count FROM trainers');
    const attendanceResult = await pool.query('SELECT COUNT(*) as count FROM attendance');

    console.log('✅ DB OK:');
    console.log(`   gyms: ${gymsResult.rows[0].count}`);
    console.log(`   users: ${usersResult.rows[0].count}`);
    console.log(`   members: ${membersResult.rows[0].count}`);
    console.log(`   leads: ${leadsResult.rows[0].count}`);
    console.log(`   trainers: ${trainersResult.rows[0].count}`);
    console.log(`   attendance: ${attendanceResult.rows[0].count}`);
    console.log('\n✅ All database checks passed!');

  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runChecks();

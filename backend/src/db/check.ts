import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecoflow',
    });

    const res = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
    `);

    console.log('Existing Database Tables in public schema:');
    console.log(res.rows.map(r => r.table_name));
    await pool.end();
}

main();

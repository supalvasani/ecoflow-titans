import pg from 'pg';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';

dotenv.config();

async function main() {
    console.log('Terminating existing connections and resetting public schema...');
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecoflow';
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });

    try {
        // Terminate any active connections holding lock on DB
        await pool.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = current_database() AND pid <> pg_backend_pid();
        `).catch(() => {});

        await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
        await pool.query('CREATE SCHEMA public;');
        await pool.query('GRANT ALL ON SCHEMA public TO public;');
        console.log('Public schema completely reset');
    } catch (err: any) {
        console.error('Schema drop error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }

    console.log('Pushing fresh schema to database using Drizzle Kit...');
    try {
        execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
        console.log('Database schema created cleanly!');
    } catch (pushErr: any) {
        console.error('Failed to push schema:', pushErr.message);
        process.exit(1);
    }
}

main();

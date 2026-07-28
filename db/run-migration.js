import fs from 'fs';
import path from 'path';
import pg from 'pg';

try {
    const envPath = path.resolve('./.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf-8');
        envFile.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length) {
                process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
            }
        });
    }
} catch (e) {}

const { Pool } = pg;

const baseConnStr = process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/postgres';

async function runMigration() {
    // 1. Connect to root db to ensure target database exists
    const rootPool = new Pool({ connectionString: baseConnStr });
    try {
        const res = await rootPool.query("SELECT 1 FROM pg_database WHERE datname = 'vaani_sahayak'");
        if (res.rows.length === 0) {
            await rootPool.query("CREATE DATABASE vaani_sahayak");
            console.log("Created database 'vaani_sahayak'");
        }
    } catch (e) {
        console.log("Root DB check:", e.message);
    } finally {
        await rootPool.end();
    }

    // 2. Connect to vaani_sahayak database
    const dbUrl = process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/vaani_sahayak';
    const pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();

    try {
        console.log("=== Running Migration: 001_create_farmer_plot_and_preferences.sql ===");
        
        // Ensure base FARMER table exists if dev database is clean
        await client.query(`
            CREATE TABLE IF NOT EXISTS "FARMER" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(250) NOT NULL,
                phone VARCHAR(20) UNIQUE,
                district VARCHAR(100),
                state VARCHAR(100),
                language VARCHAR(10) DEFAULT 'hi',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const migrationsDir = path.resolve('./db/migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            console.log(`=== Running Migration: ${file} ===`);
            const sqlPath = path.join(migrationsDir, file);
            const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
            await client.query(sqlContent);
        }
        console.log("=== All Migrations Applied Successfully! ===");
    } catch (err) {
        console.error("Migration Error:", err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();

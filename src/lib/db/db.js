import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Attempt to load .env.local if DATABASE_URL is not explicitly set
if (!process.env.DATABASE_URL) {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envFile = fs.readFileSync(envPath, 'utf-8');
            envFile.split('\n').forEach(line => {
                const [key, ...values] = line.split('=');
                if (key && values.length) {
                    process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
                }
            });
        }
    } catch (e) {
        // Ignore env loading error if file doesn't exist
    }
}

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/vaani_sahayak';

export const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

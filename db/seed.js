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

const connectionString = process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/vaani_sahayak';

const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const sampleFarmers = [
    {
        name: "Ramesh Patel",
        phone: "+919876543210",
        district: "Rajkot",
        state: "Gujarat",
        language: "gu",
        plot: {
            crop: "Cotton",
            land_acres: 4.5,
            sowing_date: "2026-06-15",
            expected_harvest_date: "2026-11-20",
            soil_type: "Black Cotton Soil"
        },
        preferences: {
            price_alert_threshold: 6500.0,
            alert_channels: ['push', 'sms', 'ivr'],
            notification_opt_in: true
        }
    },
    {
        name: "Gurpreet Singh",
        phone: "+919812345678",
        district: "Ludhiana",
        state: "Punjab",
        language: "pa",
        plot: {
            crop: "Wheat",
            land_acres: 8.0,
            sowing_date: "2026-11-05",
            expected_harvest_date: "2027-04-10",
            soil_type: "Alluvial Soil"
        },
        preferences: {
            price_alert_threshold: 2275.0,
            alert_channels: ['push', 'sms'],
            notification_opt_in: true
        }
    },
    {
        name: "Venkat Rao",
        phone: "+919440123456",
        district: "Guntur",
        state: "Andhra Pradesh",
        language: "te",
        plot: {
            crop: "Rice (Paddy)",
            land_acres: 3.2,
            sowing_date: "2026-07-01",
            expected_harvest_date: "2026-11-15",
            soil_type: "Red Clay Soil"
        },
        preferences: {
            price_alert_threshold: 2300.0,
            alert_channels: ['sms', 'ivr'],
            notification_opt_in: true
        }
    }
];

async function seed() {
    const client = await pool.connect();
    try {
        console.log("=== Starting Database Seeding ===");

        for (const farmerData of sampleFarmers) {
            // 1. Find existing or insert new FARMER
            let farmerId;
            const existingRes = await client.query(`SELECT id FROM "FARMER" WHERE name = $1 OR phone = $2 LIMIT 1`, [farmerData.name, farmerData.phone]);
            
            if (existingRes.rows.length > 0) {
                farmerId = existingRes.rows[0].id;
                console.log(`[Farmer] Reusing existing record for "${farmerData.name}" (${farmerId})`);
            } else {
                const insertFarmerRes = await client.query(
                    `INSERT INTO "FARMER" (name, phone, district, state, language) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [farmerData.name, farmerData.phone, farmerData.district, farmerData.state, farmerData.language]
                );
                farmerId = insertFarmerRes.rows[0].id;
                console.log(`[Farmer] Created new farmer "${farmerData.name}" (${farmerId})`);
            }

            // 2. Upsert / Insert FARMER_PLOT
            const existingPlot = await client.query(`SELECT id FROM "FARMER_PLOT" WHERE farmer_id = $1 LIMIT 1`, [farmerId]);
            if (existingPlot.rows.length === 0) {
                const insertPlotRes = await client.query(
                    `INSERT INTO "FARMER_PLOT" (farmer_id, crop, land_acres, sowing_date, expected_harvest_date, soil_type)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [
                        farmerId,
                        farmerData.plot.crop,
                        farmerData.plot.land_acres,
                        farmerData.plot.sowing_date,
                        farmerData.plot.expected_harvest_date,
                        farmerData.plot.soil_type
                    ]
                );
                console.log(` -> Added FARMER_PLOT: ${farmerData.plot.crop} (${farmerData.plot.land_acres} acres) [ID: ${insertPlotRes.rows[0].id}]`);
            } else {
                console.log(` -> FARMER_PLOT already exists for ${farmerData.name}`);
            }

            // 3. Upsert / Insert FARMER_PREFERENCES
            const existingPref = await client.query(`SELECT id FROM "FARMER_PREFERENCES" WHERE farmer_id = $1 LIMIT 1`, [farmerId]);
            if (existingPref.rows.length === 0) {
                const insertPrefRes = await client.query(
                    `INSERT INTO "FARMER_PREFERENCES" (farmer_id, price_alert_threshold, alert_channels, notification_opt_in)
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [
                        farmerId,
                        farmerData.preferences.price_alert_threshold,
                        farmerData.preferences.alert_channels,
                        farmerData.preferences.notification_opt_in
                    ]
                );
                console.log(` -> Added FARMER_PREFERENCES: Channels [${farmerData.preferences.alert_channels.join(', ')}] [ID: ${insertPrefRes.rows[0].id}]`);
            } else {
                console.log(` -> FARMER_PREFERENCES already exist for ${farmerData.name}`);
            }
        }

        console.log("\n=== Seeding Completed Successfully ===");
    } catch (err) {
        console.error("Seeding Error:", err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();

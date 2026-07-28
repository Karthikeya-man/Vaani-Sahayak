import { pool } from '../src/lib/db/db.js';

const DISTRICTS = [
    { district: 'Rajkot', state: 'Gujarat' },
    { district: 'Ludhiana', state: 'Punjab' },
    { district: 'Guntur', state: 'Andhra Pradesh' },
    { district: 'Nashik', state: 'Maharashtra' },
    { district: 'Karnal', state: 'Haryana' },
    { district: 'Madurai', state: 'Tamil Nadu' },
    { district: 'Bathinda', state: 'Punjab' },
    { district: 'Surat', state: 'Gujarat' },
    { district: 'Warangal', state: 'Telangana' },
    { district: 'Patna', state: 'Bihar' }
];

const CROPS = ['Cotton', 'Wheat', 'Rice (Paddy)', 'Mustard', 'Sugarcane', 'Maize', 'Tomato', 'Chilli', 'Onion', 'Groundnut'];
const LANGUAGES = ['hi', 'gu', 'pa', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'or', 'as', 'en'];
const SOIL_TYPES = ['Black Cotton Soil', 'Alluvial Soil', 'Red Sandy Soil', 'Clay Loam', 'Laterite Soil'];

const FIRST_NAMES = ['Ramesh', 'Suresh', 'Gurpreet', 'Venkat', 'Bhavesh', 'Mahesh', 'Rajesh', 'Harpreet', 'Lakshman', 'Balwinder', 'Subba', 'Dinesh', 'Kalyan', 'Manoj', 'Prakash', 'Sunil', 'Vijay', 'Amrit', 'Devendra', 'Jagdish'];
const LAST_NAMES = ['Patel', 'Singh', 'Rao', 'Shah', 'Sharma', 'Reddy', 'Choudhary', 'Gowda', 'Kumar', 'Verma', 'Naidu', 'Yadav', 'Deshmukh', 'Kaur', 'Joshi', 'Mehta', 'Nair', 'Sinha', 'Pawar', 'Bhat'];

export async function seed200Farmers() {
    console.log("======================================================");
    console.log("🌱 [SEED 200 FARMERS] Seeding 200 farmers into PostgreSQL DB");
    console.log("======================================================");

    let createdCount = 0;

    for (let i = 1; i <= 200; i++) {
        const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
        const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
        const name = `${firstName} ${lastName} #${i}`;
        const phone = `+91987${String(i).padStart(7, '0')}`;
        
        const loc = DISTRICTS[i % DISTRICTS.length];
        const crop = CROPS[i % CROPS.length];
        const lang = LANGUAGES[i % LANGUAGES.length];
        const soil = SOIL_TYPES[i % SOIL_TYPES.length];
        const acres = parseFloat((2.0 + (i % 15) * 0.5).toFixed(1));

        // Random harvest date within next 5 to 25 days
        const harvestDays = 5 + (i % 20);
        const harvestDate = new Date(Date.now() + harvestDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const sowingDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 1. Upsert Farmer
        const farmerRes = await pool.query(`
            INSERT INTO "FARMER" (name, phone, district, state, language)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
            RETURNING id;
        `, [name, phone, loc.district, loc.state, lang]);

        let farmerId;
        if (farmerRes.rows.length > 0) {
            farmerId = farmerRes.rows[0].id;
        } else {
            const existing = await pool.query(`SELECT id FROM "FARMER" WHERE phone = $1 LIMIT 1`, [phone]);
            farmerId = existing.rows[0]?.id;
        }

        if (farmerId) {
            // 2. Upsert Preferences
            await pool.query(`
                INSERT INTO "FARMER_PREFERENCES" (farmer_id, price_alert_threshold, alert_channels, notification_opt_in)
                VALUES ($1, 5.0, ARRAY['push', 'sms', 'ivr'], true)
                ON CONFLICT (id) DO NOTHING;
            `, [farmerId]);

            // 3. Upsert Farmer Plot
            await pool.query(`DELETE FROM "FARMER_PLOT" WHERE farmer_id = $1`, [farmerId]);
            await pool.query(`
                INSERT INTO "FARMER_PLOT" (farmer_id, crop, land_acres, sowing_date, expected_harvest_date, soil_type)
                VALUES ($1, $2, $3, $4, $5, $6);
            `, [farmerId, crop, acres, sowingDate, harvestDate, soil]);

            createdCount++;
        }
    }

    console.log(`✅ Successfully seeded/verified ${createdCount} farmers in PostgreSQL!`);
    console.log("======================================================\n");
    return createdCount;
}

if (process.argv[1] && (process.argv[1].endsWith('seed200Farmers.js') || process.argv[1].includes('seed200Farmers'))) {
    seed200Farmers()
        .then(() => pool.end())
        .catch(err => {
            console.error("Fatal seed error:", err);
            pool.end();
            process.exit(1);
        });
}

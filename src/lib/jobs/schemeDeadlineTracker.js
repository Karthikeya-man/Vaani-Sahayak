import { pool } from '../db/db.js';
import { getFarmerState } from '../db/farmerState.js';
import { notifyFarmer } from './notifyFarmer.js';

/**
 * Checks upcoming scheme deadlines within 14 days matching farmer eligibility,
 * pre-populates form_data from farmerState.js, creates SCHEME_APPLICATION in 'pending_confirmation' state,
 * and sends confirmation notification via notifyFarmer.js.
 */
export async function runSchemeDeadlineTrackerJob() {
    console.log(`\n======================================================`);
    console.log(`📋 [SCHEME DEADLINE TRACKER JOB START] ${new Date().toISOString()}`);
    console.log(`======================================================`);

    // 1. Fetch eligible schemes within 14 days
    const schemeQuery = `
        SELECT id, title, crop, district, deadline, description
        FROM "SCHEME"
        WHERE deadline >= CURRENT_DATE 
          AND deadline <= CURRENT_DATE + INTERVAL '14 days';
    `;
    const { rows: schemes } = await pool.query(schemeQuery);
    console.log(`Found ${schemes.length} schemes with deadlines within 14 days.`);

    // 2. Fetch active farmers
    const { rows: farmers } = await pool.query(`SELECT id, name, phone, district, state, language FROM "FARMER"`);

    let flaggedCount = 0;
    let skippedCount = 0;

    for (const farmer of farmers) {
        const farmerState = await getFarmerState(farmer.id);
        if (!farmerState) continue;

        const plot = farmerState.plot || {};

        for (const s of schemes) {
            // Check eligibility (crop & district match if specified)
            const cropMatch = !s.crop || !plot.crop || s.crop.toLowerCase() === plot.crop.toLowerCase();
            const districtMatch = !s.district || !farmerState.district || s.district.toLowerCase() === farmerState.district.toLowerCase();

            if (!cropMatch || !districtMatch) continue;

            // Check if SCHEME_APPLICATION already exists
            const existingRes = await pool.query(
                `SELECT id, status FROM "SCHEME_APPLICATION" WHERE farmer_id = $1 AND scheme_id = $2 LIMIT 1`,
                [farmer.id, s.id]
            );

            if (existingRes.rows.length > 0) {
                skippedCount++;
                continue;
            }

            // Pre-populate form_data from farmerState.js
            const formData = {
                farmer_name: farmerState.name,
                phone: farmerState.phone,
                district: farmerState.district,
                state: farmerState.state,
                crop: plot.crop || 'Cotton',
                land_acres: plot.land_acres || 4.0,
                soil_type: plot.soil_type || 'Black Cotton Soil',
                sowing_date: plot.sowing_date || '2026-06-15'
            };

            // Identify missing fields requiring farmer upload
            const missingFields = ['aadhaar_card_scan', 'bank_passbook_copy'];

            // Insert SCHEME_APPLICATION row with status = 'pending_confirmation'
            const insertAppQuery = `
                INSERT INTO "SCHEME_APPLICATION" (farmer_id, scheme_id, status, form_data, missing_fields)
                VALUES ($1, $2, 'pending_confirmation', $3, $4)
                RETURNING id;
            `;
            const appRes = await pool.query(insertAppQuery, [
                farmer.id, s.id, JSON.stringify(formData), missingFields
            ]);

            console.log(`  -> Flagged Scheme "${s.title}" for Farmer ${farmer.name} (App ID: ${appRes.rows[0].id})`);

            // Send confirmation prompt via notifyFarmer.js
            const confirmMsg = `Ready to apply for ${s.title} using your saved details — reply YES to confirm.`;
            await notifyFarmer({
                farmer: {
                    id: farmerState.id,
                    name: farmerState.name,
                    phone: farmerState.phone,
                    language: farmerState.language,
                    preferences: farmerState.preferences
                },
                messageEnglish: confirmMsg,
                title: `📝 Scheme Deadline Alert: ${s.title}`,
                severity: 'medium',
                alertType: 'scheme_confirmation_prompt'
            });

            flaggedCount++;
        }
    }

    console.log(`\n======================================================`);
    console.log(`🏁 [SCHEME DEADLINE TRACKER SUMMARY] Flagged: ${flaggedCount} | Already Existing/Skipped: ${skippedCount}`);
    console.log(`======================================================\n`);

    return { flaggedCount, skippedCount };
}

// Allow direct CLI execution
if (process.argv[1] && (process.argv[1].endsWith('schemeDeadlineTracker.js') || process.argv[1].includes('schemeDeadlineTracker'))) {
    runSchemeDeadlineTrackerJob()
        .then(() => pool.end())
        .catch(err => {
            console.error('Fatal execution error in schemeDeadlineTracker.js:', err);
            pool.end();
            process.exit(1);
        });
}

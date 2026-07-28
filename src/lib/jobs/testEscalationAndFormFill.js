import { pool } from '../db/db.js';
import { processCropScan } from '../agent/cropScan.js';
import { runSchemeDeadlineTrackerJob } from './schemeDeadlineTracker.js';
import { executeSchemeFormFill, confirmSchemeApplication } from '../agent/schemeFormFiller.js';

async function runEndToEndEscalationAndFormFillTests() {
    console.log(`\n======================================================`);
    console.log(`🧪 [VAANI SAHAYAK — HUMAN-IN-LOOP & FORM-FILL TEST SUITE]`);
    console.log(`======================================================\n`);

    try {
        // Fetch test farmer Ramesh Patel
        const farmerRes = await pool.query(`SELECT id, name, phone, district, language FROM "FARMER" WHERE name = 'Ramesh Patel' LIMIT 1`);
        if (farmerRes.rows.length === 0) {
            throw new Error('Test farmer Ramesh Patel not found in database');
        }
        const ramesh = farmerRes.rows[0];

        // Reset test state in REVIEW_QUEUE & SCHEME_APPLICATION
        await pool.query(`DELETE FROM "REVIEW_QUEUE" WHERE farmer_id = $1`, [ramesh.id]);
        await pool.query(`DELETE FROM "SCHEME_APPLICATION" WHERE farmer_id = $1`, [ramesh.id]);
        console.log(`[Test Prep] Cleared review queue and scheme applications for ${ramesh.name}.`);

        // -----------------------------------------------------------------
        // TEST 1: PART A — Low Confidence Crop Scan Escalation (<70%)
        // -----------------------------------------------------------------
        console.log(`\n==============================================`);
        console.log(`▶ TEST 1: PART A — Low Confidence Crop Scan (<70%)`);
        console.log(`==============================================`);
        const scanResult1 = await processCropScan({
            farmerId: ramesh.id,
            imageUrl: 'https://vaanisahayak.gov.in/scans/cotton_leaf_spot.jpg',
            diseaseDetected: 'Suspected Leaf Spot',
            confidence: 0.58, // < 70% threshold!
            crop: 'Cotton',
            district: ramesh.district
        });
        console.log(`Result 1:`, scanResult1);

        // -----------------------------------------------------------------
        // TEST 2: PART A — Unapproved Treatment Dosage Lookup Failure
        // -----------------------------------------------------------------
        console.log(`\n==============================================`);
        console.log(`▶ TEST 2: PART A — Unapproved Dosage Lookup Failure`);
        console.log(`==============================================`);
        const scanResult2 = await processCropScan({
            farmerId: ramesh.id,
            imageUrl: 'https://vaanisahayak.gov.in/scans/unverified_fungus.jpg',
            diseaseDetected: 'Unknown Rare Fungus',
            confidence: 0.92, // High confidence, BUT disease not in APPROVED_TREATMENTS table!
            crop: 'Cotton',
            district: ramesh.district
        });
        console.log(`Result 2:`, scanResult2);

        // -----------------------------------------------------------------
        // TEST 3: PART A — Agricultural Officer Review & Resolution
        // -----------------------------------------------------------------
        console.log(`\n==============================================`);
        console.log(`▶ TEST 3: PART A — Admin Review Queue Resolution`);
        console.log(`==============================================`);
        const pendingQueue = await pool.query(`SELECT id, type, item_id, ai_guess FROM "REVIEW_QUEUE" WHERE farmer_id = $1 AND status = 'pending' LIMIT 1`, [ramesh.id]);
        if (pendingQueue.rows.length > 0) {
            const item = pendingQueue.rows[0];
            console.log(`Officer reviewing queue item #${item.id} (AI Guess: "${item.ai_guess}")`);
            
            // Simulate officer submitting review override via API handler logic
            const correctedAnswer = "Spray Copper Oxychloride 50% WP @ 3g per liter of water. Repeat in 10 days.";
            await pool.query(
                `UPDATE "REVIEW_QUEUE" SET status = 'overridden', assigned_officer = 'Dr. K. Sharma (KVK)', notes = $1 WHERE id = $2`,
                [correctedAnswer, item.id]
            );
            await pool.query(
                `UPDATE "CROP_SCAN" SET status = 'completed', solution = $1 WHERE id = $2`,
                [correctedAnswer, item.item_id]
            );
            console.log(`✅ Officer successfully reviewed item #${item.id}. Updated solution: "${correctedAnswer}"`);
        }

        // -----------------------------------------------------------------
        // TEST 4: PART B — Scheme Deadline Tracker (Matches within 14 days)
        // -----------------------------------------------------------------
        console.log(`\n==============================================`);
        console.log(`▶ TEST 4: PART B — Scheme Deadline Tracker & Pre-Fill Confirmation`);
        console.log(`==============================================`);
        const trackerResult = await runSchemeDeadlineTrackerJob();
        console.log(`Tracker Result:`, trackerResult);

        // -----------------------------------------------------------------
        // TEST 5: PART B — Farmer Confirmation & Playwright Form-Fill (Success)
        // -----------------------------------------------------------------
        console.log(`\n==============================================`);
        console.log(`▶ TEST 5: PART B — Farmer Reply "YES" -> Playwright Success`);
        console.log(`==============================================`);
        const pendingApp = await pool.query(`SELECT id FROM "SCHEME_APPLICATION" WHERE farmer_id = $1 AND status = 'pending_confirmation' LIMIT 1`, [ramesh.id]);
        let confirmedAppId = null;
        if (pendingApp.rows.length > 0) {
            confirmedAppId = pendingApp.rows[0].id;
            const fillResult = await confirmSchemeApplication(ramesh.id, confirmedAppId);
            console.log(`Playwright Form Fill Result (Success Path):`, fillResult);
        }

        // -----------------------------------------------------------------
        // TEST 6: PART B — Playwright Form-Fill Failure Escalation to Review Queue
        // -----------------------------------------------------------------
        console.log(`\n==============================================`);
        console.log(`▶ TEST 6: PART B — Playwright Portal Failure Escalation`);
        console.log(`==============================================`);
        // Insert dummy application to test failure handling
        const schemeRes = await pool.query(`SELECT id FROM "SCHEME" LIMIT 1`);
        if (schemeRes.rows.length > 0) {
            const dummyAppRes = await pool.query(
                `INSERT INTO "SCHEME_APPLICATION" (farmer_id, scheme_id, status, form_data) VALUES ($1, $2, 'confirmed', $3) RETURNING id`,
                [ramesh.id, schemeRes.rows[0].id, JSON.stringify({ name: ramesh.name, district: ramesh.district })]
            );
            const failResult = await executeSchemeFormFill(dummyAppRes.rows[0].id, { simulateFailure: true });
            console.log(`Playwright Form Fill Result (Failure Escalation Path):`, failResult);
        }

        // -----------------------------------------------------------------
        // SUMMARY REPORT
        // -----------------------------------------------------------------
        const finalQueueCount = await pool.query(`SELECT COUNT(*) FROM "REVIEW_QUEUE" WHERE farmer_id = $1`, [ramesh.id]);
        const finalApps = await pool.query(`SELECT status, COUNT(*) FROM "SCHEME_APPLICATION" WHERE farmer_id = $1 GROUP BY status`, [ramesh.id]);

        console.log(`\n======================================================`);
        console.log(`📊 [INTEGRATION TEST VERIFICATION SUMMARY]`);
        console.log(`======================================================`);
        console.log(`Farmer: ${ramesh.name} (${ramesh.district}, ${ramesh.language.toUpperCase()})`);
        console.log(`Total Review Queue Entries Logged: ${finalQueueCount.rows[0].count}`);
        console.log(`Scheme Application Status Breakdown:`, finalApps.rows);
        console.log(`======================================================\n`);

    } catch (err) {
        console.error('❌ Test Suite Execution Error:', err);
    } finally {
        await pool.end();
    }
}

runEndToEndEscalationAndFormFillTests();

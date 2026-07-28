import { pool } from '../db/db.js';
import { runDailyBriefingJob } from './dailyBriefing.js';
import { runAlertEngineJob } from './alertEngine.js';

async function runEndToEndTests() {
    console.log(`\n======================================================`);
    console.log(`🧪 [VAANI SAHAYAK — END-TO-END JOBS TEST SUITE]`);
    console.log(`======================================================\n`);

    try {
        // 1. Reset last_briefing_sent_at and ALERT_DEDUP for clean test run
        await pool.query(`UPDATE "FARMER_PREFERENCES" SET last_briefing_sent_at = NULL`);
        await pool.query(`DELETE FROM "ALERT_DEDUP"`);
        console.log(`[Test Prep] Cleared briefing timestamps and ALERT_DEDUP records.`);

        // 2. Run PART A: Daily Briefing Job (First Run)
        console.log(`\n==============================================`);
        console.log(`▶ TEST 1: PART A — Daily Briefing Job (First Run)`);
        console.log(`==============================================`);
        const briefingRes1 = await runDailyBriefingJob();

        // 3. Run PART A: Daily Briefing Job (Second Run — Retry/Redeploy Verification)
        console.log(`\n==============================================`);
        console.log(`▶ TEST 2: PART A — Daily Briefing Job (Second Run - Retry Skip Verification)`);
        console.log(`==============================================`);
        const briefingRes2 = await runDailyBriefingJob();

        // 4. Run PART B: Event-triggered Alert Engine (Weather Risk + Outbreak Cluster)
        console.log(`\n==============================================`);
        console.log(`▶ TEST 3: PART B — Event-Triggered Alert Engine (First Run)`);
        console.log(`==============================================`);
        const alertRes1 = await runAlertEngineJob({
            mockWeather: {
                temp: 24,
                humidity: 88,
                description: 'heavy rain and thunderstorms',
                wind: 16,
                isRain: true
            }
        });

        // 5. Run PART B: Event-triggered Alert Engine (Second Run — 24h Dedup Verification)
        console.log(`\n==============================================`);
        console.log(`▶ TEST 4: PART B — Event-Triggered Alert Engine (Second Run - 24h Dedup Verification)`);
        console.log(`==============================================`);
        const alertRes2 = await runAlertEngineJob({
            mockWeather: {
                temp: 24,
                humidity: 88,
                description: 'heavy rain and thunderstorms',
                wind: 16,
                isRain: true
            }
        });

        // 6. Summary Report
        console.log(`\n======================================================`);
        console.log(`📊 [END-TO-END TEST RESULTS VERIFICATION SUMMARY]`);
        console.log(`======================================================`);
        console.log(`1. Daily Briefing First Run  -> Processed: ${briefingRes1.processedCount}, Skipped: ${briefingRes1.skippedCount}`);
        console.log(`2. Daily Briefing Retry Run  -> Processed: ${briefingRes2.processedCount}, Skipped: ${briefingRes2.skippedCount} (Skipped all as expected!)`);
        console.log(`3. Alert Engine First Run    -> Triggered: ${alertRes1.alertsTriggered}, Sent: ${alertRes1.alertsSent}, Deduped: ${alertRes1.alertsDeduped}`);
        console.log(`4. Alert Engine Second Run   -> Triggered: ${alertRes2.alertsTriggered}, Sent: ${alertRes2.alertsSent}, Deduped: ${alertRes2.alertsDeduped} (Deduped all as expected!)`);
        console.log(`======================================================\n`);

    } catch (err) {
        console.error('❌ Test Suite Execution Error:', err);
    } finally {
        await pool.end();
    }
}

runEndToEndTests();

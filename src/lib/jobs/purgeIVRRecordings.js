import { pool } from '../db/db.js';

/**
 * 30-Day Automated Purge Job for IVR Call Recordings & Transcripts
 * Deletes CONVERSATION entries for channel='ivr' older than 30 days.
 */
export async function runPurgeIVRRecordingsJob(retentionDays = 30) {
    console.log(`\n======================================================`);
    console.log(`🧹 [IVR 30-DAY PURGE JOB START] ${new Date().toISOString()}`);
    console.log(`Retention Window: ${retentionDays} Days`);
    console.log(`======================================================`);

    const query = `
        DELETE FROM "CONVERSATION"
        WHERE channel = 'ivr'
          AND created_at < NOW() - INTERVAL '${retentionDays} days'
        RETURNING id;
    `;

    const { rows } = await pool.query(query);
    const purgedCount = rows.length;

    console.log(`✅ [IVR Purge Job] Successfully purged ${purgedCount} IVR call recording(s) older than ${retentionDays} days.`);
    console.log(`======================================================\n`);

    return { purgedCount, retentionDays };
}

// CLI execution
if (process.argv[1] && (process.argv[1].endsWith('purgeIVRRecordings.js') || process.argv[1].includes('purgeIVRRecordings'))) {
    runPurgeIVRRecordingsJob()
        .then(() => pool.end())
        .catch(err => {
            console.error('Fatal execution error in purgeIVRRecordings.js:', err);
            pool.end();
            process.exit(1);
        });
}

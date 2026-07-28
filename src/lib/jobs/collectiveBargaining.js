import fs from 'fs';
import path from 'path';
import { pool } from '../db/db.js';
import { notifyFarmer } from './notifyFarmer.js';
import { isDuplicateAlert, recordSentAlert } from './alertEngine.js';

// Load .env.local if present
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
} catch (e) {}

/**
 * Detects collective-bargaining transport pooling opportunities:
 * Multiple farmers in the same district growing the same crop with harvest dates within ±7 days.
 */
export async function detectCollectiveBargainingPools() {
    const query = `
        SELECT 
            f.id as farmer_id,
            f.name,
            f.phone,
            f.district,
            f.state,
            f.language,
            p.crop,
            p.land_acres,
            p.expected_harvest_date,
            pref.alert_channels
        FROM "FARMER" f
        JOIN "FARMER_PLOT" p ON f.id = p.farmer_id
        JOIN "FARMER_PREFERENCES" pref ON f.id = pref.farmer_id
        WHERE pref.notification_opt_in = true;
    `;

    const { rows: records } = await pool.query(query);
    if (records.length === 0) return [];

    // Group farmers by district + crop and proximity of expected_harvest_date (within 7 days)
    const clusters = [];
    const processedIndices = new Set();

    for (let i = 0; i < records.length; i++) {
        if (processedIndices.has(i)) continue;

        const base = records[i];
        const baseDistrict = (base.district || '').trim().toLowerCase();
        const baseCrop = (base.crop || '').trim().toLowerCase();
        const baseDate = base.expected_harvest_date ? new Date(base.expected_harvest_date) : new Date();

        const clusterFarmers = [base];
        processedIndices.add(i);

        for (let j = i + 1; j < records.length; j++) {
            if (processedIndices.has(j)) continue;

            const target = records[j];
            const targetDistrict = (target.district || '').trim().toLowerCase();
            const targetCrop = (target.crop || '').trim().toLowerCase();
            const targetDate = target.expected_harvest_date ? new Date(target.expected_harvest_date) : new Date();

            const isSameDistrict = baseDistrict === targetDistrict;
            const isSameCrop = baseCrop === targetCrop;
            const daysDiff = Math.abs((targetDate.getTime() - baseDate.getTime()) / (1000 * 3600 * 24));

            if (isSameDistrict && isSameCrop && daysDiff <= 7) {
                clusterFarmers.push(target);
                processedIndices.add(j);
            }
        }

        if (clusterFarmers.length >= 2) {
            clusters.push({
                district: base.district,
                crop: base.crop,
                farmerCount: clusterFarmers.length,
                farmers: clusterFarmers
            });
        }
    }

    return clusters;
}

/**
 * Main execution handler for Collective Bargaining Job
 */
export async function runCollectiveBargainingJob() {
    console.log(`\n======================================================`);
    console.log(`🤝 [COLLECTIVE BARGAINING POOLING JOB START] ${new Date().toISOString()}`);
    console.log(`======================================================`);

    const pools = await detectCollectiveBargainingPools();
    console.log(`Found ${pools.length} collective bargaining cluster(s).`);

    let notificationsSent = 0;
    let notificationsDeduped = 0;

    for (const poolItem of pools) {
        const { district, crop, farmerCount, farmers } = poolItem;
        console.log(`\n📍 Cluster: ${farmerCount} farmers in ${district} harvesting ${crop}.`);

        // Strictly Anonymized Message: Contains count and crop, ZERO names/phones
        const messageEnglish = `${farmerCount} farmers near you in ${district} also have ${crop} ready for harvest this week — pool transport to local Mandi for a better rate!`;

        for (const farmerRecord of farmers) {
            try {
                // Check 24-hour deduplication
                const isDup = await isDuplicateAlert(farmerRecord.farmer_id, 'collective_bargaining_pool');
                if (isDup) {
                    console.log(`  [Dedup Skip] Farmer ${farmerRecord.farmer_id} already received pooling alert in last 24h.`);
                    notificationsDeduped++;
                    continue;
                }

                const farmerObj = {
                    id: farmerRecord.farmer_id,
                    name: farmerRecord.name,
                    phone: farmerRecord.phone,
                    language: farmerRecord.language,
                    preferences: { alert_channels: farmerRecord.alert_channels }
                };

                await notifyFarmer({
                    farmer: farmerObj,
                    messageEnglish,
                    title: '🤝 Collective Transport Pooling Alert',
                    severity: 'medium',
                    alertType: 'collective_bargaining_pool'
                });

                await recordSentAlert(farmerRecord.farmer_id, 'collective_bargaining_pool', 'medium', messageEnglish);
                notificationsSent++;

            } catch (err) {
                console.error(`❌ Error notifying farmer ${farmerRecord.farmer_id}:`, err.message);
            }
        }
    }

    console.log(`\n======================================================`);
    console.log(`🏁 [COLLECTIVE BARGAINING SUMMARY] Clusters: ${pools.length} | Sent: ${notificationsSent} | Deduped: ${notificationsDeduped}`);
    console.log(`======================================================\n`);

    return { clustersCount: pools.length, notificationsSent, notificationsDeduped };
}

// CLI execution
if (process.argv[1] && (process.argv[1].endsWith('collectiveBargaining.js') || process.argv[1].includes('collectiveBargaining'))) {
    runCollectiveBargainingJob()
        .then(() => pool.end())
        .catch(err => {
            console.error('Fatal execution error in collectiveBargaining.js:', err);
            pool.end();
            process.exit(1);
        });
}

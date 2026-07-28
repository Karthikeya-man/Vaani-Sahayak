import fs from 'fs';
import path from 'path';
import { pool } from '../db/db.js';
import { notifyFarmer } from './notifyFarmer.js';

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

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

/**
 * Recommended Schedule & API Quota Explanation:
 * ----------------------------------------------------
 * OpenWeatherMap Free Tier Limit: 1,000 API calls/day.
 * 
 * Recommended Schedule: Every 6 hours (0 6 * * * cron expression) -> 4 runs per day.
 * For 50 active farmers, 4 runs/day = 200 weather calls/day for alerts + 50 for daily briefing
 * Total: ~250 calls/day (well within the 1,000 calls/day limit).
 */
export const RECOMMENDED_CRON_SCHEDULE = "0 */6 * * *"; // Every 6 hours

/**
 * Checks 24-hour deduplication log in Postgres database
 * Returns true if an alert of same type was sent to farmer in last 24h
 */
export async function isDuplicateAlert(farmerId, alertType) {
    const query = `
        SELECT id FROM "ALERT_DEDUP"
        WHERE farmer_id = $1 
          AND alert_type = $2 
          AND sent_at >= NOW() - INTERVAL '24 hours'
        LIMIT 1;
    `;
    const { rows } = await pool.query(query, [farmerId, alertType]);
    return rows.length > 0;
}

/**
 * Records sent alert in database for 24h dedup tracking
 */
export async function recordSentAlert(farmerId, alertType, severity, message) {
    const query = `
        INSERT INTO "ALERT_DEDUP" (farmer_id, alert_type, severity, message)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
    `;
    await pool.query(query, [farmerId, alertType, severity, message]);
}

/**
 * Weather Risk Checker using OpenWeather API & weather tool rules
 * Flags: humidity>80%+rain (harvest risk), frost warning, cyclone/heavy rain
 */
export async function checkWeatherRisks(farmerId, plot, district = 'Rajkot', mockWeatherOverride = null) {
    let weatherData = mockWeatherOverride;

    if (!weatherData && OPENWEATHER_API_KEY) {
        try {
            const cityQuery = district.toUpperCase().endsWith(',IN') ? district : `${district},IN`;
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityQuery)}&units=metric&appid=${OPENWEATHER_API_KEY}`);
            if (res.ok) {
                const data = await res.json();
                weatherData = {
                    temp: Math.round(data.main.temp),
                    humidity: data.main.humidity,
                    description: data.weather[0]?.description || 'clear sky',
                    wind: data.wind?.speed || 0,
                    isRain: (data.weather[0]?.description || '').toLowerCase().includes('rain') || (data.weather[0]?.description || '').toLowerCase().includes('drizzle')
                };
            }
        } catch (e) {
            console.warn(`[AlertEngine Weather] Weather fetch failed for ${district}: ${e.message}`);
        }
    }

    // Default mock weather data if live API unavailable
    if (!weatherData) {
        weatherData = { temp: 28, humidity: 65, description: 'clear sky', wind: 5, isRain: false };
    }

    const risks = [];
    const desc = weatherData.description.toLowerCase();

    // Risk 1: High Humidity + Rain (Harvest Risk)
    if (weatherData.humidity >= 80 && weatherData.isRain) {
        risks.push({
            type: 'weather_harvest_risk',
            severity: 'high',
            title: '⚠️ High Harvest Risk Warning',
            message: `High humidity (${weatherData.humidity}%) and rain expected in ${district}. Delay crop harvesting and protect harvested produce to prevent fungal decay.`
        });
    }

    // Risk 2: Frost Warning
    if (weatherData.temp < 10 || desc.includes('frost') || desc.includes('freezing') || desc.includes('snow')) {
        risks.push({
            type: 'weather_frost_warning',
            severity: 'medium',
            title: '❄️ Frost & Cold Temperature Alert',
            message: `Temperature dropping to ${weatherData.temp}°C in ${district}. Cover sensitive young crops overnight and irrigate lightly to prevent frost damage.`
        });
    }

    // Risk 3: Cyclone / Heavy Rain / High Winds
    if (weatherData.wind > 15 || desc.includes('cyclone') || desc.includes('thunderstorm') || desc.includes('heavy rain')) {
        risks.push({
            type: 'weather_severe_storm',
            severity: 'high',
            title: '🚨 Severe Storm & Heavy Wind Warning',
            message: `Severe weather warning in ${district}: winds up to ${weatherData.wind} m/s and storm conditions. Secure farm structures and suspend aerial spraying immediately.`
        });
    }

    return risks;
}

/**
 * Checks for disease outbreak clusters across recent crop scans in a district
 * Query CROP_SCAN for same disease within district in last 7 days.
 * Threshold: >= 3 scans flags cluster alert for other farmers growing that crop.
 */
export async function checkOutbreakCluster(cropType, region, threshold = 3) {
    const query = `
        SELECT disease, COUNT(*) AS scan_count
        FROM "CROP_SCAN"
        WHERE LOWER(crop) = LOWER($1) 
          AND LOWER(district) = LOWER($2)
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY disease
        HAVING COUNT(*) >= $3;
    `;
    const { rows } = await pool.query(query, [cropType, region, threshold]);
    
    return rows.map(r => ({
        disease: r.disease,
        scanCount: parseInt(r.scan_count, 10),
        crop: cropType,
        district: region,
        severity: 'high',
        type: 'disease_outbreak_cluster',
        title: `🐛 Disease Outbreak Alert: ${r.disease}`,
        message: `High alert! ${r.scan_count} recent outbreaks of "${r.disease}" reported in ${region} district for ${cropType}. Inspect your crop immediately and apply preventative measures.`
    }));
}

/**
 * Main execution handler for Alert Engine job
 */
export async function runAlertEngineJob(options = {}) {
    console.log(`\n======================================================`);
    console.log(`⚡ [ALERT ENGINE JOB START] ${new Date().toISOString()}`);
    console.log(`Schedule Frequency: ${RECOMMENDED_CRON_SCHEDULE} (Every 6 hours | Max 1000 weather calls/day)`);
    console.log(`======================================================`);

    const query = `
        SELECT 
            f.id, f.name, f.phone, f.district, f.state, f.language,
            p.crop, p.land_acres, p.sowing_date, p.expected_harvest_date, p.soil_type,
            pref.price_alert_threshold, pref.alert_channels, pref.notification_opt_in
        FROM "FARMER" f
        JOIN "FARMER_PREFERENCES" pref ON f.id = pref.farmer_id
        LEFT JOIN "FARMER_PLOT" p ON f.id = p.farmer_id
        WHERE pref.notification_opt_in = true;
    `;

    const { rows: farmers } = await pool.query(query);
    console.log(`Checking alert triggers for ${farmers.length} active farmers.`);

    let alertsTriggered = 0;
    let alertsSent = 0;
    let alertsDeduped = 0;

    for (const f of farmers) {
        try {
            const farmerDistrict = f.district || 'Rajkot';
            const farmerCrop = f.crop || 'Cotton';

            // 1. Check Weather Risks
            const weatherRisks = await checkWeatherRisks(f.id, f.plot, farmerDistrict, options.mockWeather);

            // 2. Check Outbreak Clusters
            const outbreakClusters = await checkOutbreakCluster(farmerCrop, farmerDistrict);

            const allTriggeredAlerts = [...weatherRisks, ...outbreakClusters];

            for (const alert of allTriggeredAlerts) {
                alertsTriggered++;

                // 3. Check 24-hour Deduplication
                const isDup = await isDuplicateAlert(f.id, alert.type);
                if (isDup) {
                    console.log(`\n[Dedup Skip] Farmer ${f.name} (${f.id}) already received alert "${alert.type}" in last 24h.`);
                    alertsDeduped++;
                    continue;
                }

                // 4. Send via shared notifyFarmer pipeline
                const farmerObj = {
                    id: f.id,
                    name: f.name,
                    phone: f.phone,
                    language: f.language,
                    preferences: { alert_channels: f.alert_channels }
                };

                await notifyFarmer({
                    farmer: farmerObj,
                    messageEnglish: alert.message,
                    title: alert.title,
                    severity: alert.severity,
                    alertType: alert.type
                });

                // 5. Record sent alert in ALERT_DEDUP table
                await recordSentAlert(f.id, alert.type, alert.severity, alert.message);
                alertsSent++;
            }

        } catch (err) {
            console.error(`❌ Error in alertEngine for farmer ${f.name} (${f.id}):`, err.message);
        }
    }

    console.log(`\n======================================================`);
    console.log(`🏁 [ALERT ENGINE SUMMARY] Triggered: ${alertsTriggered} | Sent: ${alertsSent} | Deduped: ${alertsDeduped}`);
    console.log(`======================================================\n`);

    return { alertsTriggered, alertsSent, alertsDeduped };
}

// Allow direct execution from CLI
if (process.argv[1] && (process.argv[1].endsWith('alertEngine.js') || process.argv[1].includes('alertEngine'))) {
    runAlertEngineJob()
        .then(() => pool.end())
        .catch(err => {
            console.error('Fatal execution error in alertEngine.js:', err);
            pool.end();
            process.exit(1);
        });
}

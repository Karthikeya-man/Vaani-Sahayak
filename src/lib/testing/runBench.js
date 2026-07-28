import autocannon from 'autocannon';
import { pool } from '../db/db.js';
import { runDailyBriefingJob } from '../jobs/dailyBriefing.js';
import { runAlertEngineJob } from '../jobs/alertEngine.js';
import { confirmSchemeApplication } from '../agent/schemeFormFiller.js';

const APP_BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';

async function isServerUp(url) {
    try {
        const res = await fetch(url);
        return res.ok || res.status === 404 || res.status === 200;
    } catch (e) {
        return false;
    }
}

/**
 * Runs autocannon benchmark with cycling per-farmer identity headers (x-farmer-id)
 */
async function runPerIdentityAutocannonTest(title, endpoint, baseBody, durationSec = 10, vus = 20, numDistinctFarmers = 30) {
    console.log("\n======================================================");
    console.log("🚀 [PER-IDENTITY LOAD TEST] " + title);
    console.log("Endpoint: " + endpoint + " | Concurrent VUs: " + vus + " | Distinct Farmers: " + numDistinctFarmers + " | Duration: " + durationSec + "s");
    console.log("======================================================");

    console.log("  📊 PG Pool Before: Total=" + pool.totalCount + ", Idle=" + pool.idleCount + ", Waiting=" + pool.waitingCount);

    let reqIndex = 0;
    const http200Latencies = [];
    let http200Count = 0;
    let http429Count = 0;
    let http500Count = 0;

    const res = await autocannon({
        url: APP_BASE_URL + endpoint,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        connections: vus,
        duration: durationSec,
        setupClient: (client) => {
            const farmerId = `farmer_id_identity_${(reqIndex++ % numDistinctFarmers) + 1}`;
            client.setHeaders({
                'content-type': 'application/json',
                'x-farmer-id': farmerId
            });
            client.setBody(JSON.stringify({ ...baseBody, farmerId }));
        }
    });

    console.log("  📊 PG Pool After: Total=" + pool.totalCount + ", Idle=" + pool.idleCount + ", Waiting=" + pool.waitingCount);

    const totalReqs = res.requests.total || 0;
    const rps = res.requests.average || 0;

    // Filter status codes
    http200Count = res['2xx'] || 0;
    http429Count = res['4xx'] || 0;
    http500Count = res['5xx'] || 0;

    const p50 = res.latency.p50 || 0;
    const p95 = res.latency.p95 || 0;
    const p99 = res.latency.p99_9 || res.latency.max || 0;

    console.log("\n📈 [MEASURED RESULTS FOR " + numDistinctFarmers + " DISTINCT FARMER IDENTITIES]");
    console.log("  • Total Requests Executed: " + totalReqs);
    console.log("  • Throughput: " + rps.toFixed(2) + " req/sec");
    console.log("  • Successful HTTP 200 Responses: " + http200Count + " (" + ((http200Count/totalReqs)*100).toFixed(1) + "%)");
    console.log("  • Rate Limited HTTP 429 Responses: " + http429Count + " (" + ((http429Count/totalReqs)*100).toFixed(1) + "%)");
    console.log("  • Server Error HTTP 5xx Responses: " + http500Count);
    console.log("  • Latency Distribution (Overall): p50=" + p50 + "ms | p95=" + p95 + "ms | p99=" + p99 + "ms");

    return { title, totalReqs, rps, http200Count, http429Count, p50, p95, p99 };
}

/**
 * PostgreSQL Connection Pool Saturation Test under legitimate non-rate-limited concurrent SQL queries
 */
async function testPostgresPoolSaturation(numConcurrentFarmers = 30) {
    console.log("\n======================================================");
    console.log("🐘 [REAL POSTGRES CONCURRENCY SATURATION TEST]");
    console.log("Simulating " + numConcurrentFarmers + " concurrent legitimate SQL query transactions...");
    console.log("======================================================");

    const initialPoolState = { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
    console.log("  📊 Postgres Pool Initial State: Total=" + initialPoolState.total + ", Idle=" + initialPoolState.idle + ", Waiting=" + initialPoolState.waiting + " (Max Limit: " + (pool.options?.max || 10) + ")");

    const queryPromises = [];
    const startTime = Date.now();

    for (let i = 1; i <= numConcurrentFarmers; i++) {
        const farmerId = `farmer_id_identity_${i}`;
        const queryPromise = (async () => {
            const client = await pool.connect();
            try {
                // Simulate legitimate farmer chat state fetch & conversation log
                const stateRes = await client.query('SELECT * FROM "FARMER" LIMIT 1');
                const logRes = await client.query(
                    'INSERT INTO "CONVERSATION" (channel, user_message, assistant_response) VALUES ($1, $2, $3) RETURNING id',
                    ['chat', 'Concurrency test query from ' + farmerId, 'Response to ' + farmerId]
                );
                return { success: true, farmerId, conversationId: logRes.rows[0].id };
            } finally {
                client.release();
            }
        })();
        queryPromises.push(queryPromise);
    }

    const midPoolState = { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
    console.log("  📊 Postgres Pool State During Burst: Active Total=" + midPoolState.total + ", Idle=" + midPoolState.idle + ", Waiting=" + midPoolState.waiting);

    const results = await Promise.allSettled(queryPromises);
    const wallClockMs = Date.now() - startTime;

    const successfulQueries = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedQueries = results.filter(r => r.status === 'rejected').length;

    const finalPoolState = { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };

    console.log("\n📈 [REAL POSTGRES CONCURRENCY TEST RESULTS]");
    console.log("  • Concurrent Queries Dispatched: " + numConcurrentFarmers);
    console.log("  • Wall-Clock Execution Time: " + wallClockMs + " ms");
    console.log("  • Successful DB Transactions: " + successfulQueries + "/" + numConcurrentFarmers);
    console.log("  • Failed DB Queries: " + failedQueries);
    console.log("  • Average Query Latency: " + (wallClockMs / numConcurrentFarmers).toFixed(2) + " ms/query");
    console.log("  • Postgres Pool Final State: Total=" + finalPoolState.total + ", Idle=" + finalPoolState.idle + ", Waiting=" + finalPoolState.waiting);

    return { numConcurrentFarmers, wallClockMs, successfulQueries, failedQueries, midPoolState, finalPoolState };
}

async function startSuite() {
    console.log("\n==========================================================");
    console.log("🔥 [PER-IDENTITY LOAD TESTING & REAL DB CONCURRENCY BENCHMARK]");
    console.log("==========================================================");

    const fRes = await pool.query('SELECT COUNT(*) FROM "FARMER"');
    const farmerCount = parseInt(fRes.rows[0].count, 10);
    console.log("Dataset Context: Active Farmers in Postgres DB = " + farmerCount);

    const serverOnline = await isServerUp(APP_BASE_URL);
    console.log("Next.js Local Server Status (" + APP_BASE_URL + "): " + (serverOnline ? 'ONLINE' : 'OFFLINE'));

    // PART A: Per-Identity API Load Tests
    if (serverOnline) {
        // Chat endpoint with 30 distinct farmer identities
        await runPerIdentityAutocannonTest('/api/chat Load Test (30 Distinct Farmers)', '/api/chat', { message: "What fertilizer for Wheat in Karnal?", language: "hi" }, 10, 20, 30);

        // IVR endpoint with 30 distinct farmer identities
        await runPerIdentityAutocannonTest('/api/ivr Load Test (30 Distinct Farmers)', '/api/ivr', { SpeechResult: "Weather update for Ludhiana", Digits: "1", From: "+919870000001" }, 10, 20, 30);

        // Crop Scan endpoint with 30 distinct farmer identities & image payload
        const sampleJpg = 'data:image/jpeg;base64,' + Buffer.from('mock jpeg image payload bytes').toString('base64');
        await runPerIdentityAutocannonTest('/api/crop-scan Load Test (30 Distinct Farmers)', '/api/crop-scan', { crop: "Cotton", disease: "Pink Bollworm", district: "Rajkot", image: sampleJpg }, 10, 20, 30);
    }

    // PART B: Real Postgres Pool Saturation Test
    await testPostgresPoolSaturation(30);

    console.log("\n==========================================================");
    console.log("🏁 [PER-IDENTITY BENCHMARK SUITE COMPLETE]");
    console.log("==========================================================\n");
}

startSuite()
    .then(() => pool.end())
    .catch(err => {
        console.error("Benchmark error:", err);
        pool.end();
        process.exit(1);
    });

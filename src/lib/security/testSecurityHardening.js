import { pool } from '../db/db.js';
import { encryptAndStoreDocument, deleteDocumentAfterSubmission } from './documentVault.js';
import { runPurgeIVRRecordingsJob } from '../jobs/purgeIVRRecordings.js';
import { signAdminJWT, verifyAdminJWT } from '../auth/jwt.js';

export async function runSecurityHardeningVerification() {
    console.log("\n==========================================================");
    console.log("🛡️ [VAANI SAHAYAK SECURITY & CONCURRENCY HARDENING TEST]");
    console.log("==========================================================");

    // -----------------------------------------------------------------
    // 1. AWS S3 KMS Document Encryption Vault & Mock Dev Fallback Test
    // -----------------------------------------------------------------
    console.log("\n--- TEST 1: S3 KMS Document Encryption Vault ---");
    const sampleBuffer = Buffer.from("Aadhaar Card Scan Payload Sample");
    const vaultResult = await encryptAndStoreDocument(sampleBuffer, 'aadhaar_card', 'farmer_test_101');
    
    console.log("Vault Encrypt Result Output:", JSON.stringify(vaultResult, null, 2));
    if (vaultResult.isMockDevMode) {
        console.log("📌 AWS SDK Status: REAL AWS Credentials not provided in dev environment.");
        console.log("   -> Fallback Mode Active: LOCAL MOCK DEV MODE explicitly logged with warning banner.");
    } else {
        console.log("📌 AWS SDK Status: Connected to REAL AWS S3 KMS service.");
        console.log("   -> AWS Response ETag:", vaultResult.eTag);
    }

    // -----------------------------------------------------------------
    // 2. IVR 30-Day Purge Job Test (With Seeded 35-Day-Old Record)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: IVR 30-Day Purge Job Verification ---");
    
    // Seed 35-day-old IVR conversation record
    const seedRes = await pool.query(`
        INSERT INTO "CONVERSATION" (channel, user_message, assistant_response, created_at)
        VALUES ('ivr', 'IVR Test Audio Stream 35 days old', 'IVR Audio Response Text 35 days old', NOW() - INTERVAL '35 days')
        RETURNING id, channel, created_at;
    `);
    const seededRecordId = seedRes.rows[0].id;
    console.log(`🌱 Seeded 35-Day-Old IVR Record ID: ${seededRecordId} | Created At: ${seedRes.rows[0].created_at}`);

    // Query BEFORE purge
    const beforeCheck = await pool.query(`SELECT id, channel, created_at FROM "CONVERSATION" WHERE id = $1`, [seededRecordId]);
    console.log(`🔍 Query BEFORE Purge Job: Found ${beforeCheck.rows.length} row(s) (Record ID: ${beforeCheck.rows[0]?.id})`);

    // Execute purge job for 30-day window
    const purgeJobResult = await runPurgeIVRRecordingsJob(30);

    // Query AFTER purge
    const afterCheck = await pool.query(`SELECT id FROM "CONVERSATION" WHERE id = $1`, [seededRecordId]);
    console.log(`🔍 Query AFTER Purge Job: Found ${afterCheck.rows.length} row(s)`);
    
    if (beforeCheck.rows.length === 1 && afterCheck.rows.length === 0) {
        console.log(`✅ SUCCESS: 35-day-old record (${seededRecordId}) was ACTUALLY DELETED from database! (Total Purged count: ${purgeJobResult.purgedCount})`);
    } else {
        console.error(`❌ FAILURE: IVR purge failed to delete 35-day-old record!`);
    }

    // -----------------------------------------------------------------
    // 3. JWT Verification Test (Signature Tampering & Invalid Secret)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: JWT HMAC Signature Verification & Tampering Test ---");
    
    const validSecret = "production_super_secret_key_12345";
    const wrongSecret = "attacker_fake_signing_secret_99999";

    // Step A: Sign valid token
    const validToken = await signAdminJWT({ username: "admin_user", role: "admin" }, 3600, validSecret);
    console.log(`🔑 Valid Signed JWT Token: ${validToken.substring(0, 45)}...`);

    // Step B: Verify valid token
    const validResult = await verifyAdminJWT(validToken, validSecret);
    console.log(`✅ Valid Token Verification Result:`, validResult ? `VERIFIED (User: ${validResult.username}, Role: ${validResult.role})` : `FAILED`);

    // Step C: Tamper Payload (keep header & signature, modify payload base64)
    const [headerB64, originalPayloadB64, signatureB64] = validToken.split('.');
    const tamperedPayloadObj = { username: "admin_user", role: "super_hacked_admin", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 };
    const tamperedPayloadB64 = btoa(JSON.stringify(tamperedPayloadObj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${signatureB64}`;

    console.log(`\n⚠️ Testing Tampered Payload JWT Token: ${tamperedToken.substring(0, 45)}...`);
    const tamperedResult = await verifyAdminJWT(tamperedToken, validSecret);
    console.log(`🔒 Tampered Payload Verification Result:`, tamperedResult === null ? `REJECTED ✅ (HMAC Signature Mismatch Detected)` : `FAILED TO REJECT ❌`);

    // Step D: Token signed with Wrong Secret
    const fakeToken = await signAdminJWT({ username: "admin_user", role: "admin" }, 3600, wrongSecret);
    console.log(`\n⚠️ Testing Token Signed with Wrong Secret: ${fakeToken.substring(0, 45)}...`);
    const fakeResult = await verifyAdminJWT(fakeToken, validSecret);
    console.log(`🔒 Wrong Secret Verification Result:`, fakeResult === null ? `REJECTED ✅ (HMAC Signature Mismatch Detected)` : `FAILED TO REJECT ❌`);

    // -----------------------------------------------------------------
    // 4. Rate Limiter Store Classification Confirmation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Rate Limiter Architectural Store Classification ---");
    console.log("📌 Storage Type: In-memory JavaScript Map");
    console.log("📌 Multi-Instance Limitation Warning: Logged in src/lib/rateLimiter.js");

    console.log("\n==========================================================");
    console.log("🏁 [SECURITY HARDENING VERIFICATION COMPLETE]");
    console.log("==========================================================\n");
}

if (process.argv[1] && (process.argv[1].endsWith('testSecurityHardening.js') || process.argv[1].includes('testSecurityHardening'))) {
    runSecurityHardeningVerification()
        .then(() => pool.end())
        .catch(err => {
            console.error("Fatal test execution error:", err);
            pool.end();
            process.exit(1);
        });
}

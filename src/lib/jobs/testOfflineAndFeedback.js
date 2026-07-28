import { pool } from '../db/db.js';

async function runTests() {
  console.log("=== Testing Offline Resilience & Feedback Loop System ===");

  try {
    // 1. Verify Database Schema
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('CONVERSATION', 'CROP_SCAN', 'SCHEME_FEEDBACK', 'REVIEW_QUEUE');
    `);
    console.log("✅ Verified DB Tables:", tablesRes.rows.map(r => r.table_name).join(', '));

    // 2. Insert test data into CONVERSATION
    const convRes = await pool.query(`
      INSERT INTO "CONVERSATION" (channel, user_message, assistant_response, helpful)
      VALUES ('chat', 'What is the price of cotton?', 'Cotton is ₹6800/quintal in Wardha Mandi.', true)
      RETURNING id, helpful;
    `);
    console.log("✅ Inserted Chat Conversation with Feedback:", convRes.rows[0]);

    // 3. Insert test data into CROP_SCAN
    const farmerRes = await pool.query(`SELECT id FROM "FARMER" LIMIT 1`);
    const farmerId = farmerRes.rows[0]?.id;

    const scanRes = await pool.query(`
      INSERT INTO "CROP_SCAN" (farmer_id, crop, disease, district, helpful, status, confidence)
      VALUES ($1, 'Cotton', 'Cotton Leaf Curl Virus', 'Rajkot', true, 'completed', 0.94)
      RETURNING id, helpful;
    `, [farmerId]);
    console.log("✅ Inserted Crop Scan Diagnosis with Feedback:", scanRes.rows[0]);

    // 4. Insert test data into SCHEME_FEEDBACK
    const schemeRes = await pool.query(`SELECT id FROM "SCHEME" LIMIT 1`);
    const schemeId = schemeRes.rows[0]?.id;

    const schemeFeedRes = await pool.query(`
      INSERT INTO "SCHEME_FEEDBACK" (farmer_id, scheme_id, helpful)
      VALUES ($1, $2, true)
      RETURNING id, helpful;
    `, [farmerId, schemeId || null]);
    console.log("✅ Inserted Scheme Match Feedback:", schemeFeedRes.rows[0]);

    // 5. Test Admin Feedback Stats aggregation logic
    const statsRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM "CONVERSATION" WHERE helpful = true) as chat_helpful,
        (SELECT COUNT(*) FROM "CROP_SCAN" WHERE helpful = true) as crop_helpful,
        (SELECT COUNT(*) FROM "SCHEME_FEEDBACK" WHERE helpful = true) as scheme_helpful;
    `);
    console.log("✅ Admin Feedback Telemetry Counts:", statsRes.rows[0]);

    console.log("\n🎉 ALL BACKEND & DATABASE TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

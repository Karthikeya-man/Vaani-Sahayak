import { pool } from '../db/db.js';
import { getFarmerState } from '../db/farmerState.js';
import { notifyFarmer } from '../jobs/notifyFarmer.js';

/**
 * Validates crop disease diagnosis, confidence, and treatment dosage against APPROVED_TREATMENTS.
 * Escalates to REVIEW_QUEUE and notifies farmer if confidence < 70% or dosage is unverified.
 *
 * @param {Object} params
 * @param {string} params.farmerId - Farmer UUID
 * @param {string} [params.imageUrl="https://vaanisahayak.gov.in/scans/sample_leaf.jpg"] - Scan image URL
 * @param {string} params.diseaseDetected - AI guessed disease name
 * @param {number} params.confidence - AI confidence score (0.0 to 1.0)
 * @param {string} [params.crop="Cotton"] - Crop type
 * @param {string} [params.district="Rajkot"] - District name
 * @returns {Promise<Object>} Scan processing result
 */
export async function processCropScan({
    farmerId,
    imageUrl = 'https://vaanisahayak.gov.in/scans/sample_leaf.jpg',
    diseaseDetected,
    confidence = 0.95,
    crop = 'Cotton',
    district = 'Rajkot'
}) {
    if (!farmerId) {
        throw new Error('farmerId is required for crop scan processing');
    }

    const farmer = await getFarmerState(farmerId);
    if (!farmer) {
        throw new Error(`Farmer ${farmerId} not found`);
    }

    // 1. Insert initial CROP_SCAN record
    const insertScanQuery = `
        INSERT INTO "CROP_SCAN" (farmer_id, crop, disease, district, confidence, image_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    // Step A: Check AI Confidence Threshold (< 70%)
    if (confidence < 0.70) {
        console.log(`\n[CropScan Alert] Confidence is ${Math.round(confidence * 100)}% (< 70%). Escalating to REVIEW_QUEUE.`);

        const scanRes = await pool.query(insertScanQuery, [
            farmerId, crop, diseaseDetected || 'Unknown Pest/Disease', district, confidence, imageUrl, 'needs_review'
        ]);
        const scanRecord = scanRes.rows[0];

        // Insert into REVIEW_QUEUE
        const queueRes = await pool.query(
            `INSERT INTO "REVIEW_QUEUE" (item_id, type, farmer_id, status, ai_guess, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
            [
                scanRecord.id,
                'scan',
                farmerId,
                'pending',
                `Disease: ${diseaseDetected} (Confidence: ${Math.round(confidence * 100)}%)`,
                'Low confidence score (< 70%) requires agricultural officer review.'
            ]
        );

        // Notify Farmer via notifyFarmer.js
        const notifyMsg = `Your crop photo needs expert review — an officer will contact you within 24 hours.`;
        await notifyFarmer({
            farmer: {
                id: farmer.id,
                name: farmer.name,
                phone: farmer.phone,
                language: farmer.language,
                preferences: farmer.preferences
            },
            messageEnglish: notifyMsg,
            title: `🌾 Crop Scan Under Officer Review`,
            severity: 'medium',
            alertType: 'crop_scan_escalation'
        });

        return {
            status: 'escalated',
            reason: 'low_confidence',
            scanId: scanRecord.id,
            queueId: queueRes.rows[0].id,
            message: notifyMsg
        };
    }

    // Step B: Validate Pesticide / Dosage Recommendation against APPROVED_TREATMENTS
    const treatmentRes = await pool.query(
        `SELECT treatment_dosage FROM "APPROVED_TREATMENTS" WHERE LOWER(disease) = LOWER($1) LIMIT 1;`,
        [diseaseDetected]
    );

    if (treatmentRes.rows.length === 0) {
        console.log(`\n[CropScan Alert] Disease "${diseaseDetected}" not in APPROVED_TREATMENTS database. Escalating to prevent unverified dosage recommendation.`);

        const scanRes = await pool.query(insertScanQuery, [
            farmerId, crop, diseaseDetected, district, confidence, imageUrl, 'needs_review'
        ]);
        const scanRecord = scanRes.rows[0];

        // Insert into REVIEW_QUEUE
        const queueRes = await pool.query(
            `INSERT INTO "REVIEW_QUEUE" (item_id, type, farmer_id, status, ai_guess, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
            [
                scanRecord.id,
                'scan',
                farmerId,
                'pending',
                `Disease: ${diseaseDetected} (Confidence: ${Math.round(confidence * 100)}%)`,
                'Unverified dosage — disease not in APPROVED_TREATMENTS lookup table.'
            ]
        );

        // Notify Farmer via notifyFarmer.js
        const notifyMsg = `Your crop photo needs expert review — an officer will contact you within 24 hours with exact dosage recommendations.`;
        await notifyFarmer({
            farmer: {
                id: farmer.id,
                name: farmer.name,
                phone: farmer.phone,
                language: farmer.language,
                preferences: farmer.preferences
            },
            messageEnglish: notifyMsg,
            title: `🌾 Dosage Verification Under Review`,
            severity: 'medium',
            alertType: 'crop_scan_escalation'
        });

        return {
            status: 'escalated',
            reason: 'unapproved_treatment',
            scanId: scanRecord.id,
            queueId: queueRes.rows[0].id,
            message: notifyMsg
        };
    }

    // Success Path: High confidence + Approved dosage lookup
    const safeDosageText = treatmentRes.rows[0].treatment_dosage;
    const scanRes = await pool.query(insertScanQuery, [
        farmerId, crop, diseaseDetected, district, confidence, imageUrl, 'completed'
    ]);
    await pool.query(
        `UPDATE "CROP_SCAN" SET solution = $1 WHERE id = $2;`,
        [safeDosageText, scanRes.rows[0].id]
    );

    return {
        status: 'completed',
        scanId: scanRes.rows[0].id,
        disease: diseaseDetected,
        confidence,
        solution: safeDosageText
    };
}

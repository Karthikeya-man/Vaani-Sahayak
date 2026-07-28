import { pool } from '@/lib/db/db.js';
import { getFarmerState } from '@/lib/db/farmerState.js';
import { notifyFarmer } from '@/lib/jobs/notifyFarmer.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/review-queue
 * Lists pending items in the agricultural officer review queue
 */
export async function GET(request) {
    try {
        const query = `
            SELECT 
                rq.id AS review_id,
                rq.item_id,
                rq.type,
                rq.status AS review_status,
                rq.assigned_officer,
                rq.ai_guess,
                rq.notes,
                rq.created_at AS escalated_at,
                
                f.id AS farmer_id,
                f.name AS farmer_name,
                f.phone AS farmer_phone,
                f.district AS farmer_district,
                f.state AS farmer_state,
                f.language AS farmer_language,

                cs.image_url,
                cs.disease AS scan_disease,
                cs.confidence AS scan_confidence,
                cs.crop AS scan_crop,

                sa.scheme_id,
                sa.status AS scheme_app_status,
                sa.form_data AS scheme_form_data,
                sa.error_reason AS scheme_error_reason,
                s.title AS scheme_title

            FROM "REVIEW_QUEUE" rq
            JOIN "FARMER" f ON rq.farmer_id = f.id
            LEFT JOIN "CROP_SCAN" cs ON rq.type = 'scan' AND rq.item_id = cs.id
            LEFT JOIN "SCHEME_APPLICATION" sa ON rq.type = 'scheme' AND rq.item_id = sa.id
            LEFT JOIN "SCHEME" s ON sa.scheme_id = s.id
            ORDER BY rq.created_at DESC;
        `;

        const { rows } = await pool.query(query);
        return Response.json({ count: rows.length, items: rows });

    } catch (error) {
        console.error('Error fetching review queue:', error);
        return Response.json({ error: error.message || 'Failed to fetch review queue' }, { status: 500 });
    }
}

/**
 * POST /api/admin/review-queue
 * Submits an officer's review resolution (approve/override) and notifies farmer
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { reviewId, action = 'approve', correctedAnswer, officerName = 'Agri Officer' } = body;

        if (!reviewId || !correctedAnswer) {
            return Response.json({ error: 'reviewId and correctedAnswer are required' }, { status: 400 });
        }

        // 1. Fetch Review Queue Item
        const queueRes = await pool.query(`SELECT * FROM "REVIEW_QUEUE" WHERE id = $1`, [reviewId]);
        if (queueRes.rows.length === 0) {
            return Response.json({ error: 'Review queue item not found' }, { status: 404 });
        }

        const reviewItem = queueRes.rows[0];
        const finalStatus = action === 'override' ? 'overridden' : 'approved';

        // 2. Update REVIEW_QUEUE record
        await pool.query(
            `UPDATE "REVIEW_QUEUE" 
             SET status = $1, assigned_officer = $2, notes = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [finalStatus, officerName, correctedAnswer, reviewId]
        );

        // 3. Update target table (CROP_SCAN or SCHEME_APPLICATION)
        if (reviewItem.type === 'scan') {
            await pool.query(
                `UPDATE "CROP_SCAN" SET status = 'completed', solution = $1 WHERE id = $2`,
                [correctedAnswer, reviewItem.item_id]
            );
        } else if (reviewItem.type === 'scheme') {
            await pool.query(
                `UPDATE "SCHEME_APPLICATION" SET status = 'submitted', error_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [reviewItem.item_id]
            );
        }

        // 4. Fetch Farmer Details and Notify via notifyFarmer.js
        const farmerState = await getFarmerState(reviewItem.farmer_id);
        let notifyResult = null;

        if (farmerState) {
            const officerMsg = `Officer ${officerName} has reviewed your submission: "${correctedAnswer}"`;
            notifyResult = await notifyFarmer({
                farmer: {
                    id: farmerState.id,
                    name: farmerState.name,
                    phone: farmerState.phone,
                    language: farmerState.language,
                    preferences: farmerState.preferences
                },
                messageEnglish: officerMsg,
                title: `📋 Expert Resolution from ${officerName}`,
                severity: 'medium',
                alertType: 'officer_review_resolution'
            });
        }

        return Response.json({
            message: 'Review submitted and farmer notified successfully',
            reviewId,
            status: finalStatus,
            officerName,
            correctedAnswer,
            notifyResult
        });

    } catch (error) {
        console.error('Error processing review queue action:', error);
        return Response.json({ error: error.message || 'Failed to process review action' }, { status: 500 });
    }
}

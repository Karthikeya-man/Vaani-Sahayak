import { pool } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { category = 'chat', id, itemId, conversationId, schemeId, scanId, helpful, farmerId } = body;

        const isHelpful = helpful === true || helpful === 'true';
        const targetId = id || itemId || conversationId || schemeId || scanId;

        console.log(`[Feedback API] Received feedback: Category=${category}, ID=${targetId}, Helpful=${isHelpful}`);

        if (category === 'chat' || conversationId) {
            if (targetId) {
                await pool.query(
                    `UPDATE "CONVERSATION" SET helpful = $1 WHERE id = $2`,
                    [isHelpful, targetId]
                );
            } else {
                // If no conversationId passed, log a new lightweight conversation record
                await pool.query(
                    `INSERT INTO "CONVERSATION" (farmer_id, channel, user_message, assistant_response, helpful)
                     VALUES ($1, 'chat', 'Farmer feedback rating', 'Recorded', $2)`,
                    [farmerId || null, isHelpful]
                );
            }
        } else if (category === 'crop-scan' || scanId) {
            if (targetId) {
                await pool.query(
                    `UPDATE "CROP_SCAN" SET helpful = $1 WHERE id = $2`,
                    [isHelpful, targetId]
                );
            } else {
                await pool.query(
                    `INSERT INTO "CROP_SCAN" (farmer_id, crop, disease, district, helpful)
                     VALUES ($1, 'General', 'Diagnosis feedback', 'General', $2)`,
                    [farmerId || null, isHelpful]
                );
            }
        } else if (category === 'scheme-match' || schemeId) {
            await pool.query(
                `INSERT INTO "SCHEME_FEEDBACK" (farmer_id, scheme_id, helpful)
                 VALUES ($1, $2, $3)`,
                [farmerId || null, targetId && targetId.length === 36 ? targetId : null, isHelpful]
            );
        }

        return Response.json({ success: true, category, helpful: isHelpful });
    } catch (error) {
        console.error('[Feedback API Error]:', error);
        return Response.json({ error: error.message || 'Failed to submit feedback' }, { status: 500 });
    }
}

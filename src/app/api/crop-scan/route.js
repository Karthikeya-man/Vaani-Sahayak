import { pool } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

const DEFAULT_FARMER_ID = '4379bc18-5a9b-4649-9c3c-d0970e9933c1';

export async function POST(request) {
    try {
        const body = await request.json();
        const { farmerId, crop = 'Cotton', disease = 'Cotton Leaf Curl Virus', district = 'Rajkot', image, solution } = body;
        const targetFarmerId = farmerId || DEFAULT_FARMER_ID;

        const res = await pool.query(
            `INSERT INTO "CROP_SCAN" (farmer_id, crop, disease, district, image_url, solution, status, confidence)
             VALUES ($1, $2, $3, $4, $5, $6, 'completed', 0.94) RETURNING id, created_at`,
            [
                targetFarmerId,
                crop,
                disease,
                district,
                image || null,
                solution || 'Use Neem Oil spray (10,000 ppm) at 3ml/liter of water.'
            ]
        );

        const scanRecord = res.rows[0];

        return Response.json({
            success: true,
            scanId: scanRecord.id,
            crop,
            disease,
            confidence: 0.94,
            created_at: scanRecord.created_at
        });

    } catch (error) {
        console.error('[Crop Scan API Error]:', error);
        return Response.json({ error: error.message || 'Failed to record crop scan' }, { status: 500 });
    }
}

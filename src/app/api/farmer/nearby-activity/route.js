import { pool } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userDistrict = searchParams.get('district') || 'Rajkot';

        const res = await pool.query(`
            SELECT 
                f.district,
                p.crop,
                COUNT(DISTINCT f.id) as farmer_count,
                ROUND(SUM(p.land_acres)) as total_acres
            FROM "FARMER" f
            JOIN "FARMER_PLOT" p ON f.id = p.farmer_id
            WHERE LOWER(f.district) = LOWER($1) OR $1 IS NULL
            GROUP BY f.district, p.crop
            ORDER BY farmer_count DESC
            LIMIT 5;
        `, [userDistrict]);

        const anonymizedActivities = res.rows.map(row => ({
            district: row.district,
            crop: row.crop,
            count: parseInt(row.farmer_count, 10),
            totalAcres: parseInt(row.total_acres || 0, 10)
        }));

        // Default mock network activity if DB is clean
        const fallbackActivities = [
            { district: userDistrict, crop: "Cotton", count: 12, totalAcres: 48 },
            { district: userDistrict, crop: "Wheat", count: 8, totalAcres: 35 },
            { district: userDistrict, crop: "Rice (Paddy)", count: 5, totalAcres: 22 }
        ];

        return Response.json({
            district: userDistrict,
            activities: anonymizedActivities.length > 0 ? anonymizedActivities : fallbackActivities
        });

    } catch (error) {
        console.error('[Nearby Activity API Error]:', error);
        return Response.json({ error: error.message || 'Failed to fetch nearby activity' }, { status: 500 });
    }
}

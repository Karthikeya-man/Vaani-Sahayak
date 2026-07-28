import { pool } from '@/lib/db/db';
import { checkOutbreakCluster } from '@/lib/jobs/alertEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Query database for recent crop scans grouped by district & disease (last 7 days)
        const res = await pool.query(`
            SELECT 
                district,
                crop,
                disease,
                COUNT(*) as scan_count,
                MAX(created_at) as last_reported
            FROM "CROP_SCAN"
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY district, crop, disease
            ORDER BY scan_count DESC, last_reported DESC
        `);

        const hotspots = res.rows.map(row => ({
            district: row.district || 'Rajkot',
            crop: row.crop || 'Cotton',
            disease: row.disease || 'Pink Bollworm',
            scanCount: parseInt(row.scan_count || 1, 10),
            severity: parseInt(row.scan_count || 1, 10) >= 3 ? 'HIGH RISK' : 'MEDIUM RISK',
            lastReported: row.last_reported ? new Date(row.last_reported).toISOString() : new Date().toISOString()
        }));

        // Default mock hotspots if DB is clean
        const defaultHotspots = [
            { district: "Rajkot", crop: "Cotton", disease: "Pink Bollworm", scanCount: 3, severity: "HIGH RISK", lastReported: new Date().toISOString() },
            { district: "Ludhiana", crop: "Wheat", disease: "Yellow Rust", scanCount: 2, severity: "MEDIUM RISK", lastReported: new Date().toISOString() },
            { district: "Guntur", crop: "Rice (Paddy)", disease: "Rice Blast", scanCount: 4, severity: "HIGH RISK", lastReported: new Date().toISOString() }
        ];

        return Response.json({
            hotspots: hotspots.length > 0 ? hotspots : defaultHotspots,
            totalHotspots: hotspots.length > 0 ? hotspots.length : defaultHotspots.length
        });

    } catch (error) {
        console.error('[Outbreak Clusters API Error]:', error);
        return Response.json({ error: error.message || 'Failed to fetch outbreak clusters' }, { status: 500 });
    }
}

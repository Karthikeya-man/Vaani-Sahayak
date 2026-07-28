import { pool } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Chat Feedback
        const chatRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE helpful = true) as helpful,
                COUNT(*) FILTER (WHERE helpful = false) as unhelpful,
                COUNT(*) FILTER (WHERE helpful IS NOT NULL) as rated_total,
                COUNT(*) as total
            FROM "CONVERSATION"
        `);

        // 2. Crop Scan Feedback
        const cropRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE helpful = true) as helpful,
                COUNT(*) FILTER (WHERE helpful = false) as unhelpful,
                COUNT(*) FILTER (WHERE helpful IS NOT NULL) as rated_total,
                COUNT(*) as total
            FROM "CROP_SCAN"
        `);

        // 3. Scheme Match Feedback
        const schemeRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE helpful = true) as helpful,
                COUNT(*) FILTER (WHERE helpful = false) as unhelpful,
                COUNT(*) FILTER (WHERE helpful IS NOT NULL) as rated_total,
                COUNT(*) as total
            FROM "SCHEME_FEEDBACK"
        `);

        // 4. Daily timeline metrics for feedback over time
        const timelineRes = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) FILTER (WHERE helpful = true) as helpful,
                COUNT(*) FILTER (WHERE helpful = false) as unhelpful
            FROM (
                SELECT created_at, helpful FROM "CONVERSATION" WHERE helpful IS NOT NULL
                UNION ALL
                SELECT created_at, helpful FROM "CROP_SCAN" WHERE helpful IS NOT NULL
                UNION ALL
                SELECT created_at, helpful FROM "SCHEME_FEEDBACK" WHERE helpful IS NOT NULL
            ) combined
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) DESC
            LIMIT 7
        `);

        const parseStats = (row) => {
            const h = parseInt(row?.helpful || 0, 10);
            const u = parseInt(row?.unhelpful || 0, 10);
            const rated = parseInt(row?.rated_total || (h + u), 10);
            const ratio = rated > 0 ? Math.round((h / rated) * 100) : 0;
            return { helpful: h, unhelpful: u, rated, ratio };
        };

        const chatStats = parseStats(chatRes.rows[0]);
        const cropStats = parseStats(cropRes.rows[0]);
        const schemeStats = parseStats(schemeRes.rows[0]);

        const overallHelpful = chatStats.helpful + cropStats.helpful + schemeStats.helpful;
        const overallUnhelpful = chatStats.unhelpful + cropStats.unhelpful + schemeStats.unhelpful;
        const overallTotal = overallHelpful + overallUnhelpful;
        const overallRatio = overallTotal > 0 ? Math.round((overallHelpful / overallTotal) * 100) : 0;

        return Response.json({
            overall: {
                helpful: overallHelpful,
                unhelpful: overallUnhelpful,
                total: overallTotal,
                ratio: overallRatio
            },
            categories: {
                chat: chatStats,
                cropScan: cropStats,
                schemeMatch: schemeStats
            },
            timeline: timelineRes.rows.map(r => ({
                date: r.date ? new Date(r.date).toISOString().split('T')[0] : 'Today',
                helpful: parseInt(r.helpful || 0, 10),
                unhelpful: parseInt(r.unhelpful || 0, 10)
            }))
        });

    } catch (error) {
        console.error('[Feedback Stats API Error]:', error);
        return Response.json({ error: error.message || 'Failed to fetch feedback statistics' }, { status: 500 });
    }
}

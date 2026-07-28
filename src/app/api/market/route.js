import { pool } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

const MOCK_PRICES = [
    { id: 1, crop: "Wheat", mandi: "Nagpur APMC", price: 2450, change: 50, trend: "up", unit: "per Quintal" },
    { id: 2, crop: "Cotton", mandi: "Wardha Mandi", price: 6800, change: -120, trend: "down", unit: "per Quintal" },
    { id: 3, crop: "Soyabean", mandi: "Amravati APMC", price: 4200, change: 0, trend: "flat", unit: "per Quintal" },
    { id: 4, crop: "Tur (Arhar)", mandi: "Akola Mandi", price: 9500, change: 150, trend: "up", unit: "per Quintal" },
    { id: 5, crop: "Rice (Paddy)", mandi: "Bhandara APMC", price: 2100, change: 20, trend: "up", unit: "per Quintal" }
];

export async function GET(request) {
    try {
        const fetchedAt = new Date().toISOString();
        return new Response(JSON.stringify({
            prices: MOCK_PRICES,
            fetchedAt
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
                'X-Cached-At': fetchedAt
            }
        });
    } catch (error) {
        return Response.json({ error: error.message || 'Failed to fetch market prices' }, { status: 500 });
    }
}

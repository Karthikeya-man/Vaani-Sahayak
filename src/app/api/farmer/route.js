import { getFarmerState, updateFarmerPlot, updatePreferences } from '@/lib/db/farmerState.js';

export const dynamic = 'force-dynamic';

// Default to the first seeded farmer (Ramesh Patel) if no farmerId is specified
const DEFAULT_FARMER_ID = '4379bc18-5a9b-4649-9c3c-d0970e9933c1';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const farmerId = searchParams.get('farmerId') || DEFAULT_FARMER_ID;

        const farmerState = await getFarmerState(farmerId);
        if (!farmerState) {
            return Response.json({ error: 'Farmer not found' }, { status: 404 });
        }

        return Response.json(farmerState);
    } catch (error) {
        console.error('Error fetching farmer state:', error);
        return Response.json({ error: error.message || 'Failed to fetch farmer state' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { farmerId = DEFAULT_FARMER_ID, plot, preferences } = body;

        let updatedPlot = null;
        let updatedPrefs = null;

        if (plot) {
            updatedPlot = await updateFarmerPlot(farmerId, plot);
        }

        if (preferences) {
            updatedPrefs = await updatePreferences(farmerId, preferences);
        }

        const currentState = await getFarmerState(farmerId);
        return Response.json({
            message: 'Farmer state updated successfully',
            farmer: currentState,
            updatedPlot,
            updatedPrefs
        });
    } catch (error) {
        console.error('Error updating farmer state:', error);
        return Response.json({ error: error.message || 'Failed to update farmer state' }, { status: 500 });
    }
}

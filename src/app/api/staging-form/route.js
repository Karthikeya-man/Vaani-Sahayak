import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const shouldFail = searchParams.get('fail') === 'true';

        const body = await request.json();
        console.log(`[Staging Govt Portal] Received form submission:`, body);

        if (shouldFail || request.headers.get('x-simulate-failure') === 'true') {
            console.warn(`[Staging Govt Portal] Simulating government portal CAPTCHA / site failure!`);
            return NextResponse.json({
                error: 'CAPTCHA verification failed or portal service unavailable',
                errorCode: 'PORTAL_CAPTCHA_FAIL'
            }, { status: 500 });
        }

        const applicationRef = `GOV_KHARIF_${Date.now().toString().substring(6)}`;
        return NextResponse.json({
            success: true,
            applicationRef,
            message: 'Application successfully registered on government portal'
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

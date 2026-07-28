import { verifyAdminJWT } from '../../../../lib/auth/jwt.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
            const [k, ...v] = c.trim().split('=');
            return [k, v.join('=')];
        })
    );

    const token = cookies['admin_token'];
    const payload = await verifyAdminJWT(token);

    if (payload && payload.role === 'admin') {
        return Response.json({ authenticated: true, user: payload.username, role: payload.role });
    }

    return Response.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
}

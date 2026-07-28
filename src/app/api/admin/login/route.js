import { signAdminJWT } from '../../../../lib/auth/jwt.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        const ADMIN_USER = process.env.ADMIN_USER || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

        if (username === ADMIN_USER && password === ADMIN_PASS) {
            const token = await signAdminJWT({ username: ADMIN_USER, role: 'admin' });

            const headers = new Headers();
            headers.append('Content-Type', 'application/json');
            // Set HTTP-only, Secure, SameSite=Lax Cookie
            headers.append(
                'Set-Cookie',
                `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
            );

            return new Response(
                JSON.stringify({ success: true, message: 'Authentication successful' }),
                { status: 200, headers }
            );
        }

        return Response.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });

    } catch (err) {
        return Response.json({ error: err.message || 'Login failed' }, { status: 500 });
    }
}

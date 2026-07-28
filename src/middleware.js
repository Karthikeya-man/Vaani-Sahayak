import { NextResponse } from 'next/server';
import { verifyAdminJWT } from './lib/auth/jwt.js';

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        if (pathname === '/api/admin/login') {
            return NextResponse.next();
        }

        const cookieHeader = request.headers.get('cookie') || '';
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => {
                const [k, ...v] = c.trim().split('=');
                return [k, v.join('=')];
            })
        );

        const token = cookies['admin_token'];
        const payload = await verifyAdminJWT(token);

        if (!payload || payload.role !== 'admin') {
            if (pathname.startsWith('/api/admin')) {
                return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
            }
            return NextResponse.next();
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*']
};

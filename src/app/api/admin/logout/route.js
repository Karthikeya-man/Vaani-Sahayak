export const dynamic = 'force-dynamic';

export async function POST() {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Set-Cookie', 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

    return new Response(
        JSON.stringify({ success: true, message: 'Logged out successfully' }),
        { status: 200, headers }
    );
}

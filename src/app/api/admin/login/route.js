import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        const validUsername = process.env.ADMIN_USERNAME;
        const validPassword = process.env.ADMIN_PASSWORD;

        // In a real application, you would use a robust database and hashing (like bcrypt)
        // Here, we compare against environment variables for simplicity in this MVP
        if (username === validUsername && password === validPassword) {
            // Generate a simple token (in production, use JWT or similar secure sessions)
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

            return NextResponse.json({
                success: true,
                token: token,
                message: "Authentication successful"
            }, { status: 200 });
        } else {
            return NextResponse.json({
                success: false,
                message: "Invalid username or password"
            }, { status: 401 });
        }
    } catch (error) {
        console.error("Login API Error:", error);
        return NextResponse.json({
            success: false,
            message: "An error occurred during authentication"
        }, { status: 500 });
    }
}

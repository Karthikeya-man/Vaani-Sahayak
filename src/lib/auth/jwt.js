// Native Web Crypto API HMAC-SHA256 JWT Utility for Next.js App Router & Middleware

const JWT_SECRET = process.env.JWT_SECRET || 'vaani_sahayak_secret_admin_jwt_key_2026_secure';

function base64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function getCryptoKey() {
    const encoder = new TextEncoder();
    return await crypto.subtle.importKey(
        'raw',
        encoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Signs an Admin JWT token with exp (default 24h)
 */
export async function signAdminJWT(payload, expiresInSeconds = 86400) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encoder = new TextEncoder();
    const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
    const dataToSign = `${headerB64}.${payloadB64}`;

    const key = await getCryptoKey();
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const signatureB64 = base64UrlEncode(signatureBuffer);

    return `${dataToSign}.${signatureB64}`;
}

/**
 * Verifies an Admin JWT token
 * @returns {Promise<Object|null>} Decoded payload if valid, null if invalid or expired
 */
export async function verifyAdminJWT(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    try {
        const key = await getCryptoKey();
        const encoder = new TextEncoder();
        const signatureBytes = base64UrlDecode(signatureB64);

        const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(dataToSign));
        if (!isValid) return null;

        const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
        const payload = JSON.parse(payloadJson);

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            console.warn('[JWT Verification] Token has expired');
            return null;
        }

        return payload;
    } catch (err) {
        console.warn('[JWT Verification Error]:', err.message);
        return null;
    }
}

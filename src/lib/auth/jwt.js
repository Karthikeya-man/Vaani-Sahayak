// Native Web Crypto API HMAC-SHA256 JWT Utility for Next.js App Router & Middleware

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment!');
        }
        console.warn('⚠️ [SECURITY WARNING] JWT_SECRET environment variable is not set. Using fallback development secret.');
        return 'vaani_sahayak_dev_secret_key_change_in_production_2026';
    }
    return secret;
}

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

async function getCryptoKey(secretKeyOverride = null) {
    const secret = secretKeyOverride || getJwtSecret();
    const encoder = new TextEncoder();
    return await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Signs an Admin JWT token with exp (default 24h)
 */
export async function signAdminJWT(payload, expiresInSeconds = 86400, secretKeyOverride = null) {
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

    const key = await getCryptoKey(secretKeyOverride);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const signatureB64 = base64UrlEncode(signatureBuffer);

    return `${dataToSign}.${signatureB64}`;
}

/**
 * Verifies an Admin JWT token against HMAC signature
 * @returns {Promise<Object|null>} Decoded payload if valid, null if signature verification fails or token expired
 */
export async function verifyAdminJWT(token, secretKeyOverride = null) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) {
        console.warn('[JWT Verification Failed] Malformed JWT token format (expected 3 parts)');
        return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    try {
        const key = await getCryptoKey(secretKeyOverride);
        const encoder = new TextEncoder();
        const signatureBytes = base64UrlDecode(signatureB64);

        const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(dataToSign));
        if (!isValid) {
            console.warn('[JWT Verification Failed] HMAC Signature mismatch! Token was tampered or signed with invalid secret.');
            return null;
        }

        const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
        const payload = JSON.parse(payloadJson);

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            console.warn('[JWT Verification Failed] Token has expired (exp < now)');
            return null;
        }

        return payload;
    } catch (err) {
        console.warn('[JWT Verification Error]:', err.message);
        return null;
    }
}

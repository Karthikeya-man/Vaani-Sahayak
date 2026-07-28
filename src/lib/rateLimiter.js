/**
 * ⚠️ KNOWN ARCHITECTURAL LIMITATION & PRODUCTION NOTICE:
 * This rate limiter is IN-MEMORY (backed by a JavaScript Map).
 * 
 * • Scope: Single Node.js server process only.
 * • Limitation: Will NOT enforce global rate limits across horizontally auto-scaled instances,
 *   container clusters (K8s/ECS), or serverless functions (Vercel / AWS Lambda).
 * • Multi-Instance Production Recommendation: Connect to a shared distributed store like Redis
 *   (e.g., @upstash/ratelimit or ioredis).
 */

const requestLogs = new Map();

/**
 * Per-Identity Rate Limiter Check
 * Rate-limits per authenticated identity (farmer_id header/option), falling back to client IP.
 * 
 * @param {Request} request - Next.js HTTP Request object
 * @param {Object} options
 * @param {number} [options.limit=10] - Max allowed requests per window per identity
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default 60s)
 * @param {string} [options.prefix='general'] - Route identifier prefix
 * @param {string} [options.identity] - Explicit farmer identity override
 * @returns {{ allowed: boolean, remaining: number, resetMs: number, limit: number, key: string }}
 */
export function checkRateLimit(request, options = {}) {
    const limit = options.limit || 10;
    const windowMs = options.windowMs || 60000;
    const prefix = options.prefix || 'general';

    // Extract per-identity key: Header (x-farmer-id / x-user-id) > Explicit option > Client IP
    const farmerHeader = request?.headers?.get ? (request.headers.get('x-farmer-id') || request.headers.get('x-user-id')) : null;
    const clientIp = request?.headers?.get ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')) : null;
    
    const identity = options.identity || farmerHeader || clientIp || '127.0.0.1';
    const key = `${prefix}:${identity}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requestLogs.has(key)) {
        requestLogs.set(key, []);
    }

    const timestamps = requestLogs.get(key).filter(ts => ts > windowStart);
    timestamps.push(now);
    requestLogs.set(key, timestamps);

    const count = timestamps.length;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetMs = Math.ceil((timestamps[0] + windowMs - now) / 1000);

    return {
        allowed,
        limit,
        remaining,
        resetMs: Math.max(1, resetMs),
        key,
        isInMemoryStore: true
    };
}

/**
 * Creates standard HTTP 429 Too Many Requests response
 */
export function rateLimitExceededResponse(rateCheck) {
    return new Response(
        JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests for identity '${rateCheck.key}'. Please wait ${rateCheck.resetMs} seconds before trying again.`
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(rateCheck.resetMs),
                'X-RateLimit-Limit': String(rateCheck.limit),
                'X-RateLimit-Remaining': String(rateCheck.remaining)
            }
        }
    );
}

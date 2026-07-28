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
 * Rate Limiter check helper
 * @param {Request} request - Next.js HTTP Request object
 * @param {Object} options
 * @param {number} [options.limit=10] - Max allowed requests per window
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default 60s)
 * @param {string} [options.prefix='general'] - Route identifier prefix
 * @returns {{ allowed: boolean, remaining: number, resetMs: number, limit: number, isInMemoryStore: true }}
 */
export function checkRateLimit(request, options = {}) {
    const limit = options.limit || 10;
    const windowMs = options.windowMs || 60000;
    const prefix = options.prefix || 'general';

    // Get client identifier (IP address from x-forwarded-for or fallback)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    const key = `${prefix}:${clientIp}`;
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
            message: `Too many requests. Please wait ${rateCheck.resetMs} seconds before trying again.`
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

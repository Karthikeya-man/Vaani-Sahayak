import { pool } from '../../../lib/db/db.js';
import { checkRateLimit, rateLimitExceededResponse } from '../../../lib/rateLimiter.js';

export const dynamic = 'force-dynamic';

const DEFAULT_FARMER_ID = '4379bc18-5a9b-4649-9c3c-d0970e9933c1';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates crop scan image file type and size
 */
export function validateCropImage(imageDataUriOrUrl) {
    if (!imageDataUriOrUrl) {
        return { valid: true }; // Allow empty image for mock URL fallbacks
    }

    if (typeof imageDataUriOrUrl === 'string' && imageDataUriOrUrl.startsWith('data:')) {
        // Extract MIME type from Data URI: "data:image/jpeg;base64,..."
        const mimeMatch = imageDataUriOrUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        if (!mimeMatch) {
            return { valid: false, reason: 'Invalid image Data URI format. Expected image/jpeg, image/png, or image/webp.' };
        }

        const mimeType = mimeMatch[1].toLowerCase();
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            return { valid: false, reason: `Unsupported image type '${mimeType}'. Allowed formats: JPEG, PNG, WebP.` };
        }

        // Estimate size from base64 string length
        const base64Length = imageDataUriOrUrl.length - mimeMatch[0].length;
        const estimatedSizeBytes = Math.ceil((base64Length * 3) / 4);

        if (estimatedSizeBytes > MAX_FILE_SIZE_BYTES) {
            return { valid: false, reason: `File size (${(estimatedSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed 5 MB limit.` };
        }
    }

    return { valid: true };
}

export async function POST(request) {
    try {
        // 1. Rate Limiting Check (5 requests per minute for crop scan)
        const rateCheck = checkRateLimit(request, { limit: 5, prefix: 'crop-scan' });
        if (!rateCheck.allowed) {
            return rateLimitExceededResponse(rateCheck);
        }

        const body = await request.json();
        const { farmerId, crop = 'Cotton', disease = 'Cotton Leaf Curl Virus', district = 'Rajkot', image, solution, mimeType, fileSize } = body;
        const targetFarmerId = farmerId || DEFAULT_FARMER_ID;

        // 2. Direct File Type & Size Validation
        if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
            return Response.json(
                { error: `Invalid image type '${mimeType}'. Only JPEG, PNG, and WebP images are allowed.` },
                { status: 400 }
            );
        }

        if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
            return Response.json(
                { error: `File size exceeds maximum allowed 5MB limit.` },
                { status: 400 }
            );
        }

        const validation = validateCropImage(image);
        if (!validation.valid) {
            return Response.json({ error: validation.reason }, { status: 400 });
        }

        // 3. Database Insertion
        const res = await pool.query(
            `INSERT INTO "CROP_SCAN" (farmer_id, crop, disease, district, image_url, solution, status, confidence)
             VALUES ($1, $2, $3, $4, $5, $6, 'completed', 0.94) RETURNING id, created_at`,
            [
                targetFarmerId,
                crop,
                disease,
                district,
                image || null,
                solution || 'Use Neem Oil spray (10,000 ppm) at 3ml/liter of water.'
            ]
        );

        const scanRecord = res.rows[0];

        return Response.json({
            success: true,
            scanId: scanRecord.id,
            crop,
            disease,
            confidence: 0.94,
            created_at: scanRecord.created_at
        });

    } catch (error) {
        console.error('[Crop Scan API Error]:', error);
        return Response.json({ error: error.message || 'Failed to record crop scan' }, { status: 500 });
    }
}

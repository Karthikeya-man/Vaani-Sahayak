// Document Vault Module: S3 KMS Encryption & Post-Submission Auto-Delete Security

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../db/db.js';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_KMS_KEY_ARN = process.env.AWS_KMS_KEY_ARN;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'vaani-vault-encrypted';

// Check if real AWS credentials are available
const isAwsConfigured = !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

let s3Client = null;
if (isAwsConfigured) {
    s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY
        }
    });
}

/**
 * Encrypts and stores sensitive farmer identity documents using AWS S3 Server-Side KMS Encryption (aws:kms).
 * Falls back to explicitly labeled LOCAL MOCK DEV MODE if AWS credentials are not configured.
 */
export async function encryptAndStoreDocument(fileBuffer, documentType = 'aadhaar', farmerId) {
    const keyPath = `${farmerId}/${documentType}_${Date.now()}.enc`;

    if (isAwsConfigured && s3Client) {
        console.log(`🔒 [REAL AWS S3 KMS ENCRYPTION] Uploading ${documentType} to s3://${S3_BUCKET_NAME}/${keyPath}`);
        
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: keyPath,
            Body: fileBuffer || Buffer.from('placeholder document buffer payload'),
            ContentType: 'application/octet-stream',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: AWS_KMS_KEY_ARN || undefined
        };

        const command = new PutObjectCommand(params);
        const awsResponse = await s3Client.send(command);

        return {
            isMockDevMode: false,
            secureStorageUrl: `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${keyPath}`,
            kmsKeyId: AWS_KMS_KEY_ARN || 'default-aws-managed-kms-key',
            eTag: awsResponse.ETag,
            serverSideEncryption: awsResponse.ServerSideEncryption,
            encryptedAt: new Date().toISOString()
        };
    } else {
        console.warn(`⚠️ [DOCUMENT VAULT WARNING] AWS_ACCESS_KEY_ID not configured in environment. Operating in LOCAL MOCK DEV MODE.`);
        
        const mockKeyId = `mock_dev_kms_key_${Date.now()}`;
        const mockUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/mock-dev-storage/${keyPath}`;

        return {
            isMockDevMode: true,
            warning: 'LOCAL MOCK DEV MODE (AWS credentials not set in environment)',
            secureStorageUrl: mockUrl,
            kmsKeyId: mockKeyId,
            encryptedAt: new Date().toISOString()
        };
    }
}

/**
 * Security Vault Auto-Delete: Removes sensitive document scans from storage once scheme application is submitted
 */
export async function deleteDocumentAfterSubmission(schemeAppId, s3ObjectKey = null) {
    console.log(`🧹 [Document Vault Auto-Delete] Purging sensitive farmer documents for submitted Scheme App: ${schemeAppId}`);

    // 1. Delete from S3 if object key provided and AWS configured
    if (isAwsConfigured && s3Client && s3ObjectKey) {
        try {
            const deleteCmd = new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: s3ObjectKey });
            await s3Client.send(deleteCmd);
            console.log(`  ✅ Successfully deleted object from S3: ${s3ObjectKey}`);
        } catch (err) {
            console.error(`  ❌ Failed to delete object from S3:`, err.message);
        }
    }

    // 2. Strip document base64 payloads from PostgreSQL SCHEME_APPLICATION form_data
    const res = await pool.query(
        `SELECT form_data FROM "SCHEME_APPLICATION" WHERE id = $1`,
        [schemeAppId]
    );

    if (res.rows.length > 0 && res.rows[0].form_data) {
        const formData = typeof res.rows[0].form_data === 'string' ? JSON.parse(res.rows[0].form_data) : res.rows[0].form_data;
        delete formData.aadhaar_card_scan;
        delete formData.bank_passbook_copy;
        delete formData.raw_document_base64;

        await pool.query(
            `UPDATE "SCHEME_APPLICATION" SET form_data = $1 WHERE id = $2`,
            [JSON.stringify(formData), schemeAppId]
        );
    }

    return { purged: true, schemeAppId, isMockDevMode: !isAwsConfigured };
}

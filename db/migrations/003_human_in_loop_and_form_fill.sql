-- Migration: Human-in-the-loop escalation & Autonomous Form-Fill tables
-- Created: 2026-07-26

-- 1. Ensure CROP_SCAN table has status, confidence, image_url, and solution columns
ALTER TABLE "CROP_SCAN" 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS solution TEXT NULL;

-- 2. Create REVIEW_QUEUE Table
CREATE TABLE IF NOT EXISTS "REVIEW_QUEUE" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'scan', 'scheme', 'other'
    farmer_id UUID NOT NULL REFERENCES "FARMER"(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'overridden'
    assigned_officer VARCHAR(255) NULL,
    ai_guess TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON "REVIEW_QUEUE"(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_farmer ON "REVIEW_QUEUE"(farmer_id);

-- 3. Create APPROVED_TREATMENTS Table
CREATE TABLE IF NOT EXISTS "APPROVED_TREATMENTS" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disease VARCHAR(255) UNIQUE NOT NULL,
    treatment_dosage TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Update SCHEME_APPLICATION Table columns for form filling
ALTER TABLE "SCHEME_APPLICATION"
ADD COLUMN IF NOT EXISTS form_data JSONB NULL,
ADD COLUMN IF NOT EXISTS missing_fields TEXT[] NULL,
ADD COLUMN IF NOT EXISTS error_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

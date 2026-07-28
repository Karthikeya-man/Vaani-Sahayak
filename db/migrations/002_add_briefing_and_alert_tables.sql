-- Migration: Add briefing timestamp and tables for schemes, crop scans, and alert deduplication
-- Created: 2026-07-26

-- 1. Add last_briefing_sent_at to FARMER_PREFERENCES table
ALTER TABLE "FARMER_PREFERENCES" 
ADD COLUMN IF NOT EXISTS last_briefing_sent_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Create SCHEME Table
CREATE TABLE IF NOT EXISTS "SCHEME" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    crop VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    deadline DATE NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create SCHEME_APPLICATION Table
CREATE TABLE IF NOT EXISTS "SCHEME_APPLICATION" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES "FARMER"(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES "SCHEME"(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'applied',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_farmer_scheme UNIQUE(farmer_id, scheme_id)
);

CREATE INDEX IF NOT EXISTS idx_scheme_app_farmer_id ON "SCHEME_APPLICATION"(farmer_id);

-- 4. Create CROP_SCAN Table
CREATE TABLE IF NOT EXISTS "CROP_SCAN" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES "FARMER"(id) ON DELETE CASCADE,
    crop VARCHAR(100) NOT NULL,
    disease VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crop_scan_crop_district ON "CROP_SCAN"(crop, district);
CREATE INDEX IF NOT EXISTS idx_crop_scan_created_at ON "CROP_SCAN"(created_at);

-- 5. Create ALERT_DEDUP Table for 24h deduplication tracking
CREATE TABLE IF NOT EXISTS "ALERT_DEDUP" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES "FARMER"(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_dedup_farmer_type ON "ALERT_DEDUP"(farmer_id, alert_type, sent_at);

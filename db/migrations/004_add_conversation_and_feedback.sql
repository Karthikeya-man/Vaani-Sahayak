-- Migration: Add CONVERSATION table, helpful feedback columns for chat, crop scans, and scheme matches
-- Created: 2026-07-28

-- 1. Create CONVERSATION Table
CREATE TABLE IF NOT EXISTS "CONVERSATION" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NULL REFERENCES "FARMER"(id) ON DELETE SET NULL,
    channel VARCHAR(20) DEFAULT 'chat',
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    helpful BOOLEAN NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON "CONVERSATION"(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_helpful ON "CONVERSATION"(helpful);
CREATE INDEX IF NOT EXISTS idx_conversation_channel ON "CONVERSATION"(channel);

-- 2. Add helpful column to CROP_SCAN Table
ALTER TABLE "CROP_SCAN"
ADD COLUMN IF NOT EXISTS helpful BOOLEAN NULL;

-- 3. Create SCHEME_FEEDBACK Table for scheme match results feedback
CREATE TABLE IF NOT EXISTS "SCHEME_FEEDBACK" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NULL REFERENCES "FARMER"(id) ON DELETE SET NULL,
    scheme_id UUID NULL REFERENCES "SCHEME"(id) ON DELETE CASCADE,
    helpful BOOLEAN NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheme_feedback_created_at ON "SCHEME_FEEDBACK"(created_at);
CREATE INDEX IF NOT EXISTS idx_scheme_feedback_helpful ON "SCHEME_FEEDBACK"(helpful);

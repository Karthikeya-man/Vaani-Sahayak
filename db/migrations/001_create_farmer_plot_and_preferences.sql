-- Migration: Create FARMER_PLOT and FARMER_PREFERENCES tables
-- Created: 2026-07-23

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create FARMER_PLOT Table
CREATE TABLE IF NOT EXISTS "FARMER_PLOT" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES "FARMER"(id) ON DELETE CASCADE,
    crop VARCHAR(100) NOT NULL,
    land_acres DOUBLE PRECISION NOT NULL,
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE NOT NULL,
    soil_type VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmer_plot_farmer_id ON "FARMER_PLOT"(farmer_id);

-- 2. Create FARMER_PREFERENCES Table
CREATE TABLE IF NOT EXISTS "FARMER_PREFERENCES" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES "FARMER"(id) ON DELETE CASCADE,
    price_alert_threshold DOUBLE PRECISION NULL,
    alert_channels TEXT[] NOT NULL DEFAULT ARRAY['push', 'sms', 'ivr']::TEXT[],
    notification_opt_in BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmer_preferences_farmer_id ON "FARMER_PREFERENCES"(farmer_id);

-- Migration: 00002_create_scans.sql
-- Stores individual plastic scan events

CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plastic_type TEXT NOT NULL CHECK (plastic_type IN ('PET','HDPE','PVC','LDPE','PP','PS','OTHER')),
  confidence NUMERIC(5,2) NOT NULL,
  image_hash TEXT NOT NULL,
  color_histogram TEXT,
  device_id TEXT NOT NULL,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  krux_earned INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  fraud_flags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for duplicate detection and rate limiting
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_image_hash ON public.scans(image_hash);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at);
CREATE INDEX IF NOT EXISTS idx_scans_user_date ON public.scans(user_id, created_at);

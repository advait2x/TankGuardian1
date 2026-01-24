-- Add status tracking columns to disease_checks table
-- Run this migration in Supabase SQL Editor

-- Add new columns
ALTER TABLE public.disease_checks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.disease_checks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.disease_checks 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS disease_checks_status_idx 
  ON public.disease_checks(status);

-- Add comments
COMMENT ON COLUMN public.disease_checks.status IS 'Current status: pending, processing, completed, or failed';
COMMENT ON COLUMN public.disease_checks.completed_at IS 'Timestamp when scan completed or failed';
COMMENT ON COLUMN public.disease_checks.error_message IS 'Error message if status is failed';

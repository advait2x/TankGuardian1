-- Disease Detection Feature - Complete Database Setup
-- 
-- This migration creates all necessary tables, policies, and storage for the disease detection feature.
-- Run this in Supabase SQL Editor.

-- ============================================================================
-- 1. CREATE DISEASE_CHECKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.disease_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES public.tanks(id) ON DELETE SET NULL,
  image_path TEXT NOT NULL,
  result JSONB DEFAULT '{"status": "processing"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.disease_checks IS 'Stores disease detection scans and AI analysis results';
COMMENT ON COLUMN public.disease_checks.owner_id IS 'User who initiated the scan';
COMMENT ON COLUMN public.disease_checks.tank_id IS 'Optional tank associated with scan';
COMMENT ON COLUMN public.disease_checks.image_path IS 'Path to image in disease-images bucket';
COMMENT ON COLUMN public.disease_checks.result IS 'JSONB containing AI analysis results and status';

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS disease_checks_owner_id_idx 
  ON public.disease_checks(owner_id);

CREATE INDEX IF NOT EXISTS disease_checks_created_at_idx 
  ON public.disease_checks(created_at DESC);

CREATE INDEX IF NOT EXISTS disease_checks_tank_id_idx 
  ON public.disease_checks(tank_id) 
  WHERE tank_id IS NOT NULL;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.disease_checks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can read own disease checks" ON public.disease_checks;
DROP POLICY IF EXISTS "Users can insert own disease checks" ON public.disease_checks;
DROP POLICY IF EXISTS "Users can update own disease checks" ON public.disease_checks;
DROP POLICY IF EXISTS "Users can delete own disease checks" ON public.disease_checks;

-- Policy: Users can read their own disease checks
CREATE POLICY "Users can read own disease checks"
  ON public.disease_checks
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can insert their own disease checks
CREATE POLICY "Users can insert own disease checks"
  ON public.disease_checks
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own disease checks
-- (Edge function needs to update result field)
CREATE POLICY "Users can update own disease checks"
  ON public.disease_checks
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: Users can delete their own disease checks
CREATE POLICY "Users can delete own disease checks"
  ON public.disease_checks
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- 5. CREATE STORAGE BUCKET
-- ============================================================================

-- Create disease-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'disease-images', 
  'disease-images', 
  false,  -- private bucket
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. CREATE STORAGE POLICIES
-- ============================================================================

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload own disease images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own disease images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own disease images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can access all disease images" ON storage.objects;

-- Policy: Users can upload images to their own folder
CREATE POLICY "Users can upload own disease images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'disease-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can read images from their own folder
CREATE POLICY "Users can read own disease images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'disease-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete images from their own folder
CREATE POLICY "Users can delete own disease images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'disease-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Service role can access all images (for edge function)
-- This is implicit - service role key bypasses RLS

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS (OPTIONAL)
-- ============================================================================

-- Function to get recent disease checks count for a user
CREATE OR REPLACE FUNCTION get_disease_check_count(user_id UUID, days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.disease_checks
  WHERE owner_id = user_id
    AND created_at > NOW() - (days || ' days')::INTERVAL;
$$;

-- Function to clean up old disease checks and images
CREATE OR REPLACE FUNCTION cleanup_old_disease_checks(days_old INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete checks older than specified days
  WITH deleted AS (
    DELETE FROM public.disease_checks
    WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
    RETURNING id, image_path
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Note: Storage files should be cleaned up separately via cron job
  -- or by listening to delete triggers
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 8. VERIFICATION QUERIES
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'disease_checks'
  ) THEN
    RAISE NOTICE '✅ disease_checks table created successfully';
  ELSE
    RAISE EXCEPTION '❌ disease_checks table was not created';
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'disease_checks' 
      AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ Row Level Security enabled';
  ELSE
    RAISE EXCEPTION '❌ Row Level Security not enabled';
  END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'disease_checks';
  
  IF policy_count >= 3 THEN
    RAISE NOTICE '✅ RLS policies created (% policies)', policy_count;
  ELSE
    RAISE EXCEPTION '❌ Expected at least 3 policies, found %', policy_count;
  END IF;
END $$;

-- Verify storage bucket exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'disease-images'
  ) THEN
    RAISE NOTICE '✅ disease-images storage bucket created';
  ELSE
    RAISE EXCEPTION '❌ disease-images storage bucket not found';
  END IF;
END $$;

-- Verify storage policies exist
DO $$
DECLARE
  storage_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO storage_policy_count
  FROM storage.policies 
  WHERE bucket_id = 'disease-images';
  
  IF storage_policy_count >= 3 THEN
    RAISE NOTICE '✅ Storage policies created (% policies)', storage_policy_count;
  ELSE
    RAISE WARNING '⚠️  Expected at least 3 storage policies, found %', storage_policy_count;
  END IF;
END $$;

-- ============================================================================
-- 9. SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Check disease checks for current user
-- SELECT * FROM disease_checks WHERE owner_id = auth.uid() ORDER BY created_at DESC;

-- Get recent check count
-- SELECT get_disease_check_count(auth.uid(), 30);

-- View all policies
-- SELECT * FROM pg_policies WHERE tablename = 'disease_checks';

-- View storage policies
-- SELECT * FROM storage.policies WHERE bucket_id = 'disease-images';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '🎉 Disease Detection feature database setup complete!';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Deploy edge function: supabase functions deploy disease-scan';
RAISE NOTICE '2. Set AI_API_KEY secret (optional): supabase secrets set AI_API_KEY=sk-...';
RAISE NOTICE '3. Test in app: My Tank > Scan for Diseases';

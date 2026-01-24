-- ============================================
-- Add Premium and Free Trial tracking to profiles
-- ============================================
-- This migration adds premium subscription and free trial tracking

-- Add is_premium column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;
  END IF;
END$$;

-- Add has_used_free_trial column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'has_used_free_trial'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN has_used_free_trial BOOLEAN NOT NULL DEFAULT false;
  END IF;
END$$;

-- Add premium_expires_at column (for subscription management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'premium_expires_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN premium_expires_at TIMESTAMPTZ;
  END IF;
END$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON public.profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_free_trial ON public.profiles(has_used_free_trial);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify:
-- SELECT id, is_premium, has_used_free_trial, premium_expires_at 
-- FROM public.profiles WHERE id = auth.uid();

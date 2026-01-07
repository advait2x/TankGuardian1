-- ============================================
-- Safe Migration Patch for public.tanks
-- ============================================
-- This script safely migrates the public.tanks table to match the expected schema.
-- It is idempotent and can be run multiple times without errors.
-- 
-- Expected Schema:
-- - id uuid PK default gen_random_uuid()
-- - owner_id uuid references auth.users(id)
-- - name text
-- - tank_type text
-- - size_gallons integer
-- - water_type text
-- - created_at timestamptz
-- - updated_at timestamptz

-- ============================================
-- STEP 1: Create table if it doesn't exist
-- ============================================

CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  tank_type TEXT,
  size_gallons INTEGER,
  water_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: Add missing columns if they don't exist
-- ============================================

-- Add id column if missing (should already exist as PK)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add owner_id column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add name column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN name TEXT;
  END IF;
END $$;

-- Add tank_type column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'tank_type'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN tank_type TEXT;
  END IF;
END $$;

-- Add size_gallons column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'size_gallons'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN size_gallons INTEGER;
  END IF;
END $$;

-- Add water_type column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'water_type'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN water_type TEXT;
  END IF;
END $$;

-- Add created_at column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tanks' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tanks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- STEP 3: Add foreign key constraint if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tanks_owner_id_fkey'
    AND table_name = 'tanks'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tanks
    ADD CONSTRAINT tanks_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ============================================
-- STEP 4: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tanks_owner_id ON public.tanks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tanks_created_at ON public.tanks(created_at DESC);

-- ============================================
-- STEP 5: Create or replace updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tanks_updated_at ON public.tanks;

CREATE TRIGGER update_tanks_updated_at
  BEFORE UPDATE ON public.tanks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify the schema matches expectations:
-- 
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'tanks'
-- ORDER BY ordinal_position;

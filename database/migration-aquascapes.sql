-- Aquascape Database Setup Instructions
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- ================================
-- 1. Create aquascapes table
-- ================================
CREATE TABLE IF NOT EXISTS public.aquascapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_tank FOREIGN KEY (tank_id) REFERENCES public.tanks(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_tank_aquascape UNIQUE (tank_id)
);

-- Index for faster lookups by tank
CREATE INDEX IF NOT EXISTS idx_aquascapes_tank_id ON public.aquascapes(tank_id);
CREATE INDEX IF NOT EXISTS idx_aquascapes_owner_id ON public.aquascapes(owner_id);

-- ================================
-- 2. Create aquascape_versions table
-- ================================
CREATE TABLE IF NOT EXISTS public.aquascape_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aquascape_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  layout JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_aquascape FOREIGN KEY (aquascape_id) REFERENCES public.aquascapes(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_aquascape_version UNIQUE (aquascape_id, version)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_aquascape_versions_aquascape_id ON public.aquascape_versions(aquascape_id);
CREATE INDEX IF NOT EXISTS idx_aquascape_versions_owner_id ON public.aquascape_versions(owner_id);
CREATE INDEX IF NOT EXISTS idx_aquascape_versions_created_at ON public.aquascape_versions(created_at DESC);

-- ================================
-- 3. Create view for latest versions
-- ================================
CREATE OR REPLACE VIEW public.v_aquascape_latest AS
SELECT DISTINCT ON (av.aquascape_id)
  av.id,
  av.aquascape_id,
  av.owner_id,
  av.version,
  av.layout,
  av.created_at,
  a.tank_id
FROM public.aquascape_versions av
INNER JOIN public.aquascapes a ON a.id = av.aquascape_id
ORDER BY av.aquascape_id, av.version DESC;

-- ================================
-- 4. Enable Row Level Security (RLS)
-- ================================
ALTER TABLE public.aquascapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aquascape_versions ENABLE ROW LEVEL SECURITY;

-- ================================
-- 5. RLS Policies for aquascapes
-- ================================

-- Policy: Users can view their own aquascapes
DROP POLICY IF EXISTS "Users can view their own aquascapes" ON public.aquascapes;
CREATE POLICY "Users can view their own aquascapes"
  ON public.aquascapes
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can insert their own aquascapes
DROP POLICY IF EXISTS "Users can insert their own aquascapes" ON public.aquascapes;
CREATE POLICY "Users can insert their own aquascapes"
  ON public.aquascapes
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own aquascapes
DROP POLICY IF EXISTS "Users can update their own aquascapes" ON public.aquascapes;
CREATE POLICY "Users can update their own aquascapes"
  ON public.aquascapes
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own aquascapes
DROP POLICY IF EXISTS "Users can delete their own aquascapes" ON public.aquascapes;
CREATE POLICY "Users can delete their own aquascapes"
  ON public.aquascapes
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ================================
-- 6. RLS Policies for aquascape_versions
-- ================================

-- Policy: Users can view their own versions
DROP POLICY IF EXISTS "Users can view their own aquascape versions" ON public.aquascape_versions;
CREATE POLICY "Users can view their own aquascape versions"
  ON public.aquascape_versions
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can insert their own versions
DROP POLICY IF EXISTS "Users can insert their own aquascape versions" ON public.aquascape_versions;
CREATE POLICY "Users can insert their own aquascape versions"
  ON public.aquascape_versions
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own versions (rare, but allowed)
DROP POLICY IF EXISTS "Users can update their own aquascape versions" ON public.aquascape_versions;
CREATE POLICY "Users can update their own aquascape versions"
  ON public.aquascape_versions
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own versions
DROP POLICY IF EXISTS "Users can delete their own aquascape versions" ON public.aquascape_versions;
CREATE POLICY "Users can delete their own aquascape versions"
  ON public.aquascape_versions
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ================================
-- 7. Updated_at trigger for aquascapes
-- ================================
CREATE OR REPLACE FUNCTION public.update_aquascapes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_aquascapes_updated_at ON public.aquascapes;
CREATE TRIGGER trigger_update_aquascapes_updated_at
  BEFORE UPDATE ON public.aquascapes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_aquascapes_updated_at();

-- ================================
-- DONE!
-- ================================
-- Tables created:
--   - public.aquascapes (one per tank)
--   - public.aquascape_versions (multiple versions per aquascape)
--   - public.v_aquascape_latest (view for latest version)
--
-- All tables have RLS enabled and proper policies set.
-- Users can only access their own data.   

-- ============================================
-- Database Schema for Tanks and Tank Items
-- ============================================
-- This file contains the table definitions for tanks and tank_items
-- Run this BEFORE applying the RLS policies (rls-policies.sql)

-- ============================================
-- TANKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tank_type TEXT NOT NULL CHECK (tank_type IN ('rectangle', 'cube', 'bowfront', 'custom')),
  size_gallons INTEGER NOT NULL CHECK (size_gallons > 0),
  water_type TEXT NOT NULL CHECK (water_type IN ('freshwater', 'saltwater', 'brackish')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tanks_owner_id ON public.tanks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tanks_created_at ON public.tanks(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tanks_updated_at
  BEFORE UPDATE ON public.tanks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TANK_ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.tank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('fish', 'equipment', 'decor', 'plant')),
  
  -- For fish items
  species_slug TEXT,
  
  -- For all items
  common_name TEXT,
  nickname TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tank_items_tank_id ON public.tank_items(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_items_item_type ON public.tank_items(item_type);
CREATE INDEX IF NOT EXISTS idx_tank_items_species_slug ON public.tank_items(species_slug) WHERE species_slug IS NOT NULL;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_tank_items_updated_at
  BEFORE UPDATE ON public.tank_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- WATER_LOGS TABLE (if not already exists)
-- ============================================
-- Ensure water_logs table has proper foreign key to tanks

-- Add tank_id foreign key if not exists (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'water_logs_tank_id_fkey'
    AND table_name = 'water_logs'
  ) THEN
    ALTER TABLE public.water_logs
    ADD CONSTRAINT water_logs_tank_id_fkey
    FOREIGN KEY (tank_id) REFERENCES public.tanks(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Add index for performance if not exists
CREATE INDEX IF NOT EXISTS idx_water_logs_tank_id ON public.water_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_owner_id ON public.water_logs(owner_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the schema:

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('tanks', 'tank_items', 'water_logs');

-- Check foreign keys
-- SELECT
--   tc.table_name, 
--   tc.constraint_name, 
--   tc.constraint_type, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- WHERE tc.table_name IN ('tanks', 'tank_items', 'water_logs')
-- ORDER BY tc.table_name, tc.constraint_type;

-- ============================================
-- RLS Policies for Tanks & Tank Items
-- ============================================
-- This file contains Row Level Security policies to ensure:
-- 1. Users can only access their own tanks
-- 2. Users can only access tank_items for their own tanks
-- 3. All operations require authentication

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

-- Drop policies for tanks table
DROP POLICY IF EXISTS "tanks_select_policy" ON public.tanks;
DROP POLICY IF EXISTS "tanks_insert_policy" ON public.tanks;
DROP POLICY IF EXISTS "tanks_update_policy" ON public.tanks;
DROP POLICY IF EXISTS "tanks_delete_policy" ON public.tanks;

-- Drop policies for tank_items table
DROP POLICY IF EXISTS "tank_items_select_policy" ON public.tank_items;
DROP POLICY IF EXISTS "tank_items_insert_policy" ON public.tank_items;
DROP POLICY IF EXISTS "tank_items_update_policy" ON public.tank_items;
DROP POLICY IF EXISTS "tank_items_delete_policy" ON public.tank_items;

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tank_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TANKS TABLE POLICIES
-- ============================================

-- SELECT: Users can only see their own tanks
CREATE POLICY "tanks_select_policy" ON public.tanks
  FOR SELECT
  USING (owner_id = auth.uid());

-- INSERT: Users can only create tanks for themselves
CREATE POLICY "tanks_insert_policy" ON public.tanks
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Users can only update their own tanks
CREATE POLICY "tanks_update_policy" ON public.tanks
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- DELETE: Users can only delete their own tanks
CREATE POLICY "tanks_delete_policy" ON public.tanks
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- TANK_ITEMS TABLE POLICIES
-- ============================================
-- Tank items can only be accessed if the related tank belongs to the user

-- SELECT: Users can only see items for their own tanks
CREATE POLICY "tank_items_select_policy" ON public.tank_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = tank_items.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- INSERT: Users can only create items for their own tanks
CREATE POLICY "tank_items_insert_policy" ON public.tank_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = tank_items.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- UPDATE: Users can only update items for their own tanks
CREATE POLICY "tank_items_update_policy" ON public.tank_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = tank_items.tank_id
      AND tanks.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = tank_items.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- DELETE: Users can only delete items for their own tanks
CREATE POLICY "tank_items_delete_policy" ON public.tank_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = tank_items.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- ============================================
-- WATER_LOGS TABLE POLICIES (if not already set)
-- ============================================
-- These policies ensure water logs can only be accessed through owned tanks

-- Enable RLS if not already enabled
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "water_logs_select_policy" ON public.water_logs;
DROP POLICY IF EXISTS "water_logs_insert_policy" ON public.water_logs;
DROP POLICY IF EXISTS "water_logs_update_policy" ON public.water_logs;
DROP POLICY IF EXISTS "water_logs_delete_policy" ON public.water_logs;

-- SELECT: Users can see logs for their own tanks or their device
CREATE POLICY "water_logs_select_policy" ON public.water_logs
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = water_logs.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- INSERT: Users can insert logs for their own tanks
CREATE POLICY "water_logs_insert_policy" ON public.water_logs
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = water_logs.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own logs
CREATE POLICY "water_logs_update_policy" ON public.water_logs
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = water_logs.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- DELETE: Users can delete their own logs
CREATE POLICY "water_logs_delete_policy" ON public.water_logs
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tanks
      WHERE tanks.id = water_logs.tank_id
      AND tanks.owner_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify policies are active:
-- 
-- SELECT tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('tanks', 'tank_items', 'water_logs')
-- ORDER BY tablename, cmd;

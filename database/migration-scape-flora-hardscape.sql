-- ================================
-- Scape Flora and Hardscape Tables Migration
-- ================================
-- Run this SQL in your Supabase SQL Editor to create the catalog tables for plants/corals and decorations

-- ================================
-- 1. Create scape_flora table (Plants & Corals)
-- ================================

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS public.scape_flora CASCADE;

CREATE TABLE IF NOT EXISTS public.scape_flora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  water_type TEXT NOT NULL CHECK (water_type IN ('freshwater', 'saltwater', 'brackish')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  light_requirement TEXT CHECK (light_requirement IN ('low', 'medium', 'high')),
  growth_rate TEXT CHECK (growth_rate IN ('slow', 'medium', 'fast')),
  max_height_inches INTEGER,
  placement TEXT CHECK (placement IN ('foreground', 'midground', 'background', 'floating')),
  care_notes TEXT,
  image_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for scape_flora
CREATE INDEX IF NOT EXISTS idx_scape_flora_slug ON public.scape_flora(slug);
CREATE INDEX IF NOT EXISTS idx_scape_flora_water_type ON public.scape_flora(water_type);
CREATE INDEX IF NOT EXISTS idx_scape_flora_difficulty ON public.scape_flora(difficulty);

-- ================================
-- 2. Create scape_hardscape table (Decorations)
-- ================================

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS public.scape_hardscape CASCADE;

CREATE TABLE IF NOT EXISTS public.scape_hardscape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('rock', 'driftwood', 'cave', 'ornament', 'substrate')),
  water_type TEXT NOT NULL CHECK (water_type IN ('freshwater', 'saltwater', 'brackish', 'both')),
  description TEXT,
  material TEXT,
  affects_water_chemistry BOOLEAN DEFAULT false,
  care_notes TEXT,
  image_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for scape_hardscape
CREATE INDEX IF NOT EXISTS idx_scape_hardscape_slug ON public.scape_hardscape(slug);
CREATE INDEX IF NOT EXISTS idx_scape_hardscape_item_type ON public.scape_hardscape(item_type);
CREATE INDEX IF NOT EXISTS idx_scape_hardscape_water_type ON public.scape_hardscape(water_type);

-- ================================
-- 3. Enable Row Level Security (RLS)
-- ================================
-- These are catalog tables - everyone can read, only admins can write
ALTER TABLE public.scape_flora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scape_hardscape ENABLE ROW LEVEL SECURITY;

-- ================================
-- 4. RLS Policies for scape_flora
-- ================================

-- Policy: Anyone can view flora catalog
DROP POLICY IF EXISTS "Anyone can view flora catalog" ON public.scape_flora;
CREATE POLICY "Anyone can view flora catalog"
  ON public.scape_flora
  FOR SELECT
  USING (true);

-- ================================
-- 5. RLS Policies for scape_hardscape
-- ================================

-- Policy: Anyone can view hardscape catalog
DROP POLICY IF EXISTS "Anyone can view hardscape catalog" ON public.scape_hardscape;
CREATE POLICY "Anyone can view hardscape catalog"
  ON public.scape_hardscape
  FOR SELECT
  USING (true);

-- ================================
-- 6. Updated_at triggers
-- ================================

-- Trigger for scape_flora
CREATE OR REPLACE FUNCTION public.update_scape_flora_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scape_flora_updated_at ON public.scape_flora;
CREATE TRIGGER trigger_update_scape_flora_updated_at
  BEFORE UPDATE ON public.scape_flora
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scape_flora_updated_at();

-- Trigger for scape_hardscape
CREATE OR REPLACE FUNCTION public.update_scape_hardscape_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scape_hardscape_updated_at ON public.scape_hardscape;
CREATE TRIGGER trigger_update_scape_hardscape_updated_at
  BEFORE UPDATE ON public.scape_hardscape
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scape_hardscape_updated_at();

-- ================================
-- 7. Sample Data - Freshwater Plants
-- ================================

INSERT INTO public.scape_flora (slug, common_name, scientific_name, water_type, difficulty, light_requirement, growth_rate, max_height_inches, placement, care_notes, image_key)
VALUES
  ('java-fern', 'Java Fern', 'Microsorum pteropus', 'freshwater', 'easy', 'low', 'slow', 13, 'midground', 'Attach to rocks or driftwood. Do not bury rhizome in substrate.', NULL),
  ('anubias-nana', 'Anubias Nana', 'Anubias barteri var. nana', 'freshwater', 'easy', 'low', 'slow', 5, 'foreground', 'Hardy plant that thrives in low light. Attach to hardscape.', NULL),
  ('amazon-sword', 'Amazon Sword', 'Echinodorus amazonicus', 'freshwater', 'easy', 'medium', 'medium', 20, 'background', 'Popular centerpiece plant. Needs root tabs for nutrients.', NULL),
  ('java-moss', 'Java Moss', 'Taxiphyllum barbieri', 'freshwater', 'easy', 'low', 'medium', 4, 'foreground', 'Great for carpeting or attaching to hardscape. Easy to grow.', NULL),
  ('dwarf-hairgrass', 'Dwarf Hairgrass', 'Eleocharis parvula', 'freshwater', 'medium', 'high', 'fast', 6, 'foreground', 'Popular carpeting plant. Needs CO2 and high light for best results.', NULL),
  ('rotala-indica', 'Rotala Indica', 'Rotala rotundifolia', 'freshwater', 'medium', 'high', 'fast', 12, 'background', 'Colorful stem plant that grows quickly with good conditions.', NULL),
  ('water-sprite', 'Water Sprite', 'Ceratopteris thalictroides', 'freshwater', 'easy', 'medium', 'fast', 16, 'background', 'Fast-growing plant great for nutrient export. Can float or be planted.', NULL),
  ('cryptocoryne-wendtii', 'Cryptocoryne Wendtii', 'Cryptocoryne wendtii', 'freshwater', 'easy', 'low', 'slow', 8, 'midground', 'Hardy crypt that tolerates various conditions. May experience "crypt melt".', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ================================
-- 8. Sample Data - Saltwater Corals
-- ================================

INSERT INTO public.scape_flora (slug, common_name, scientific_name, water_type, difficulty, light_requirement, growth_rate, max_height_inches, placement, care_notes, image_key)
VALUES
  ('green-star-polyps', 'Green Star Polyps', 'Pachyclavularia violacea', 'saltwater', 'easy', 'medium', 'fast', 8, 'background', 'Hardy coral that grows quickly. Great beginner coral.', NULL),
  ('zoanthids', 'Zoanthids', 'Zoanthus sp.', 'saltwater', 'easy', 'medium', 'medium', 2, 'foreground', 'Colorful and hardy soft corals. Many color morphs available.', NULL),
  ('mushroom-coral', 'Mushroom Coral', 'Actinodiscus sp.', 'saltwater', 'easy', 'low', 'slow', 3, 'foreground', 'Very hardy soft coral. Perfect for beginners.', NULL),
  ('kenya-tree', 'Kenya Tree Coral', 'Capnella sp.', 'saltwater', 'easy', 'medium', 'fast', 12, 'midground', 'Fast-growing soft coral. Propagates easily.', NULL),
  ('hammer-coral', 'Hammer Coral', 'Euphyllia ancora', 'saltwater', 'medium', 'medium', 'slow', 8, 'midground', 'Popular LPS coral with hammer-shaped tentacles. Needs stable parameters.', NULL),
  ('torch-coral', 'Torch Coral', 'Euphyllia glabrescens', 'saltwater', 'medium', 'medium', 'slow', 10, 'midground', 'Beautiful LPS coral. Provide moderate flow and stable conditions.', NULL),
  ('bubble-coral', 'Bubble Coral', 'Plerogyra sinuosa', 'saltwater', 'medium', 'medium', 'slow', 6, 'midground', 'Unique appearance with bubble-like vesicles. Needs low to moderate flow.', NULL),
  ('montipora-capricornis', 'Montipora Capricornis', 'Montipora capricornis', 'saltwater', 'medium', 'high', 'fast', 12, 'background', 'Plating SPS coral. Needs stable water parameters and strong lighting.', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ================================
-- 9. Sample Data - Hardscape (Decorations)
-- ================================

INSERT INTO public.scape_hardscape (slug, name, item_type, water_type, description, material, affects_water_chemistry, care_notes, image_key)
VALUES
  ('dragon-stone', 'Dragon Stone', 'rock', 'both', 'Inert rock with unique texture and holes. Great for aquascaping.', 'Ohko Stone', false, 'Rinse before use. Does not affect water chemistry.', NULL),
  ('seiryu-stone', 'Seiryu Stone', 'rock', 'both', 'Beautiful grey stone with white veining. Raises pH slightly.', 'Limestone', true, 'May increase hardness and pH. Ideal for African cichlids.', NULL),
  ('lava-rock', 'Lava Rock', 'rock', 'both', 'Porous volcanic rock. Great for beneficial bacteria.', 'Volcanic Rock', false, 'Very porous. Rinse well before use.', NULL),
  ('manzanita-driftwood', 'Manzanita Driftwood', 'driftwood', 'both', 'Dense hardwood with unique branching. Sinks immediately.', 'Manzanita Wood', false, 'Minimal tannin release. Long-lasting.', NULL),
  ('spiderwood', 'Spiderwood', 'driftwood', 'both', 'Intricate branching pattern resembling spiders. Natural look.', 'Azalea Root', false, 'Soak for a few days before use. May release tannins initially.', NULL),
  ('malaysian-driftwood', 'Malaysian Driftwood', 'driftwood', 'freshwater', 'Classic aquarium driftwood. Releases beneficial tannins.', 'Malaysian Wood', true, 'Soak to remove excess tannins. May lower pH slightly.', NULL),
  ('coconut-cave', 'Coconut Shell Cave', 'cave', 'both', 'Natural hiding spot made from coconut shell. Fish love it!', 'Coconut Shell', false, 'Rinse before use. Great for small fish and shrimp.', NULL),
  ('ceramic-cave', 'Ceramic Cave', 'cave', 'both', 'Smooth ceramic hiding spot. Available in various sizes.', 'Ceramic', false, 'Easy to clean. Does not affect water chemistry.', NULL),
  ('slate-rock', 'Slate Rock', 'rock', 'both', 'Flat layered rock. Perfect for creating terraces.', 'Slate', false, 'Inert. Great for stacking and creating caves.', NULL),
  ('aquarium-sand', 'Natural Aquarium Sand', 'substrate', 'both', 'Fine grain sand substrate. Natural tan color.', 'Silica Sand', false, 'Rinse thoroughly before use. Good for bottom feeders.', NULL),
  ('flourite', 'Flourite Substrate', 'substrate', 'freshwater', 'Porous clay substrate enriched with iron. Ideal for planted tanks.', 'Clay', false, 'No need to replace. Provides nutrients for plant roots.', NULL),
  ('coral-sand', 'Coral Sand', 'substrate', 'saltwater', 'Aragonite sand for marine aquariums. Helps buffer pH.', 'Aragonite', true, 'Raises pH and hardness. Ideal for saltwater and African cichlids.', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ================================
-- 10. Set image_key paths for all items
-- ================================

-- Update flora items with storage paths
UPDATE public.scape_flora
SET image_key = 'catalog/scaping/flora/' || slug || '.webp';

-- Update hardscape items with storage paths
UPDATE public.scape_hardscape
SET image_key = 'catalog/scaping/hardscape/' || slug || '.webp';

-- ================================
-- DONE!
-- ================================
-- Tables created:
--   - public.scape_flora (plants and corals catalog)
--   - public.scape_hardscape (decorations catalog)
--
-- Sample data inserted for:
--   - 8 freshwater plants
--   - 8 saltwater corals
--   - 12 hardscape items
--
-- All tables have RLS enabled with public read access.
-- Run this migration in Supabase SQL Editor.

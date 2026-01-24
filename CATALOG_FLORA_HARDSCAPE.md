# Catalog Integration: Flora & Hardscape

This document explains the integration of plants/corals (flora) and decorations (hardscape) into the catalog system using Supabase.

## Overview

The catalog now displays data from Supabase tables:
- **Plants/Corals Tab**: Data from `scape_flora` table
- **Decor Tab**: Data from `scape_hardscape` table

Both tabs support water type filtering (freshwater/saltwater) and search functionality.

## Database Setup

### Step 1: Run SQL Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of [`database/migration-scape-flora-hardscape.sql`](../database/migration-scape-flora-hardscape.sql)
5. Click **Run** or press `Ctrl+Enter`

This will:
- Create `scape_flora` table with 16 sample items (8 freshwater plants + 8 saltwater corals)
- Create `scape_hardscape` table with 12 sample decorations
- Set up RLS policies (public read access)
- Add appropriate indexes

### Step 2: Verify Tables

Run this query to verify the tables exist:

```sql
-- Check scape_flora
SELECT COUNT(*) as flora_count FROM public.scape_flora;

-- Check scape_hardscape
SELECT COUNT(*) as hardscape_count FROM public.scape_hardscape;

-- View sample data
SELECT slug, common_name, water_type, difficulty FROM public.scape_flora LIMIT 5;
SELECT slug, name, type, water_type FROM public.scape_hardscape LIMIT 5;
```

Expected:
- `flora_count`: 16 (8 freshwater + 8 saltwater)
- `hardscape_count`: 12

## Architecture

### New Files Created

1. **`utils/floraCatalogAdapter.ts`**
   - Handles CRUD operations for `scape_flora` table
   - Exports `FloraItem` interface
   - Functions: `getFloraCatalog()`, `getFloraBySlug()`, `getFloraById()`

2. **`utils/hardscapeCatalogAdapter.ts`**
   - Handles CRUD operations for `scape_hardscape` table
   - Exports `HardscapeItem` interface
   - Functions: `getHardscapeCatalog()`, `getHardscapeBySlug()`, `getHardscapeById()`

3. **`database/migration-scape-flora-hardscape.sql`**
   - Complete migration script for both tables
   - Includes sample data
   - RLS policies and triggers

### Modified Files

1. **`app/(tabs)/catalog.tsx`**
   - Updated "Plants" tab to "Plants/Corals"
   - Integrated `getFloraCatalog()` adapter
   - Integrated `getHardscapeCatalog()` adapter
   - Added loading states for flora and hardscape
   - Water type filters now work for plants/corals and decor tabs

## Features

### Plants/Corals Tab

- **Data Source**: Supabase `scape_flora` table
- **Display**:
  - Common name
  - Scientific name (or water type if no scientific name)
  - Difficulty badge (easy/medium/hard)
  - Light requirement (low/medium/high)
- **Filters**:
  - Water type (freshwater/saltwater)
  - Difficulty (easy/medium/hard)
  - Search by name
- **Visual Distinction**:
  - Freshwater plants: 🌿 green background
  - Saltwater corals: 🪸 pink background

### Decor Tab

- **Data Source**: Supabase `scape_hardscape` table
- **Display**:
  - Item name
  - Material or type
  - Type badge (rock/driftwood/cave/ornament/substrate)
- **Filters**:
  - Water type (freshwater/saltwater/both)
  - Search by name, description, or material
- **Icons by Type**:
  - Rock: 🪨
  - Driftwood: 🪵
  - Cave: 🏔️
  - Ornament: 🗿
  - Substrate: ⬜

## Data Structure

### scape_flora Table

```sql
id                  UUID PRIMARY KEY
slug                TEXT UNIQUE NOT NULL
common_name         TEXT NOT NULL
scientific_name     TEXT
water_type          TEXT ('freshwater' | 'saltwater' | 'brackish')
difficulty          TEXT ('easy' | 'medium' | 'hard')
light_requirement   TEXT ('low' | 'medium' | 'high')
growth_rate         TEXT ('slow' | 'medium' | 'fast')
max_height_inches   INTEGER
placement           TEXT ('foreground' | 'midground' | 'background' | 'floating')
care_notes          TEXT
image_key           TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### scape_hardscape Table

```sql
id                       UUID PRIMARY KEY
slug                     TEXT UNIQUE NOT NULL
name                     TEXT NOT NULL
item_type                TEXT ('rock' | 'driftwood' | 'cave' | 'ornament' | 'substrate')
water_type               TEXT ('freshwater' | 'saltwater' | 'brackish' | 'both')
description              TEXT
material                 TEXT
affects_water_chemistry  BOOLEAN
care_notes               TEXT
image_key                TEXT
created_at               TIMESTAMP
updated_at               TIMESTAMP
```

## Sample Data Included

### Freshwater Plants
- Java Fern
- Anubias Nana
- Amazon Sword
- Java Moss
- Dwarf Hairgrass
- Rotala Indica
- Water Sprite
- Cryptocoryne Wendtii

### Saltwater Corals
- Green Star Polyps
- Zoanthids
- Mushroom Coral
- Kenya Tree Coral
- Hammer Coral
- Torch Coral
- Bubble Coral
- Montipora Capricornis

### Decorations
- Dragon Stone
- Seiryu Stone
- Lava Rock
- Manzanita Driftwood
- Spiderwood
- Malaysian Driftwood
- Coconut Cave
- Ceramic Cave
- Slate Rock
- Aquarium Sand
- Flourite Substrate
- Coral Sand

## Adding Custom Data

To add your own plants, corals, or decorations:

```sql
-- Add a new plant
INSERT INTO public.scape_flora (
  slug, 
  common_name, 
  scientific_name, 
  water_type, 
  difficulty, 
  light_requirement, 
  care_notes
)
VALUES (
  'my-plant-slug',
  'My Custom Plant',
  'Plantus customus',
  'freshwater',
  'easy',
  'low',
  'This plant is easy to care for.'
);

-- Add a new decoration
INSERT INTO public.scape_hardscape (
  slug,
  name,
  item_type,
  water_type,
  description,
  material
)
VALUES (
  'my-rock-slug',
  'My Custom Rock',
  'rock',
  'both',
  'A beautiful custom rock',
  'Natural Stone'
);
```

## Testing

1. **Start the app:**
   ```bash
   npx expo start -c
   ```

2. **Navigate to Catalog tab**

3. **Test Plants/Corals:**
   - Click "Plants/Corals" tab
   - Should see 16 items (plants and corals)
   - Use water type filter: freshwater should show only plants, saltwater should show only corals
   - Try search functionality

4. **Test Decor:**
   - Click "Decor" tab
   - Should see 12 decoration items
   - Use water type filter: should work with "both" water type items
   - Try search functionality

## Troubleshooting

### No items showing in Plants/Corals or Decor tabs

1. Check if migration ran successfully:
   ```sql
   SELECT COUNT(*) FROM public.scape_flora;
   SELECT COUNT(*) FROM public.scape_hardscape;
   ```

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('scape_flora', 'scape_hardscape');
   ```

3. Check browser console for errors (in dev mode)

### Water type filter not working

- Ensure you've selected only one water type (selecting multiple or none doesn't filter)
- Check console logs: `[Catalog] Flora waterType filter:` or `[Catalog] Hardscape waterType filter:`

### Images not displaying

- The `image_key` field is optional in the sample data
- To add images, you'll need to:
  1. Upload images to Supabase Storage
  2. Update records with the storage path
  3. Use the existing `FishThumb` component (already integrated)

## Future Enhancements

Potential improvements:
- Add ability to add flora/hardscape items to tanks
- Implement detail modals for plants and decorations
- Add care requirement compatibility checks
- Support image uploads for custom items
- Add user ratings and reviews
- Implement favorites/wishlist feature

## Related Files

- Migration: [`database/migration-scape-flora-hardscape.sql`](../database/migration-scape-flora-hardscape.sql)
- Flora Adapter: [`utils/floraCatalogAdapter.ts`](../utils/floraCatalogAdapter.ts)
- Hardscape Adapter: [`utils/hardscapeCatalogAdapter.ts`](../utils/hardscapeCatalogAdapter.ts)
- Catalog Screen: [`app/(tabs)/catalog.tsx`](../app/(tabs)/catalog.tsx)

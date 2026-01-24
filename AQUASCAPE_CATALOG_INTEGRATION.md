# Aquascape Catalog Integration - Implementation Summary

## Overview
Successfully integrated the `scape_flora` and `scape_hardscape` Supabase catalog tables into the aquascape feature. Users can now select real plants/corals and decorations from the catalog (with water type restrictions) to place in their aquascape, replacing the previous emoji-based system.

## Changes Made

### 1. Data Model Updates

#### `utils/aquascapeRemote.ts`
- Extended `AquascapeLayoutItem` interface with optional catalog reference fields:
  ```typescript
  catalogItemSlug?: string;        // Reference to scape_flora or scape_hardscape slug
  catalogItemType?: 'flora' | 'hardscape';  // Which catalog table
  ```
- The `assetKey` field now stores the catalog item's `image_key` when it's a catalog item

#### `utils/aquascapeLayout.ts`
- Updated `MappedLayoutItem` interface to include catalog fields
- Modified `normalizeLayout()` to preserve catalog fields during normalization
- Modified `mapLayoutToContainer()` to preserve catalog fields during coordinate mapping

### 2. Aquascape Editor Screen (`app/(tabs)/aquascape.tsx`)

#### Imports Added
- `FloraSelectionSheet` and `HardscapeSelectionSheet` components
- `FishThumb` component for image display
- `FloraItem` and `HardscapeItem` types
- `getPublicImageUrl` utility

#### State Added
- `showFloraSheet`: Controls flora selection bottom sheet visibility
- `showHardscapeSheet`: Controls hardscape selection bottom sheet visibility

#### Functions Updated
- **`addItem()`**: Extended signature to accept catalog references
  ```typescript
  addItem(
    type: 'rock' | 'wood' | 'plant',
    assetKey: string,
    catalogItemSlug?: string,
    catalogItemType?: 'flora' | 'hardscape'
  )
  ```

#### New Handlers
- **`handleFloraSelect(flora: FloraItem)`**: Adds selected plant/coral to layout
  - Uses flora's `image_key` as `assetKey` for FishThumb display
  - Sets `catalogItemSlug` and `catalogItemType` for catalog tracking
  - Type is always 'plant' for flora items

- **`handleHardscapeSelect(hardscape: HardscapeItem)`**: Adds selected decoration to layout
  - Uses hardscape's `image_key` as `assetKey`
  - Type is 'rock' or 'wood' based on `item_type`
  - Sets catalog references

#### UI Changes
- **Palette Buttons**: Replaced 3 emoji buttons (Rock, Wood, Plant) with 2 catalog buttons:
  - 🌿 **Plants/Coral** → Opens `FloraSelectionSheet`
  - 🪨 **Decorations** → Opens `HardscapeSelectionSheet`

- **DraggableItem Component**: Updated to display catalog images
  - Checks if item has `catalogItemSlug` and `catalogItemType`
  - If yes: Renders `FishThumb` with catalog image
  - If no: Falls back to emoji (for legacy items or if catalog data is missing)

#### Selection Sheets Integration
- Added `<FloraSelectionSheet>` and `<HardscapeSelectionSheet>` at end of component
- Both sheets filter by `selectedTank.waterType` to enforce water compatibility
- Sheets pass selected items to handlers which add them to the layout

### 3. My Tank Screen (`app/(tabs)/mytank.tsx`)

#### AquascapeItem Component Update
- Added catalog image display logic (mirrors aquascape.tsx DraggableItem)
- Checks for `catalogItemSlug` and `catalogItemType`
- Renders `FishThumb` for catalog items, emoji for legacy items
- Maintains existing positioning, rotation, and z-index behavior

## Water Type Filtering

The integration respects tank water type restrictions:

### Flora (Plants/Corals)
- **Freshwater tanks**: Show only freshwater plants
- **Saltwater tanks**: Show only saltwater corals
- **Brackish tanks**: Show both freshwater plants and saltwater corals

### Hardscape (Decorations)
- **Any tank**: Shows decorations compatible with tank's water type
- Hardscape items with `water_type: 'both'` appear in all tank types
- Warns users if decoration `affects_water_chemistry: true`

## Data Flow

1. **User Action**: Taps "Plants/Coral" or "Decorations" button in aquascape editor
2. **Sheet Opens**: Bottom sheet loads catalog items filtered by tank water type
3. **Selection**: User taps an item in the sheet
4. **Handler Called**: `handleFloraSelect()` or `handleHardscapeSelect()`
5. **Item Added**: `addItem()` creates new layout item with:
   - `assetKey`: Set to catalog item's `image_key` (e.g., `'catalog/scaping/flora/java-fern.webp'`)
   - `catalogItemSlug`: Set to item's slug (e.g., `'java-fern'`)
   - `catalogItemType`: Set to `'flora'` or `'hardscape'`
6. **Display**: `DraggableItem` detects catalog fields and renders `FishThumb` with image
7. **Save**: Layout saved to Supabase with catalog references intact
8. **My Tank Display**: `AquascapeItem` in mytank.tsx reads catalog fields and displays images

## Backward Compatibility

The system maintains backward compatibility with existing aquascape layouts:

- **Legacy emoji items**: Items without catalog references display emojis as before
- **Mixed layouts**: Can contain both catalog items and legacy emoji items
- **Optional fields**: `catalogItemSlug` and `catalogItemType` are optional in the data model

## Image Handling

- **Storage Path**: `catalog/scaping/flora/{slug}.webp` and `catalog/scaping/hardscape/{slug}.webp`
- **FishThumb Component**: Automatically handles URL generation via `getPublicImageUrl()`
- **Fallback**: If image fails to load, FishThumb shows placeholder (no emoji fallback needed)

## Testing Recommendations

1. **Create new aquascape**: Add plants/corals and decorations from catalog
2. **Mixed layout**: Add both catalog items and verify they save/load correctly
3. **Water type filtering**: 
   - Create freshwater tank → verify only freshwater plants appear
   - Create saltwater tank → verify only saltwater corals appear
   - Create brackish tank → verify both appear
4. **My Tank display**: Verify catalog items render correctly in main tank view
5. **Drag and drop**: Verify catalog items can be moved, scaled, rotated like emoji items
6. **Save/load**: Save layout, switch tanks, switch back - verify layout persists
7. **Delete items**: Verify delete button (×) works for catalog items

## Known Limitations

1. **No catalog item editing**: Once added, you can't change which catalog item it is (must delete and re-add)
2. **No thumbnails in palette**: Palette buttons still use generic emojis (not item-specific)
3. **No search in sheets**: Selection sheets show all compatible items (no search filter yet)
4. **No favorites**: Can't mark catalog items as favorites for quick access

## Future Enhancements

1. **Quick palette**: Show recently used or favorited catalog items as quick-add buttons
2. **Item details**: Long-press on placed items to view catalog care notes
3. **Smart suggestions**: Recommend plants/decorations based on tank parameters
4. **Copy layouts**: Duplicate aquascape designs across tanks
5. **Community sharing**: Share aquascape layouts with other users
6. **AR preview**: Use camera to preview how decorations would look in real tank

## Files Modified

- ✅ `utils/aquascapeRemote.ts` - Extended AquascapeLayoutItem interface
- ✅ `utils/aquascapeLayout.ts` - Updated MappedLayoutItem and mapping functions
- ✅ `app/(tabs)/aquascape.tsx` - Integrated selection sheets and catalog display
- ✅ `app/(tabs)/mytank.tsx` - Updated AquascapeItem to show catalog images

## Files Created Earlier

- ✅ `components/sheets/FloraSelectionSheet.tsx` - Flora/coral selection bottom sheet
- ✅ `components/sheets/HardscapeSelectionSheet.tsx` - Hardscape selection bottom sheet
- ✅ `utils/floraCatalogAdapter.ts` - Flora catalog CRUD operations
- ✅ `utils/hardscapeCatalogAdapter.ts` - Hardscape catalog CRUD operations
- ✅ `database/migration-scape-flora-hardscape.sql` - Database tables and sample data

## No TypeScript Errors

All modified files compile without errors. TypeScript validation passed for:
- aquascape.tsx
- mytank.tsx
- aquascapeLayout.ts
- aquascapeRemote.ts

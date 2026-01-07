# Aquascape Designer Feature

## Overview
The Aquascape Designer lets users visually design their aquarium layouts by placing and arranging decorative items (rocks, driftwood, plants) on a 2D canvas. Layouts are versioned and persisted to Supabase.

## Features
- **Canvas-based editor** sized to tank aspect ratio
- **Draggable items** using PanResponder for smooth interaction
- **Item palette** with Rock 🪨, Driftwood 🪵, and Plant 🌿
- **Version history** - each save creates a new version
- **Auto-load** latest layout when opening a tank
- **Multi-tank support** via TankSwitcher component
- **Haptic feedback** for enhanced UX

## Database Schema

### Tables
1. **`public.aquascapes`**
   - One row per tank
   - Links tank to its aquascape designs
   - Columns: `id`, `tank_id`, `owner_id`, `created_at`, `updated_at`

2. **`public.aquascape_versions`**
   - Multiple versions per aquascape (version history)
   - Stores layout as JSONB
   - Columns: `id`, `aquascape_id`, `owner_id`, `version`, `layout`, `created_at`

3. **`public.v_aquascape_latest`** (view)
   - Returns the latest version for each aquascape
   - Used for fast retrieval of current layout

### Layout JSON Structure
```typescript
{
  canvas: {
    w: 327,  // Width in pixels
    h: 300   // Height in pixels
  },
  items: [
    {
      id: "rock-1234567890-abc",
      type: "rock" | "wood" | "plant",
      x: 150,        // X position in canvas
      y: 100,        // Y position in canvas
      scale: 1,      // Scale factor (1 = 100%)
      rotation: 0,   // Rotation in degrees
      meta: {}       // Additional metadata (future use)
    }
  ]
}
```

## Setup Instructions

### 1. Run Database Migration
Execute [migration-aquascapes.sql](./migration-aquascapes.sql) in your Supabase SQL Editor:
- Creates `aquascapes` and `aquascape_versions` tables
- Creates `v_aquascape_latest` view
- Enables RLS with proper policies
- Sets up foreign keys and indexes

### 2. Generate TypeScript Types (Optional)
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.d.ts
```

### 3. Tab Navigation
The Aquascape tab is already added to [app/(tabs)/_layout.tsx](../app/(tabs)/_layout.tsx) with a Layers icon.

## File Structure

### Backend
- [utils/remoteAquascapes.ts](../utils/remoteAquascapes.ts) - Supabase CRUD operations
  - `getOrCreateAquascapeForTank()` - Get or create aquascape record
  - `getLatestAquascapeLayout()` - Fetch latest version from view
  - `saveAquascapeVersion()` - Save new version with auto-increment

### Frontend
- [app/(tabs)/aquascape.tsx](../app/(tabs)/aquascape.tsx) - Main screen
  - Canvas with grid background
  - Draggable items using `PanResponder`
  - Item palette buttons
  - Save/Clear actions
  - Version display and last saved timestamp

## Usage Flow

1. **User selects a tank** via TankSwitcher
2. **Load existing layout** or start with empty canvas
3. **Add items** from palette (Rock, Wood, Plant)
4. **Drag items** to position them
   - Tap item while dragging to show remove button
   - Positions constrained to canvas bounds
5. **Save layout** to create new version
6. **Switch tanks** to design different aquascapes

## Implementation Details

### Dragging System
Uses React Native's `PanResponder` API:
- `onPanResponderGrant` - Start drag, show remove button
- `onPanResponderMove` - Update position via Animated API
- `onPanResponderRelease` - Snap to canvas bounds, save position

### Animation
- **Reanimated** for layout entrance animations (`FadeInDown`)
- **Animated API** for drag gestures (better performance than Reanimated for gestures)

### State Management
- Local state for layout editing
- Context (`useApp`) for tank selection
- Supabase for persistence

### Haptics
- Light impact when adding/dragging items
- Medium impact when removing items or clearing canvas
- Success/error notifications on save

## Future Enhancements

### Planned Features
- [ ] Rotation controls (two-finger rotation)
- [ ] Scale controls (pinch to zoom items)
- [ ] More item types (substrate, backgrounds, filters)
- [ ] Undo/Redo functionality
- [ ] Copy layout to another tank
- [ ] Export layout as image
- [ ] Community layouts (share/browse)
- [ ] Item library with real product images
- [ ] 3D preview mode

### Known Limitations
- Canvas size is fixed (not responsive to tank dimensions yet)
- No collision detection between items
- Items rendered as emojis (no custom assets yet)
- No layering/z-index controls
- Limited to 2D (no depth perception)

## Troubleshooting

### Layout not saving
- Check auth status: `session?.user?.id` must exist
- Verify RLS policies in Supabase dashboard
- Check console for Supabase errors

### Items not dragging smoothly
- Ensure `useNativeDriver: false` in PanResponder config
- Check for console warnings about Animated API misuse

### Canvas appears empty
- Verify `selectedTankId` is set
- Check `getLatestAquascapeLayout()` return value
- Ensure `items` array is populated

### TypeScript errors
- Regenerate Supabase types if schema changed
- Ensure `AquascapeLayout` interface matches DB structure

## API Reference

### `getOrCreateAquascapeForTank(params)`
Creates or retrieves aquascape record for a tank.

**Params:**
- `tankId: string` - Tank UUID
- `ownerId: string` - User UUID
- `tankName?: string` - Optional tank name for logging

**Returns:** `{ ok: boolean, aquascape?: Aquascape, error?: string }`

---

### `getLatestAquascapeLayout(params)`
Fetches latest layout version from `v_aquascape_latest` view.

**Params:**
- `tankId: string` - Tank UUID
- `ownerId: string` - User UUID

**Returns:** `{ ok: boolean, layout?: AquascapeLayout, version?: number, createdAt?: string, error?: string }`

---

### `saveAquascapeVersion(params)`
Saves new layout version with auto-incremented version number.

**Params:**
- `aquascapeId: string` - Aquascape UUID
- `ownerId: string` - User UUID
- `layout: AquascapeLayout` - Layout object

**Returns:** `{ ok: boolean, version?: number, error?: string }`

---

## Testing Checklist

- [ ] Create new tank and open Aquascape tab
- [ ] Add items from palette
- [ ] Drag items around canvas
- [ ] Remove item by tapping while dragging
- [ ] Save layout and verify version increments
- [ ] Switch tanks and verify separate layouts
- [ ] Log out and log in, verify layout persists
- [ ] Clear canvas and save empty layout
- [ ] Check "last saved" timestamp updates correctly

## Credits
Built with Expo, React Native, Supabase, and PanResponder.

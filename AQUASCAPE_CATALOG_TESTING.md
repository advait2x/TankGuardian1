# Aquascape Catalog Integration - Testing Guide

## Prerequisites
1. **Database Migration**: Ensure `migration-scape-flora-hardscape.sql` has been run in Supabase
2. **Images**: Verify flora and hardscape images exist in Supabase storage:
   - Bucket: `catalog/scaping/flora/` (e.g., `java-fern.webp`, `anubias-nana.webp`)
   - Bucket: `catalog/scaping/hardscape/` (e.g., `driftwood-medium.webp`, `dragon-stone.webp`)
3. **Tank Setup**: Have at least one tank created (freshwater, saltwater, or brackish)
4. **Login**: Be logged in with a valid Supabase account

## Test Scenarios

### 1. Basic Aquascape Creation

**Steps:**
1. Navigate to the Aquascape tab (scape icon in tab bar)
2. Ensure a tank is selected using TankSwitcher
3. Tap "Plants/Coral" button (🌿)
4. **Expected:** Modal opens with catalog items filtered by tank water type
5. Tap on any plant/coral item
6. **Expected:** Modal closes, item appears in center of canvas
7. Drag the item around
8. **Expected:** Item moves smoothly, positioned where you drag it
9. Repeat steps 3-7 with "Decorations" button (🪨)
10. Tap "Save Now" button
11. **Expected:** "Layout saved!" toast appears

**Validation:**
- Items display actual images, not emojis
- Items can be dragged, positioned freely
- Selected item shows delete button (×)
- Z-index ordering works (later items appear on top)

### 2. Water Type Filtering

#### Freshwater Tank
1. Select/create a freshwater tank
2. Navigate to Aquascape tab
3. Tap "Plants/Coral"
4. **Expected:** Only freshwater plants appear (e.g., Java Fern, Amazon Sword)
5. **Expected:** No corals (Button Polyp, Zoanthids, etc.)

#### Saltwater Tank
1. Select/create a saltwater tank
2. Navigate to Aquascape tab
3. Tap "Plants/Coral"
4. **Expected:** Only saltwater corals appear
5. **Expected:** No freshwater plants

#### Brackish Tank
1. Select/create a brackish tank
2. Navigate to Aquascape tab
3. Tap "Plants/Coral"
4. **Expected:** Both freshwater plants AND saltwater corals appear

#### Hardscape (All Tanks)
1. In any tank type, tap "Decorations"
2. **Expected:** Decorations with `water_type: 'both'` appear in all tanks
3. **Expected:** Freshwater-specific decor only in freshwater/brackish
4. **Expected:** Saltwater-specific decor only in saltwater/brackish

### 3. My Tank Display

**Steps:**
1. Create aquascape with several plants and decorations (as in Test 1)
2. Tap "Save Now"
3. Navigate to "My Tank" tab
4. **Expected:** All catalog items render as images in tank display
5. **Expected:** Items maintain their positions, rotations, scales
6. **Expected:** Substrate shows correctly
7. **Expected:** Z-ordering preserved (items layered correctly)

**Validation:**
- Images display, not emojis
- Layout matches what you created in aquascape editor
- Items stay in correct positions even on different screen sizes

### 4. Mixed Legacy and Catalog Items

**Steps:**
1. Open aquascape.tsx in code editor
2. Find the addItem() function calls
3. Temporarily add a legacy emoji item:
   ```typescript
   addItem('rock', 'rock-1'); // Legacy emoji item
   ```
4. Save, reload app
5. Navigate to Aquascape tab
6. **Expected:** Legacy emoji rock appears alongside catalog images
7. Add catalog plants via "Plants/Coral" button
8. **Expected:** Mix of emojis and catalog images renders correctly

**Validation:**
- Both emoji and catalog items can coexist
- Both types are draggable and saveable
- My Tank renders both types

### 5. Save/Load Persistence

**Steps:**
1. Create aquascape with 5+ items (plants + decorations)
2. Tap "Save Now"
3. Navigate away from Aquascape tab
4. Switch to a different tank
5. Switch back to original tank
6. Navigate back to Aquascape tab
7. **Expected:** Layout loads exactly as saved
8. Navigate to My Tank tab
9. **Expected:** Items display correctly

**Validation:**
- Catalog references (slugs) are preserved
- Image URLs regenerate correctly on reload
- No data loss between saves

### 6. Delete and Clear Functions

**Steps:**
1. Create aquascape with multiple items
2. Tap on an item to select it
3. **Expected:** Delete button (×) appears
4. Tap delete button
5. **Expected:** Item disappears, other items unaffected
6. Add more items, then tap "Clear" button
7. **Expected:** Confirmation prompt appears (if implemented)
8. Confirm clear
9. **Expected:** All items removed, canvas is empty

### 7. Edge Cases

#### Empty Catalog
1. Temporarily remove all items from a catalog table (via Supabase SQL)
2. Open selection modal
3. **Expected:** "No items found" message displays
4. Restore catalog data

#### No Tank Selected
1. Delete all tanks or log out
2. Navigate to Aquascape tab
3. **Expected:** Appropriate message ("No tank selected" or "Create a tank first")

#### Network Failure
1. Turn on airplane mode
2. Try to open flora/hardscape selection
3. **Expected:** Loading indicator shows, then error/empty state
4. **Expected:** App doesn't crash

#### Invalid Image URLs
1. In Supabase, set an item's `image_key` to invalid path
2. Add that item to aquascape
3. **Expected:** FishThumb shows placeholder/fallback
4. **Expected:** App doesn't crash

### 8. Catalog Screen Integration

**Steps:**
1. Navigate to Catalog tab
2. Tap "Plants/Corals" tab
3. **Expected:** Same catalog items appear as in aquascape selection
4. Tap on an item
5. **Expected:** Detail modal shows care notes, image, water type badge
6. Repeat for "Decor" tab with hardscape items

**Validation:**
- Catalog screen and aquascape selection show same items
- Images display consistently
- Water type filtering works the same way

## Performance Testing

### Load Time
- Open aquascape selection modal repeatedly
- **Expected:** Opens within 1-2 seconds
- **Expected:** Smooth scrolling through catalog

### Large Layouts
- Create layout with 20+ items
- Save and reload
- **Expected:** All items load without lag
- **Expected:** My Tank renders smoothly

### Drag Performance
- Add 10+ items to canvas
- Drag items around rapidly
- **Expected:** No lag or stutter
- **Expected:** Pan gesture responds immediately

## Known Issues / Expected Behavior

1. **FlatList in Modal**: ScrollView wraps FlatList, may have nested scroll warnings (cosmetic only)
2. **Image Loading**: First time loading catalog images may be slow depending on network
3. **No Catalog Editing**: Once added, can't change which catalog item it is (must delete and re-add)
4. **Substrate Snap**: If "Place on Substrate" is ON, items snap to substrate line on drag end
5. **Grid Snap**: If "Snap to Grid" is ON, items align to grid on drag end

## Rollback Plan

If issues arise:
1. **Remove catalog integration**: Comment out FloraSelectionSheet/HardscapeSelectionSheet imports
2. **Restore emoji buttons**: Uncomment old palette buttons in aquascape.tsx
3. **Database**: Keep tables - they don't interfere with existing functionality
4. **Git Revert**: Revert to commit before aquascape catalog integration

## Success Criteria

✅ Water type filtering works correctly for all tank types
✅ Catalog images display instead of emojis
✅ Items can be added, moved, deleted without errors
✅ Layouts save and load correctly with catalog references
✅ My Tank display shows catalog images
✅ No TypeScript errors
✅ No runtime crashes
✅ Backward compatible with existing emoji-based layouts

## Reporting Issues

If you encounter bugs:
1. Check browser/React Native console for errors
2. Check Supabase logs for database/storage errors
3. Verify image_key paths in database match storage bucket structure
4. Test with simple layout (1-2 items) to isolate issue
5. Document steps to reproduce

## Next Steps After Testing

1. ✨ Add search/filter to selection modals
2. ⭐ Add favorites/recently used catalog items
3. 📱 Optimize modal layout for tablet screens
4. 🎨 Add thumbnails to palette buttons (instead of generic emojis)
5. 🔄 Add "Replace" functionality (change catalog item without repositioning)

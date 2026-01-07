# Aquascape Designer Demo Flow

## Visual Walkthrough

### 1. Initial State
**Screen: Home Tab**
- User sees their tanks
- Bottom tab bar shows new "Aquascape" tab with Layers icon

### 2. Navigate to Aquascape
**Screen: Aquascape Tab**
```
┌─────────────────────────────────┐
│  Aquascape Designer             │
│  Design your dream aquarium     │
├─────────────────────────────────┤
│  [Tank Switcher]                │
│  My 20G Tank  >                 │
├─────────────────────────────────┤
│  Layout Canvas          v1      │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ │   Tap buttons below to    │   │
│ │      add items            │   │
│ │                           │   │
│ └───────────────────────────┘   │
│  Last saved: Never                │
│  0 items                          │
├─────────────────────────────────┤
│  Add Items                       │
│  [🪨 Rock] [🪵 Wood] [🌿 Plant]  │
├─────────────────────────────────┤
│  [  Save Layout  ]  [ Clear ]    │
└─────────────────────────────────┘
```

### 3. Add Rock Item
**Action: Tap "🪨 Rock" button**
- Haptic feedback (light)
- Rock appears in center of canvas
```
┌───────────────────────────┐
│          🪨               │ ← New rock appears
│                           │
│                           │
└───────────────────────────┘
```

### 4. Drag Rock
**Action: Drag rock to bottom-left**
- Haptic feedback on touch
- Rock follows finger
- × button appears (for deletion)
```
┌───────────────────────────┐
│                           │
│                           │
│  🪨 ×                     │ ← Rock + remove button
└───────────────────────────┘
```

### 5. Add Multiple Items
**Action: Tap Wood and Plant buttons**
```
┌───────────────────────────┐
│              🌿           │ ← Plant top-right
│                           │
│  🪨      🪵               │ ← Rock + Wood
└───────────────────────────┘
3 items
```

### 6. Save Layout
**Action: Tap "Save Layout" button**
- Haptic feedback (medium)
- Button shows "Saving..."
- Toast: "Layout saved!"
- Version updates: v1 → v2
- Last saved: "Just now"

### 7. Switch Tank
**Action: Tap Tank Switcher, select "10G Nano"**
- Canvas clears (loads that tank's layout)
- Empty state shown
- Version resets to v0 (or existing version)
```
┌───────────────────────────┐
│                           │
│   Tap buttons below to    │ ← Empty canvas
│      add items            │    (different tank)
│                           │
└───────────────────────────┘
Last saved: Never
0 items
```

### 8. Complex Layout Example
**After adding and arranging multiple items:**
```
┌───────────────────────────┐
│ 🌿    🌿         🌿       │ ← Background plants
│    🪨                     │
│       🪵     🪨           │ ← Rocks + Wood
│ 🪨         🪵             │
└───────────────────────────┘
Version: v5
Last saved: 2m ago
7 items
```

### 9. Remove Item
**Action: Drag rock, then tap × button**
- Haptic feedback (medium)
- Rock disappears
- Item count decrements

### 10. Clear Canvas
**Action: Tap "Clear" button**
- Confirmation haptic
- All items removed
- Toast: "Canvas cleared"
- Canvas returns to empty state

## Interactive Elements

### Draggable Items
- **Touch**: Item highlights with thicker border
- **Drag**: Follows finger smoothly
- **Release**: Snaps to final position
- **Bounds**: Cannot drag outside canvas

### Haptic Feedback Map
| Action | Type | Intensity |
|--------|------|-----------|
| Add item | Impact | Light |
| Start drag | Impact | Light |
| Remove item | Impact | Medium |
| Save | Impact | Medium |
| Save success | Notification | Success |
| Save error | Notification | Error |
| Clear | Impact | Medium |

### Visual States
| Element | State | Appearance |
|---------|-------|------------|
| Item | Idle | White bg, thin teal border |
| Item | Dragging | White bg, thick teal border, shadow |
| Canvas | Empty | Grid bg, prompt text |
| Canvas | Populated | Grid bg, items visible |
| Save button | Idle | Primary teal |
| Save button | Saving | Disabled gray, "Saving..." |
| Clear button | Disabled | Gray (when 0 items) |

## User Flow Diagram
```
[Home Tab]
    ↓
[Tap Aquascape Tab]
    ↓
[Select Tank] ──→ [No tanks?] → [Show empty state]
    ↓
[Load Layout]
    ↓
[Empty Canvas] or [Populated Canvas]
    ↓
[Add Items] ←──┐
    ↓           │
[Drag Items]    │
    ↓           │
[Arrange] ──────┘ (iterate)
    ↓
[Tap Save]
    ↓
[Version Increments] → [Toast Confirmation]
    ↓
[Continue Editing] or [Switch Tanks]
```

## Expected Animations

### Entrance (Reanimated FadeInDown)
1. Header: 300ms delay 0ms
2. Tank Switcher: 300ms delay 50ms
3. Canvas Card: 300ms delay 100ms
4. Palette Card: 300ms delay 150ms
5. Action Buttons: 300ms delay 200ms
6. Auth Notice: 300ms delay 250ms

### Drag Gesture (Animated API)
- Smooth 60fps tracking
- No lag or stutter
- Immediate visual feedback

## Screenshot Locations

### Key Screens
1. **Empty Canvas** - First visit, no layout
2. **Adding First Item** - Rock button highlighted
3. **Dragging Item** - Rock with × button visible
4. **Complex Layout** - 5-7 items arranged
5. **Save Success** - Toast notification visible
6. **Version Badge** - v3 or higher displayed
7. **Tank Switcher** - Multiple tanks shown
8. **Empty State** - "No tank selected" message

## Demo Script (30 seconds)

**Narration:**
"Design your dream aquarium with the Aquascape Designer. Add rocks, driftwood, and plants with a tap. Drag to position. Save your layout. Switch between tanks. Version history keeps track of changes. Simple, fun, and persistent."

**Actions (in sync):**
1. 0s: Open app, show Aquascape tab
2. 3s: Tap Rock button
3. 5s: Drag rock to corner
4. 7s: Tap Wood button
5. 9s: Drag wood to center
6. 11s: Tap Plant button × 3
7. 15s: Arrange plants quickly
8. 18s: Tap Save button
9. 20s: Show toast + version badge
10. 22s: Switch to another tank
11. 25s: Show empty canvas (different tank)
12. 28s: End on "Start designing" CTA

---

**Note:** This is a visual guide for creating demo content (videos, GIFs, screenshots) for documentation or marketing.

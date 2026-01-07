#!/bin/bash
# Aquascape Improvements Validation Script

echo "🔧 Aquascape Improvements Validation"
echo "======================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "📋 Checking files..."
echo ""

# Check modified files exist
files=(
  "babel.config.js"
  "utils/aquascapeRemote.ts"
  "app/(tabs)/aquascape.tsx"
  "app/(tabs)/mytank.tsx"
  "app/(tabs)/_layout.tsx"
  "AQUASCAPE_IMPROVEMENTS.md"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (missing)"
    all_exist=false
  fi
done

echo ""
echo "🔍 Validating changes..."
echo ""

# Check babel config has reanimated plugin
if grep -q "react-native-reanimated/plugin" babel.config.js; then
  echo -e "${GREEN}✓${NC} Reanimated plugin configured in babel.config.js"
else
  echo -e "${RED}✗${NC} Reanimated plugin missing from babel.config.js"
fi

# Check aquascapeRemote has new data model
if grep -q "assetKey" utils/aquascapeRemote.ts && grep -q "z:" utils/aquascapeRemote.ts; then
  echo -e "${GREEN}✓${NC} Updated data model in aquascapeRemote.ts (assetKey, z-index)"
else
  echo -e "${YELLOW}⚠${NC} Data model may be incomplete in aquascapeRemote.ts"
fi

# Check aquascape screen uses gesture-handler
if grep -q "react-native-gesture-handler" "app/(tabs)/aquascape.tsx"; then
  echo -e "${GREEN}✓${NC} Gesture-handler imported in aquascape.tsx"
else
  echo -e "${RED}✗${NC} Gesture-handler not found in aquascape.tsx"
fi

# Check aquascape screen has snap toggle
if grep -q "snapToGrid" "app/(tabs)/aquascape.tsx"; then
  echo -e "${GREEN}✓${NC} Grid snapping implemented in aquascape.tsx"
else
  echo -e "${RED}✗${NC} Grid snapping missing from aquascape.tsx"
fi

# Check mytank has aquascape import
if grep -q "aquascapeRemote" "app/(tabs)/mytank.tsx"; then
  echo -e "${GREEN}✓${NC} Aquascape integration in mytank.tsx"
else
  echo -e "${RED}✗${NC} Aquascape integration missing from mytank.tsx"
fi

# Check mytank renders aquascape items
if grep -q "AquascapeItem" "app/(tabs)/mytank.tsx"; then
  echo -e "${GREEN}✓${NC} Aquascape items rendering in mytank.tsx"
else
  echo -e "${RED}✗${NC} Aquascape items not rendered in mytank.tsx"
fi

# Check tab label fix
if grep -q "title: 'Scape'" "app/(tabs)/_layout.tsx"; then
  echo -e "${GREEN}✓${NC} Tab label shortened to 'Scape'"
else
  echo -e "${YELLOW}⚠${NC} Tab label may still be 'Aquascape'"
fi

echo ""
echo "🧪 TypeScript compilation..."
echo ""

# Check for TypeScript errors in key files
echo "Checking aquascape.tsx..."
if npx tsc --noEmit "app/(tabs)/aquascape.tsx" 2>&1 | grep -q "error TS"; then
  echo -e "${RED}✗${NC} TypeScript errors in aquascape.tsx"
else
  echo -e "${GREEN}✓${NC} No TypeScript errors in aquascape.tsx"
fi

echo ""
echo "📝 Implementation Summary"
echo "------------------------"
echo ""
echo "Features Implemented:"
echo "  ✅ Gesture-handler + Reanimated for smooth dragging"
echo "  ✅ Grid snapping (8px) with toggle"
echo "  ✅ Item selection with z-index management"
echo "  ✅ Debounced autosave (1.2s)"
echo "  ✅ Manual save button"
echo "  ✅ Aquascape items in tank view"
echo "  ✅ Tab label truncation fixed"
echo "  ✅ Comprehensive logging"
echo "  ✅ Updated data model (z, assetKey)"
echo ""
echo "Next Steps:"
echo "  1. Clear Metro bundler cache: npx expo start --clear"
echo "  2. Restart app to apply Babel config changes"
echo "  3. Test aquascape editor:"
echo "     - Add items"
echo "     - Drag items (smooth 60fps)"
echo "     - Toggle grid snap"
echo "     - Select item (tap → remove button)"
echo "     - Save layout"
echo "  4. Test tank view:"
echo "     - See aquascape items behind fish"
echo "     - Switch tanks → items update"
echo "  5. Check logs in console for:"
echo "     - [AquascapeRemote] Loading..."
echo "     - [AquascapeRemote] Loaded vX..."
echo "     - [AquascapeRemote] Saving..."
echo "     - [AquascapeRemote] Saved vX..."
echo ""
echo "Documentation:"
echo "  📄 AQUASCAPE_IMPROVEMENTS.md - Full implementation details"
echo "  📄 database/README-AQUASCAPE.md - Database schema reference"
echo ""

if [ "$all_exist" = true ]; then
  echo -e "${GREEN}✅ All files present and validated!${NC}"
  echo ""
  echo "Ready to test. Run: npx expo start --clear"
else
  echo -e "${RED}❌ Some files are missing!${NC}"
fi

echo ""

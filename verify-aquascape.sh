#!/bin/bash
# Aquascape Feature Verification Script

echo "🐠 Aquascape MVP Verification Checklist"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if files exist
echo "📁 File Structure Check:"
echo "------------------------"

files=(
  "utils/remoteAquascapes.ts"
  "app/(tabs)/aquascape.tsx"
  "app/(tabs)/_layout.tsx"
  "database/migration-aquascapes.sql"
  "database/README-AQUASCAPE.md"
  "AQUASCAPE_IMPLEMENTATION.md"
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
echo "🗄️  Database Setup:"
echo "-------------------"
echo -e "${YELLOW}⚠${NC}  Manual step required:"
echo "   1. Open Supabase SQL Editor"
echo "   2. Run: database/migration-aquascapes.sql"
echo "   3. Verify tables created:"
echo "      - public.aquascapes"
echo "      - public.aquascape_versions"
echo "      - public.v_aquascape_latest (view)"
echo ""

echo "🧪 Testing Steps:"
echo "-----------------"
echo "1. Start Expo:"
echo "   npx expo start"
echo ""
echo "2. Open app on device/simulator"
echo ""
echo "3. Navigate to Aquascape tab (should be visible)"
echo ""
echo "4. Test workflow:"
echo "   ✓ Select a tank (or create one first)"
echo "   ✓ Tap Rock/Wood/Plant buttons"
echo "   ✓ Drag items around canvas"
echo "   ✓ Tap × button while dragging to remove"
echo "   ✓ Tap Save button"
echo "   ✓ Verify version increments (v1 → v2)"
echo "   ✓ Switch tanks and verify separate layouts"
echo "   ✓ Close and reopen app, verify layout persists"
echo ""

echo "🐛 Troubleshooting:"
echo "-------------------"
echo "If canvas is empty:"
echo "  - Check selectedTankId in app state"
echo "  - Verify tank exists in database"
echo "  - Check Supabase RLS policies"
echo ""
echo "If save fails:"
echo "  - Verify user is logged in (session?.user?.id)"
echo "  - Check Supabase console for errors"
echo "  - Verify migration ran successfully"
echo ""
echo "If items don't drag:"
echo "  - Check console for PanResponder errors"
echo "  - Ensure no other gesture handlers interfering"
echo ""

if [ "$all_exist" = true ]; then
  echo -e "${GREEN}✓ All files present!${NC}"
  echo ""
  echo "Next: Run SQL migration in Supabase, then npx expo start"
else
  echo -e "${RED}✗ Some files are missing!${NC}"
  echo "Re-run the implementation script"
fi

echo ""
echo "📚 Documentation:"
echo "-----------------"
echo "- Feature guide: database/README-AQUASCAPE.md"
echo "- Implementation: AQUASCAPE_IMPLEMENTATION.md"
echo "- SQL setup: database/migration-aquascapes.sql"
echo ""
echo "🎉 Happy aquascaping!"

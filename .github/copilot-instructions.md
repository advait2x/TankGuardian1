# AI Coding Agent Instructions

## Project Overview
This is an **Expo (React Native) aquarium management app** using TypeScript, Expo Router for navigation, Supabase for backend, and NativeWind (Tailwind CSS) for styling. The app helps users track fish tanks, water parameters, and fish species with gamification elements.

## Architecture

### Context Providers (Provider Hierarchy)
Wrap order in [app/_layout.tsx](app/_layout.tsx):
```
SafeAreaProvider → GestureHandlerRootView → AuthProvider → AppProvider → ToastProvider → MascotProvider → ThemeProvider
```

- **AuthProvider** ([store/AuthContext.tsx](store/AuthContext.tsx)): Single source of truth for Supabase auth. Exposes `{ session, user, loading, signOut }`.
- **AppProvider** ([store/AppContext.tsx](store/AppContext.tsx)): Main app state including tanks, user profile, tasks, premium status. Syncs with Supabase on auth changes.
- **MascotProvider** ([components/mascot/MascotContext.tsx](components/mascot/MascotContext.tsx)): Controls animated mascot overlay for tips/feedback.

### Navigation Structure (Expo Router)
- File-based routing in `/app` directory
- **/(tabs)**: Main tab navigation (Home, My Tank, Catalog, Community, Settings)
- **/onboarding**: New user flow (goals → create-tank → paywall)
- **/auth-otp**, **/login**, **/signup**: Authentication screens
- **/profile/[userId]**: Dynamic user profile routes

### Data Flow Pattern
1. **Auth changes** trigger `useEffect` in AppContext
2. **AppContext fetches** user profile + tanks from Supabase
3. **Local state** updated via adapters (`tanksAdapter.ts`, `waterLogsAdapter.ts`)
4. **UI components** read from context via `useApp()` hook

### Supabase Integration
- **Config**: [utils/supabase.ts](utils/supabase.ts) - Must import `'react-native-url-polyfill/auto'` FIRST
- **Auth**: Uses AsyncStorage for session persistence
- **RLS Policies**: All tables filter by `owner_id = auth.uid()` (see [database/rls-policies.sql](database/rls-policies.sql))
- **Adapters**: `tanksAdapter.ts`, `fishCatalogAdapter.ts`, `waterLogsAdapter.ts` handle CRUD + type conversions

**Critical**: Never call `supabase.from('table')` directly from components. Always use adapters to maintain type safety and handle DB↔UI model transformations.

### Data Models
Two parallel type systems:
- **UI Types** ([data/types.ts](data/types.ts)): `Tank`, `FishInstance`, `WaterLog`, etc.
- **Database Types** ([types/supabase.d.ts](types/supabase.d.ts)): Generated from Supabase schema

Adapters bridge these models. Example: `FishInstance` (UI) ↔ `tank_items` row (DB).

### Species Slug Migration
Legacy species used numeric IDs. New system uses slugs (`'neon-tetra'`). See [utils/speciesSlugMigration.ts](utils/speciesSlugMigration.ts) for migration logic. Always call `normalizeSpeciesSlug()` when handling species identifiers.

## Key Patterns

### Creating/Updating Tanks
```typescript
// From AppContext
const { createTank, updateTank, tanks } = useApp();
await createTank({ name: 'My Tank', sizeGallons: 20, ... });
await updateTank(tankId, { name: 'Updated Name' });
```
Operations are async and sync to Supabase automatically via adapters.

### Adding Fish
```typescript
// From AppContext
const { addFishInstances } = useApp();
await addFishInstances(tankId, speciesSlug, quantity);
```
This creates `tank_items` rows in Supabase with proper `owner_id`.

### UUID Validation
Local development may use mock UUIDs like `'temp-tank-1'`. Adapters check `isValidUUID()` before Supabase calls to prevent errors.

### Mascot System
Display contextual tips using:
```typescript
const { showMascot, hideMascot } = useMascot();
showMascot('happy', 'bottom-right', 'Great job!', 3000);
```
Mascot variants: `'happy' | 'checklist' | 'search' | 'guide'`

### Glass Morphism UI
Use `<GlassCard>` ([components/ui/GlassCard.tsx](components/ui/GlassCard.tsx)) for cards with frosted glass effect. Consistent with app's aquatic theme.

## Development Workflows

### Run App
```bash
npx expo start          # Development server
npx expo start --clear  # Clear cache if needed
npx expo run:ios        # iOS simulator
npx expo run:android    # Android emulator
```

### Environment Setup
Required env vars in `.env` (not in repo):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Database Migrations
Apply schema/RLS changes:
1. Edit [database/schema.sql](database/schema.sql) or [database/rls-policies.sql](database/rls-policies.sql)
2. Run SQL in Supabase SQL Editor
3. Regenerate types: `npx supabase gen types typescript --project-id xxx > types/supabase.d.ts`

### Debugging Auth Issues
Check logs for `[Auth]` and `[AppContext]` prefixes. Common issues:
- Missing env vars → `isSupabaseConfigured()` returns false
- Session not persisting → Check AsyncStorage setup
- RLS errors → User not authenticated or UUID mismatch

## Conventions

### File Organization
- **app/**: Screens (Expo Router convention)
- **components/**: Reusable UI (organized by domain: `ui/`, `tank/`, `mascot/`, `sheets/`)
- **store/**: Context providers
- **utils/**: Business logic, adapters, Supabase client
- **data/**: Type definitions, mock data

### Import Aliases
Use `@/` for absolute imports:
```typescript
import { useApp } from '@/store/AppContext';
import GlassCard from '@/components/ui/GlassCard';
```

### Styling
- **NativeWind**: Tailwind classes via `className` prop
- **StyleSheet**: For dynamic styles or animations
- **Theme Colors**: `#0D7377` (teal/primary), `#E8F4F8` (background)

### Async Operations
Always `await` context methods (`createTank`, `updateTank`, etc.). They handle Supabase sync internally.

## Social Features Status
**Community tab** ([app/(tabs)/community.tsx](app/(tabs)/community.tsx)) shows "Coming Soon" placeholder. No posts/comments/threads/likes implemented. If adding social features:
1. Create database tables with RLS
2. Add adapters in `utils/`
3. Add context provider
4. Update Community screen

## Testing
Run smoke tests in dev mode - see `__DEV__` blocks in [app/_layout.tsx](app/_layout.tsx) for catalog validation.

## References
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [NativeWind Docs](https://www.nativewind.dev/)
- Database schema: [database/README.md](database/README.md)

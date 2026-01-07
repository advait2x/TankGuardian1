# Onboarding Single Source of Truth Refactor

## Problem
Onboarding was showing repeatedly after logout → login even though `profiles.has_completed_onboarding = true` in Supabase.

**Root Cause**: Multiple sources of truth for onboarding status caused race conditions:
- AppContext had local `hasCompletedOnboarding` state that reset to `null` on logout
- Router guard read from AppContext before Supabase profile loaded
- Profile insert was overwriting `has_completed_onboarding: false` on every login

## Solution
**Single Source of Truth**: AuthContext owns all onboarding state. AppContext completely removed from onboarding logic.

## Architecture

### AuthContext (Single Source of Truth)
```typescript
// Tri-state prevents premature routing
type OnboardingStatus = 'unknown' | 'needs_onboarding' | 'complete';

const [profileLoading, setProfileLoading] = useState(false);
const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('unknown');
const [profile, setProfile] = useState<{ id: string; has_completed_onboarding: boolean } | null>(null);

// Fetch profile on login
const fetchProfile = async (userId: string) => {
  const result = await RemoteProfiles.ensureProfile(userId);
  if (result.profile) {
    setProfile(result.profile);
    const status: OnboardingStatus = result.profile.has_completed_onboarding 
      ? 'complete' 
      : 'needs_onboarding';
    setOnboardingStatus(status);
  }
};

// Reset on logout
const signOut = async () => {
  await supabase.auth.signOut();
  setProfile(null);
  setOnboardingStatus('unknown'); // NOT 'needs_onboarding'
};

// Refresh after onboarding completion
const refreshProfile = async () => {
  if (session?.user?.id) await fetchProfile(session.user.id);
};
```

### RemoteProfiles (Never Overwrites to False)
```typescript
// ensureProfile: Only inserts { id: userId }, no has_completed_onboarding override
export async function ensureProfile(userId: string) {
  const fetchResult = await getProfile(userId);
  if (fetchResult.profile) return fetchResult;
  
  // CRITICAL: Do NOT set has_completed_onboarding: false
  await supabase.from('profiles').insert({ id: userId });
  return await getProfile(userId);
}

// getProfile: Handles column name variations
export async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, has_completed_onboarding, has_completed')
    .eq('id', userId)
    .maybeSingle();
  
  // Check both column names for compatibility
  const hasCompleted = (data.has_completed_onboarding ?? data.has_completed ?? false) === true;
  return { profile: { id: data.id, has_completed_onboarding: hasCompleted } };
}

// setOnboardingComplete: Explicit update only
export async function setOnboardingComplete(userId: string) {
  await supabase.from('profiles').update({ has_completed_onboarding: true }).eq('id', userId);
}
```

### Router Guard (app/index.tsx)
```typescript
export default function Index() {
  const { session, loading: authLoading, profileLoading, onboardingStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for BOTH auth AND profile before routing
    if (authLoading || profileLoading || onboardingStatus === 'unknown') {
      console.log('[Guard] Waiting...');
      return;
    }

    if (!session?.user) {
      router.replace('/landing');
    } else if (onboardingStatus === 'needs_onboarding') {
      router.replace('/onboarding');
    } else if (onboardingStatus === 'complete') {
      router.replace('/(tabs)');
    }
  }, [authLoading, profileLoading, onboardingStatus, session?.user, router]);

  return <LoadingScreen />;
}
```

### Onboarding Completion (app/onboarding/create-tank.tsx)
```typescript
const { session, refreshProfile } = useAuth();

const handleCreate = async () => {
  // 1. Create tank
  await createTank({ ... });
  
  // 2. Mark onboarding complete in Supabase
  if (!session?.user?.id) throw new Error('No authenticated user');
  await RemoteProfiles.setOnboardingComplete(session.user.id);
  
  // 3. Refresh AuthContext profile (updates onboardingStatus)
  await refreshProfile();
  
  // 4. Navigate (router guard will verify onboardingStatus)
  router.replace('/(tabs)');
};
```

### AppContext (Onboarding Removed)
```typescript
interface AppContextType {
  // REMOVED: hasCompletedOnboarding
  // REMOVED: completeOnboarding()
  
  // Use instead:
  // - AuthContext.onboardingStatus for routing
  // - RemoteProfiles.setOnboardingComplete() + AuthContext.refreshProfile() for completion
}
```

## Data Flow

### New User Signup
1. `signup()` creates auth.users entry
2. AuthContext detects session → calls `fetchProfile(userId)`
3. `ensureProfile()` creates `profiles` row: `{ id: userId }` (no has_completed_onboarding)
4. `getProfile()` returns `{ has_completed_onboarding: false }` (database default)
5. AuthContext sets `onboardingStatus: 'needs_onboarding'`
6. Router guard routes to `/onboarding`

### Complete Onboarding
1. User creates tank or clicks skip
2. `RemoteProfiles.setOnboardingComplete(userId)` updates Supabase
3. `refreshProfile()` refetches profile
4. AuthContext sets `onboardingStatus: 'complete'`
5. `router.replace('/(tabs)')` navigates
6. Router guard verifies `onboardingStatus === 'complete'` → stays on tabs

### Logout → Login (Existing User)
1. `signOut()` clears AuthContext: `onboardingStatus: 'unknown'`
2. User logs in
3. AuthContext detects session → calls `fetchProfile(userId)`
4. `getProfile()` reads `has_completed_onboarding: true` from Supabase
5. AuthContext sets `onboardingStatus: 'complete'`
6. Router guard routes to `/(tabs)` (skips onboarding)

## Key Principles

1. **Single Source of Truth**: AuthContext is the ONLY place that tracks onboarding status for routing
2. **Tri-State Pattern**: `'unknown' | 'needs_onboarding' | 'complete'` prevents premature routing
3. **Never Overwrite to False**: `ensureProfile()` only inserts `{ id }`, never sets `has_completed_onboarding: false`
4. **Wait for Profile**: Router guard waits for `profileLoading === false && onboardingStatus !== 'unknown'`
5. **Explicit Completion**: Only `setOnboardingComplete()` can set `has_completed_onboarding: true`

## Testing Checklist

- [ ] New user signup → shows onboarding
- [ ] Complete onboarding → navigates to tabs
- [ ] Logout → login → goes directly to tabs (no onboarding replay)
- [ ] Check Supabase: `profiles.has_completed_onboarding` stays `true` after logout/login
- [ ] Console logs show: `[Profile] Loaded { has_completed_onboarding: true }` → `[Auth] onboardingStatus: complete` → `[Guard] routing to /(tabs)`

## Migration Notes

### Deprecated (AppContext)
```typescript
// OLD - DO NOT USE
const { hasCompletedOnboarding, completeOnboarding } = useApp();
```

### Current (AuthContext)
```typescript
// NEW - Single source of truth
const { onboardingStatus, profileLoading, refreshProfile } = useAuth();

// For completion
import * as RemoteProfiles from '@/utils/remoteProfiles';
await RemoteProfiles.setOnboardingComplete(session.user.id);
await refreshProfile();
```

## Files Changed

- ✅ `store/AuthContext.tsx` - Added profile management, onboardingStatus tri-state
- ✅ `utils/remoteProfiles.ts` - Fixed ensureProfile to never overwrite, added column handling
- ✅ `app/index.tsx` - Uses ONLY AuthContext for routing decisions
- ✅ `app/onboarding/create-tank.tsx` - Uses RemoteProfiles + refreshProfile
- ✅ `store/AppContext.tsx` - Removed hasCompletedOnboarding, completeOnboarding

## Logging

All operations log with prefixes:
- `[Auth]` - AuthContext operations
- `[Profile]` - Profile fetch/update
- `[Guard]` - Router guard decisions
- `[Onboarding]` - Onboarding completion flow

Example successful flow:
```
[Auth] Session user id: abc-123
[Profile] Loaded { id: abc-123, has_completed_onboarding: true }
[Auth] onboardingStatus: complete
[Guard] Render - onboardingStatus: complete
[Guard] Session + onboarding complete, routing to /(tabs)
```

# Onboarding Persistence Fix

## Problem
Onboarding was re-prompting after logout/login even when `has_completed_onboarding = TRUE` in database.

## Root Cause
**login.tsx** was making routing decisions BEFORE the profile loaded from Supabase:

```typescript
// BEFORE (BROKEN):
useEffect(() => {
  if (session && !hasNavigatedRef.current) {
    // hasCompletedOnboarding might not be loaded yet!
    if (hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding'); // ❌ Routes too early
    }
  }
}, [session, hasCompletedOnboarding, router]);
```

The issue:
1. User logs in → session established
2. `login.tsx` useEffect fires → checks `hasCompletedOnboarding`
3. BUT: Profile hasn't loaded from Supabase yet, so `hasCompletedOnboarding` is still the default value
4. Routes to `/onboarding` prematurely

## Solution
Let the root layout guard (`app/_layout.tsx`) handle routing AFTER profile loads:

```typescript
// AFTER (FIXED):
useEffect(() => {
  if (session && !hasNavigatedRef.current) {
    // Route to root and let _layout.tsx decide
    router.replace('/'); // ✅ Correct
  }
}, [session, router]);
```

## Data Flow (Fixed)

1. **Login:**
   - User enters credentials → `supabase.auth.signInWithPassword()`
   - Session established → `login.tsx` routes to `/`

2. **Root Guard:**
   - `app/_layout.tsx` detects session
   - Calls `AuthContext.refreshProfile()` → Loads profile from Supabase
   - Waits for `onboardingStatus` to resolve
   - Routes to `/onboarding` OR `/(tabs)` based on database value

3. **Result:**
   - Onboarding routing happens AFTER profile loads
   - Correct behavior: Respects `has_completed_onboarding` from database

## Verification

### SQL Query
Check onboarding status in database:
```sql
SELECT id, has_completed_onboarding 
FROM profiles 
WHERE id = auth.uid();
```

### Console Logs
Correct sequence:
```
[Login] Session detected, navigating to root guard
[Auth] Session user id: <uuid>
[Profile] Loaded with premium status: { has_completed_onboarding: true, ... }
[RootGuard] Onboarding complete, redirecting to /(tabs)
```

Wrong sequence (bug):
```
[Login] Session detected, navigating to: /onboarding  ❌ TOO EARLY
[Auth] Session user id: <uuid>
[Profile] Loaded { has_completed_onboarding: true }   ❌ AFTER routing
```

## Files Changed

1. **app/login.tsx**
   - Removed `hasCompletedOnboarding` dependency
   - Always routes to `/` after login
   - Removed premature routing logic

2. **app/_layout.tsx** (no changes needed)
   - Already has correct guard logic
   - Waits for `onboardingStatus` before routing

## Testing Steps

1. **Complete onboarding:**
   ```typescript
   await RemoteProfiles.setOnboardingComplete(userId);
   ```

2. **Verify in database:**
   ```sql
   SELECT has_completed_onboarding FROM profiles WHERE id = auth.uid();
   -- Should return TRUE
   ```

3. **Sign out and sign back in:**
   - Should go directly to `/(tabs)`
   - Should NOT show onboarding again

4. **Check console logs:**
   - Should see "Loaded with premium status: { has_completed_onboarding: true }"
   - Should see "Onboarding complete, redirecting to /(tabs)"

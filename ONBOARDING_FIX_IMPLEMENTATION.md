# Onboarding Persistence Fix - Implementation Summary

## Problem
The app had several issues with onboarding persistence:
1. **Onboarding replayed on every logout/login** - The onboarding status wasn't properly persisted to or read from Supabase
2. **Guard screen stuck on "unknown" status** - The route guard could get stuck showing "Auth: ready | Profile: ready | Status: unknown"
3. **Profile loading not robust** - Profile creation/loading didn't handle edge cases properly
4. **Mixed state sources** - Both AppContext and AuthContext tried to manage onboarding state

## Solution Overview
Implemented a **single source of truth** for onboarding in **AuthContext** backed by **Supabase `public.profiles.has_completed_onboarding`**.

## Key Changes

### 1. AuthContext (`/app/store/AuthContext.tsx`)

#### Added `setOnboardingComplete()` method
```typescript
interface AuthContextType {
  // ... existing fields
  setOnboardingComplete: () => Promise<void>;  // NEW
}
```

This method:
- Updates `has_completed_onboarding=true` in Supabase
- Updates local state immediately
- Provides a single API for marking onboarding complete

#### Improved profile loading robustness
```typescript
const fetchProfile = async (userId: string) => {
  // CRITICAL: Never leaves onboardingStatus as 'unknown' after completion
  try {
    const result = await RemoteProfiles.ensureProfile(userId);
    if (result.profile) {
      const status = result.profile.has_completed_onboarding ? 'complete' : 'needs_onboarding';
      setOnboardingStatus(status);
    } else {
      // Default to needs_onboarding on error (prevents stuck state)
      setOnboardingStatus('needs_onboarding');
    }
  } catch (err) {
    // Default to needs_onboarding on exception
    setOnboardingStatus('needs_onboarding');
  } finally {
    setProfileLoading(false);  // Always set to false
  }
};
```

Key improvements:
- **Never leaves status as 'unknown'** after loading completes
- **Defaults to 'needs_onboarding'** on errors (allows user to proceed)
- **Always sets profileLoading to false** in finally block

### 2. Route Guard (`/app/app/index.tsx`)

#### Deterministic status derivation
```typescript
const getRoutingStatus = () => {
  if (authLoading) return 'loading';
  if (!session?.user) return 'auth';
  if (profileLoading) return 'loading';
  
  // Handle 'unknown' gracefully - don't wait indefinitely
  if (onboardingStatus === 'unknown') {
    console.warn('[Guard] onboardingStatus is unknown - defaulting to needs_onboarding');
    return 'onboarding';
  }
  
  if (onboardingStatus === 'needs_onboarding') return 'onboarding';
  if (onboardingStatus === 'complete') return 'app';
  
  // Safe fallback
  return 'onboarding';
};
```

Key improvements:
- **Never waits for 'unknown' status to resolve** - makes a decision immediately
- **Deterministic routing** - always routes somewhere, never stuck
- **Clear logging** for debugging

### 3. Profile Adapter (`/app/utils/remoteProfiles.ts`)

#### Improved `ensureProfile()` with upsert
```typescript
export async function ensureProfile(userId: string) {
  // First try to fetch existing profile
  const fetchResult = await getProfile(userId);
  if (fetchResult.profile) return fetchResult;
  
  // Profile doesn't exist - use upsert for idempotency
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId },  // ONLY id - DB default handles has_completed_onboarding
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select('id, has_completed_onboarding')
    .single();
  
  // Return the created/existing profile
  return { profile: data };
}
```

Key improvements:
- **Uses upsert instead of insert** - idempotent, won't fail if profile exists
- **Only sets `id` field** - lets DB default handle `has_completed_onboarding` (false)
- **Returns data directly** from upsert - no need to refetch

### 4. Onboarding Screens (`/app/app/onboarding/create-tank.tsx`)

#### Simplified completion logic
```typescript
// OLD (manual approach)
if (!session?.user?.id) throw new Error('No authenticated user');
await RemoteProfiles.setOnboardingComplete(session.user.id);
await refreshProfile();

// NEW (single method)
await setOnboardingComplete();
```

Key improvements:
- **Single method call** handles everything
- **No need to check session** - method handles internally
- **No need to refresh** - updates local state immediately

### 5. AppContext Cleanup (`/app/store/AppContext.tsx`)

Removed all onboarding-related code:
- ❌ Removed `hasCompletedOnboarding` from state
- ❌ Removed `completeOnboarding()` method
- ❌ Removed mock login/signup onboarding logic

AppContext now focuses solely on:
- Tank management
- Task management  
- User profile (non-onboarding fields)

## Data Flow

### Login Flow
```
1. User logs in → Supabase auth
2. AuthContext.onAuthStateChange fires
3. fetchProfile(userId) called
4. ensureProfile() creates profile if needed (has_completed_onboarding=false by default)
5. onboardingStatus set to 'needs_onboarding' or 'complete'
6. Guard routes to /onboarding or /(tabs) based on status
```

### Onboarding Completion Flow
```
1. User completes onboarding (creates tank or skips)
2. setOnboardingComplete() called
3. Updates Supabase: has_completed_onboarding=true
4. Updates local state: onboardingStatus='complete'
5. Router navigates to /(tabs)
6. Guard allows access (status is 'complete')
```

### Logout → Login Flow
```
1. User logs out
2. AuthContext resets: onboardingStatus='unknown', profile=null
3. User logs back in
4. fetchProfile() loads existing profile from Supabase
5. has_completed_onboarding=true → onboardingStatus='complete'
6. Guard routes directly to /(tabs) - NO ONBOARDING REPLAY ✓
```

## Edge Case Handling

### Case 1: Profile fetch fails (network/RLS error)
- **Old behavior**: Status stuck on 'unknown', guard waits forever
- **New behavior**: Default to 'needs_onboarding', let user proceed

### Case 2: Concurrent profile creation
- **Old behavior**: Insert conflict error if another session created profile
- **New behavior**: Upsert is idempotent, returns existing profile

### Case 3: User dismisses onboarding
- **Old behavior**: Could bypass onboarding without persisting
- **New behavior**: Onboarding must explicitly call setOnboardingComplete()

### Case 4: Guard encounters 'unknown' status
- **Old behavior**: Wait indefinitely for status to change
- **New behavior**: Immediately default to 'onboarding' route

## Testing Checklist

- [ ] **New user signup**: Creates profile with `has_completed_onboarding=false`, shows onboarding
- [ ] **Complete onboarding**: Updates Supabase, routes to tabs
- [ ] **Logout → Login**: Loads `has_completed_onboarding=true`, skips onboarding
- [ ] **Network error during profile load**: Defaults to needs_onboarding, doesn't get stuck
- [ ] **Multiple concurrent logins**: Upsert handles race conditions
- [ ] **Skip onboarding**: Still marks complete in Supabase

## Files Modified

1. **`/app/store/AuthContext.tsx`**
   - Added `setOnboardingComplete()` method
   - Improved profile loading robustness
   - Never leaves status as 'unknown' after loading

2. **`/app/app/index.tsx`**
   - Deterministic status derivation
   - Handles 'unknown' gracefully
   - Clear routing logic

3. **`/app/utils/remoteProfiles.ts`**
   - Improved `ensureProfile()` with upsert
   - Better error handling
   - Clearer logging

4. **`/app/app/onboarding/create-tank.tsx`**
   - Uses `setOnboardingComplete()` from AuthContext
   - Simplified completion logic

5. **`/app/store/AppContext.tsx`**
   - Removed onboarding-related code (already cleaned up)

## Logging for Debugging

Key log patterns to look for:

```
[Profile] Loading profile for user: <uuid>
[Profile] loaded <uuid> has_completed_onboarding: true => status: complete
[Guard] status: app | userId: <uuid> | authLoading: false | profileLoading: false | onboardingStatus: complete
[Guard] Onboarding complete, routing to /(tabs)
```

On error:
```
[Profile] Failed to load, defaulting to needs_onboarding. Error: ...
[Guard] status: onboarding | userId: <uuid> | ...
```

## Architecture Principles

1. **Single Source of Truth**: AuthContext is the ONLY owner of onboarding status
2. **Supabase-backed**: Status persists to `public.profiles.has_completed_onboarding`
3. **Fail-safe defaults**: On errors, default to 'needs_onboarding' (not 'unknown')
4. **No stuck states**: Guard always makes a routing decision
5. **Idempotent operations**: Upsert for profile creation, safe to retry

## Next Steps (Optional Enhancements)

- [ ] Add retry logic for profile fetch failures
- [ ] Add telemetry/analytics for onboarding completion
- [ ] Add onboarding progress tracking (beyond boolean complete flag)
- [ ] Consider moving profile loading to a dedicated ProfileContext

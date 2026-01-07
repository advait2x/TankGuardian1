# Expo + Supabase App Cleanup Summary

## ✅ Issues Fixed

### A) Profile Column Usage
- **Fixed**: All queries now use `has_completed_onboarding` (correct column)
- **Removed**: All references to `has_completed` (non-existent column)
- **Files Updated**:
  - `utils/remoteProfiles.ts`: `select('id, has_completed_onboarding')` only
  - All profile queries standardized to correct column name

### B) Noisy Fallback Behavior
- **Fixed**: Profile load failures now set `onboardingStatus = 'unknown_error'`
- **Removed**: Default to 'needs_onboarding' on errors (caused onboarding loops)
- **Route Guard**: Routes `unknown_error` to /(tabs) in stabilization mode
- **Single Error Log**: Only one console.error when profile load fails

### C) Double-Fetching Prevention
- **Added**: `loadedUserId` state to track already-loaded profiles
- **Skip Logic**: `if (profileLoading || loadedUserId === userId) return;`
- **SIGNED_IN Only**: Profile fetch only on SIGNED_IN event, not TOKEN_REFRESHED
- **SIGNED_OUT**: Resets all state including `loadedUserId` exactly once

### D) Onboarding Navigation Cleanup
- **Added**: `hasMarkedCompleteRef` in create-tank screen
- **Protection**: Prevents duplicate `setOnboardingComplete()` calls
- **Removed**: All "navigating to /onboarding" spam logs
- **Navigation**: Based purely on `profile.has_completed_onboarding`

### E) Concise Debug Logs
- **Kept Only**:
  - `[Auth] state changed: SIGNED_IN/SIGNED_OUT + userId (first 8 chars)`
  - `[Profile] loaded + has_completed_onboarding value`
  - `[Guard] status + onboarding status`
- **Removed**:
  - "Ensuring profile exists" (duplicate)
  - "Profile already exists" (noisy)
  - "Fetching profile for user" (redundant)
  - "Setting onboarding complete for user" (verbose)
  - All render-spam logs

## Files Modified

### 1. `/app/utils/remoteProfiles.ts`
- Fixed `getProfile()`: Uses only `has_completed_onboarding`
- Fixed `ensureProfile()`: Removed `has_completed` fallback
- Reduced logs: Removed duplicate "Fetching", "Ensuring" messages
- Simplified: Direct boolean conversion, no complex fallback logic

### 2. `/app/store/AuthContext.tsx`
- Added `loadedUserId` state for double-fetch prevention
- Added `'unknown_error'` to OnboardingStatus type
- Updated `fetchProfile()`: Skip if already loading or loaded
- Fixed auth state listener: Only fetch on SIGNED_IN event
- Reduced logs: Shortened user IDs to 8 chars, removed verbose messages

### 3. `/app/app/index.tsx` (Route Guard)
- Added `unknown_error` handling: Routes to app with warning
- Reduced logs: Single line per status change
- Removed: Per-render debug spam

### 4. `/app/app/onboarding/create-tank.tsx`
- Added `hasMarkedCompleteRef` to prevent duplicate completion
- Protected both `handleCreate` and `handleSkip` with ref check
- Removed: Verbose console logs

## Verification Checklist

✅ **No references to `profiles.has_completed`** (non-existent column)
- Verified with grep search: 0 matches

✅ **Profile fetch uses `has_completed_onboarding`** only
- `remoteProfiles.ts`: All queries use correct column
- No fallback to wrong column name

✅ **App no longer routes to onboarding on every login**
- `loadedUserId` prevents profile re-fetch
- `unknown_error` state routes to app (not onboarding loop)

✅ **Logs are reduced and readable**
- Essential logs only: Auth state, Profile loaded, Guard status
- User IDs shortened to 8 chars
- No render-spam or duplicate messages

✅ **Onboarding completion called only once**
- `hasMarkedCompleteRef` prevents duplicates
- Both create and skip paths protected

✅ **Profile loading is idempotent**
- Skip if `profileLoading === true`
- Skip if `loadedUserId === userId`
- Fetch only on SIGNED_IN event

## Test Scenarios

### Scenario 1: New User Login
**Expected**:
```
[Auth] state changed: SIGNED_IN abcd1234
[Profile] loaded abcd1234 has_completed_onboarding: false
[Guard] onboarding | onboarding: needs_onboarding
```

### Scenario 2: Returning User Login
**Expected**:
```
[Auth] state changed: SIGNED_IN abcd1234
[Profile] loaded abcd1234 has_completed_onboarding: true
[Guard] app | onboarding: complete
```

### Scenario 3: Profile Load Failure
**Expected**:
```
[Auth] state changed: SIGNED_IN abcd1234
[Profile] Failed to load profile - schema or RLS issue. App will route to tabs with onboarding disabled.
[Guard] app | onboarding: unknown_error
[Guard] Profile load failed - routing to app in stabilization mode
```

### Scenario 4: Token Refresh
**Expected**:
- No profile re-fetch
- No logs (already loaded)

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│ Supabase: profiles.has_completed_onboarding (bool) │ ← SINGLE SOURCE OF TRUTH
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ AuthContext: onboardingStatus                       │
│ - 'unknown', 'needs_onboarding', 'complete'         │
│ - 'unknown_error' (new for stabilization)           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Route Guard: Deterministic routing                  │
│ - unknown_error → app (with warning)                │
│ - needs_onboarding → /onboarding                    │
│ - complete → /(tabs)                                │
└─────────────────────────────────────────────────────┘
```

## Key Improvements

1. **Correctness**: Uses actual DB column (`has_completed_onboarding`)
2. **Stability**: No more onboarding loops on profile errors
3. **Performance**: No duplicate profile fetches
4. **Debuggability**: Clean, concise logs
5. **Idempotency**: Protected onboarding completion with ref

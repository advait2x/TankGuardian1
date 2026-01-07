# Onboarding Persistence Setup

## Overview
This implements persistent onboarding completion tracking using Supabase profiles table.

## Changes Made

### 1. Database Migration
**File:** `database/migration-profiles-onboarding.sql`

Creates/updates the `profiles` table with:
- `has_completed_onboarding` boolean field (default: false)
- RLS policies for user access
- Proper indexes and triggers

### 2. AppContext Updates
**File:** `store/AppContext.tsx`

- ✅ Loads `has_completed_onboarding` from profiles when user authenticates
- ✅ `completeOnboarding()` now saves to Supabase using upsert
- ✅ Handles profile creation automatically if it doesn't exist
- ✅ Added console logs for debugging onboarding status

### 3. Onboarding Flow
**File:** `app/onboarding/create-tank.tsx`

- ✅ Now awaits `completeOnboarding()` to ensure data is saved before navigation
- ✅ Works for both "Create Tank" and "Skip" flows

### 4. Routing Logic
**File:** `app/index.tsx`

- ✅ Already uses `hasCompletedOnboarding` to route users correctly

## Setup Instructions

### Step 1: Run SQL Migration

Go to your Supabase project dashboard:

1. Navigate to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `database/migration-profiles-onboarding.sql`
4. Click **Run** or press `Ctrl+Enter`

### Step 2: Verify Tables

Run this query to verify the profiles table exists:

```sql
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public';
```

### Step 3: Test the Flow

1. **Start the app:**
   ```bash
   npx expo start -c
   ```

2. **Test new user onboarding:**
   - Sign up with a new account
   - Complete onboarding
   - Check console logs for: `[AppContext] Onboarding completed and saved to profiles`

3. **Test persistence:**
   - Kill and restart the app
   - Login with the same account
   - You should see: `[AppContext] Onboarding status: true`
   - You should be routed directly to `/(tabs)` instead of `/onboarding`

4. **Verify in Supabase:**
   ```sql
   SELECT id, has_completed_onboarding, created_at 
   FROM public.profiles 
   WHERE id = '<your-user-id>';
   ```

## Console Logs to Watch

When everything is working, you should see:

```
[Auth] session restored: <uuid>
[AppContext] Authenticated user: <uuid>
[AppContext] Onboarding status: false  (for new users)
[AppContext] Onboarding status: true   (for returning users)
[AppContext] Onboarding completed and saved to profiles  (when completing onboarding)
```

## Expected Behavior

### New Users
1. Sign up → Create profile with `has_completed_onboarding: false`
2. Complete onboarding → Update profile to `has_completed_onboarding: true`
3. Restart app → Load `has_completed_onboarding: true` → Route to tabs

### Returning Users
1. Login → Load existing profile
2. If `has_completed_onboarding: true` → Route to tabs
3. If `has_completed_onboarding: false` → Route to onboarding

## Troubleshooting

### Profile not created on signup
- Check RLS policies are enabled
- Verify user has INSERT permission on profiles table
- The upsert will create it on first onboarding completion

### Onboarding shows every time
- Check console logs for any error messages
- Verify the SQL migration ran successfully
- Query profiles table directly to check data

### RLS Policy Issues
If you get "permission denied" errors:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If needed, drop and recreate policies from migration file
```

## Files Modified
- ✅ `database/migration-profiles-onboarding.sql` (new)
- ✅ `store/AppContext.tsx`
- ✅ `app/onboarding/create-tank.tsx`
- ✅ `store/AuthContext.tsx` (already done in previous step)

## Next Steps
After verifying onboarding persistence works:
- Tank data is already persisting (from previous implementation)
- Water logs should follow similar patterns
- Consider adding more profile fields (premium status, etc.)

# Premium Status Migration

## Overview
Adds premium subscription tracking to the profiles table to persist premium status across app restarts.

## Database Changes

### New Columns in `profiles` table:
- `is_premium`: BOOLEAN (default: false) - Current premium status
- `has_used_free_trial`: BOOLEAN (default: false) - Whether user has used their free trial
- `premium_expires_at`: TIMESTAMPTZ (nullable) - When premium subscription expires

## Migration Steps

1. **Run the migration SQL:**
   ```bash
   # In Supabase SQL Editor, run:
   database/migration-premium-status.sql
   ```

2. **Verify migration:**
   ```sql
   SELECT id, is_premium, has_used_free_trial, premium_expires_at 
   FROM public.profiles 
   WHERE id = auth.uid();
   ```

## Code Changes

### Updated Files:
1. **utils/remoteProfiles.ts**
   - Added `ProfileData` interface with premium fields
   - Added `setPremiumStatus(isPremium, expiresAt?)` function
   - Added `markFreeTrialUsed()` function
   - Updated `getMyProfile()` to fetch premium fields

2. **store/AuthContext.tsx**
   - Updated profile type to use `ProfileData`
   - Includes premium fields in profile state

3. **store/AppContext.tsx**
   - Load premium status from Supabase on login
   - `setPremium()` now persists to database via `setPremiumStatus()`
   - `useFreeTrial()` now persists to database via `markFreeTrialUsed()`

4. **app/login.tsx**
   - Fixed routing to go to root guard instead of making premature onboarding decisions
   - Lets `_layout.tsx` handle routing after profile loads

## Usage

### Setting Premium Status
```typescript
import { setPremiumStatus } from '@/utils/remoteProfiles';

// Grant premium
await setPremiumStatus(true);

// Grant premium with expiration
await setPremiumStatus(true, '2026-12-31T23:59:59Z');

// Revoke premium
await setPremiumStatus(false);
```

### In AppContext
```typescript
const { setPremium, useFreeTrial, isPremium, hasUsedFreeTrial } = useApp();

// Set premium (persists to Supabase)
await setPremium(true);

// Mark free trial used (persists to Supabase)
await useFreeTrial();
```

## Data Flow

1. **Login:**
   - User signs in → AuthContext gets session
   - AppContext calls `getMyProfile()` → fetches premium fields
   - `isPremium` state updated from database

2. **Premium Actions:**
   - UI calls `setPremium(true)` → Updates local state + calls `setPremiumStatus()` → Persists to Supabase
   - UI calls `useFreeTrial()` → Updates local state + calls `markFreeTrialUsed()` → Persists to Supabase

3. **App Restart:**
   - User reopens app → Profile loads with `is_premium` from database
   - Premium status restored, no re-prompt

## Troubleshooting

### Premium status not persisting
- Check Supabase logs for RLS errors
- Verify user is authenticated when calling premium functions
- Check that migration ran successfully

### Query to check user's premium status
```sql
SELECT 
  id,
  is_premium,
  has_used_free_trial,
  premium_expires_at,
  has_completed_onboarding
FROM profiles 
WHERE id = auth.uid();
```

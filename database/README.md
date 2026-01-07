# Supabase Auth & RLS Setup for Tanks

This document outlines the changes made to implement proper Supabase authentication and Row Level Security (RLS) for tanks and tank_items tables.

## 🎯 Overview

All tank operations now use Supabase Auth to ensure users can only access their own data. RLS policies enforce data isolation at the database level.

## 📋 Database Setup

### 1. Apply Schema (First Time Only)

Run the schema file to create tables:

```sql
-- In Supabase SQL Editor
\i database/schema.sql
```

Or copy/paste the contents of `database/schema.sql` into the Supabase SQL Editor.

### 2. Apply RLS Policies

Run the RLS policies file:

```sql
-- In Supabase SQL Editor
\i database/rls-policies.sql
```

Or copy/paste the contents of `database/rls-policies.sql` into the Supabase SQL Editor.

## 🔒 RLS Policies Summary

### Tanks Table
- **SELECT**: Users can only see tanks where `owner_id = auth.uid()`
- **INSERT**: Users can only create tanks with `owner_id = auth.uid()`
- **UPDATE**: Users can only update their own tanks
- **DELETE**: Users can only delete their own tanks

### Tank Items Table
- **SELECT**: Users can only see items for tanks they own (via JOIN)
- **INSERT**: Users can only add items to tanks they own (via JOIN)
- **UPDATE**: Users can only update items in tanks they own (via JOIN)
- **DELETE**: Users can only delete items from tanks they own (via JOIN)

### Water Logs Table
- **SELECT**: Users can see logs for their own tanks
- **INSERT**: Users can create logs for their own tanks
- **UPDATE**: Users can update their own logs
- **DELETE**: Users can delete their own logs

## 🔧 Code Changes

### New Files Created

1. **`/app/database/schema.sql`**: Database table definitions
2. **`/app/database/rls-policies.sql`**: RLS policy definitions
3. **`/app/utils/remoteTanks.ts`**: Low-level Supabase operations for tanks/items
4. **`/app/utils/tanksAdapter.ts`**: High-level adapter for tank operations

### Modified Files

1. **`/app/store/AppContext.tsx`**:
   - Integrated with `useAuth()` hook to get authenticated user
   - Added effect to load tanks from Supabase on auth
   - Updated `createTank()` to save to Supabase with `owner_id`
   - Updated `updateTank()` to sync with Supabase
   - Updated `deleteTank()` to sync with Supabase
   - Updated `addFishInstances()` to sync with Supabase
   - Updated `removeFishFromTank()` to sync with Supabase

2. **`/app/app/onboarding/create-tank.tsx`**:
   - Updated `createTank()` call to be async

## 🔍 Query Examples

### All Queries Use RLS Automatically

```typescript
// ✅ Correct: RLS filters by auth.uid() automatically
const { data } = await supabase
  .from('tanks')
  .select('*');

// ✅ Correct: RLS ensures owner_id matches auth.uid()
const { data } = await supabase
  .from('tanks')
  .insert({
    owner_id: session.user.id,
    name: 'My Tank',
    tank_type: 'rectangle',
    size_gallons: 40,
    water_type: 'freshwater',
  });

// ✅ Correct: RLS checks tank ownership via JOIN
const { data } = await supabase
  .from('tank_items')
  .select('*')
  .eq('tank_id', tankId);

// ❌ Wrong: Don't try to filter by owner_id manually
// RLS handles this automatically
const { data } = await supabase
  .from('tanks')
  .select('*')
  .eq('owner_id', userId); // Redundant, RLS already filters
```

## 🚨 Security Guarantees

1. **Authentication Required**: All queries require a valid Supabase Auth session
2. **Data Isolation**: Users can never see or modify other users' data
3. **Server-Side Enforcement**: RLS policies are enforced at the database level
4. **Foreign Key Cascade**: Deleting a tank automatically deletes all related items and logs

## ⚠️ Important Notes

### Owner ID Must Be Session User ID

Every insert into `tanks` MUST include:

```typescript
owner_id: session.user.id  // ✅ Correct
owner_id: currentUser.id   // ❌ Wrong - might not match session
```

### Tank Items Ownership

Tank items don't store `owner_id` directly. Instead, RLS uses a JOIN to verify the tank belongs to the user:

```sql
EXISTS (
  SELECT 1 FROM public.tanks
  WHERE tanks.id = tank_items.tank_id
  AND tanks.owner_id = auth.uid()
)
```

### Offline Support

The app gracefully degrades to local-only mode when:
- Supabase is not configured (`USE_REMOTE_CATALOG = false`)
- Network is unavailable
- RLS policy denies access (shouldn't happen with correct implementation)

## 🧪 Testing

### Test RLS Policies

```sql
-- 1. Create test users (in Supabase Auth dashboard or via API)

-- 2. Insert test data as User A
SET request.jwt.claim.sub = 'user-a-uuid';
INSERT INTO tanks (owner_id, name, tank_type, size_gallons, water_type)
VALUES ('user-a-uuid', 'User A Tank', 'rectangle', 40, 'freshwater');

-- 3. Try to query as User B
SET request.jwt.claim.sub = 'user-b-uuid';
SELECT * FROM tanks; -- Should NOT return User A's tank

-- 4. Try to insert with wrong owner_id
INSERT INTO tanks (owner_id, name, tank_type, size_gallons, water_type)
VALUES ('user-a-uuid', 'Fake Tank', 'cube', 20, 'saltwater');
-- Should FAIL with RLS error
```

### Test Client Code

```typescript
// 1. Login as User A
await signInWithPassword({ email: 'userA@test.com', password: 'test' });

// 2. Create a tank
await createTank({ name: 'Test Tank', ... });

// 3. Verify tank is saved
const result = await fetchUserTanks(userA.id);
console.log(result.tanks); // Should include 'Test Tank'

// 4. Logout and login as User B
await signOut();
await signInWithPassword({ email: 'userB@test.com', password: 'test' });

// 5. Fetch tanks
const result2 = await fetchUserTanks(userB.id);
console.log(result2.tanks); // Should NOT include User A's tank
```

## 🐛 Troubleshooting

### "Showing tanks I don't even have"

This means RLS policies are not working. Check:

1. ✅ RLS is enabled: `ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;`
2. ✅ Policies exist: Run verification query from `rls-policies.sql`
3. ✅ User is authenticated: Check `session.user.id` is not null
4. ✅ Owner ID matches: Verify `owner_id` in insert matches `session.user.id`

### "Permission denied" errors

This means RLS is blocking a legitimate operation. Check:

1. ✅ User is authenticated (session exists)
2. ✅ `owner_id` in INSERT matches `session.user.id`
3. ✅ Tank belongs to user (for tank_items operations)

### "Invalid UUID" errors

This means you're passing a non-UUID value. Check:

1. ✅ Use `session.user.id` (UUID) not `currentUser.id` (might be mock)
2. ✅ Tank IDs from Supabase are UUIDs
3. ✅ Don't use local mock IDs (like 'tank-1')

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

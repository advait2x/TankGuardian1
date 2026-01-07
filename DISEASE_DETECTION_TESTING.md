# Disease Detection Testing Guide

Complete testing checklist for the disease detection feature.

## Prerequisites

- [ ] Supabase project set up
- [ ] Database tables created (disease_checks)
- [ ] Storage bucket created (disease-images)
- [ ] Edge function deployed (disease-scan)
- [ ] Expo app with valid SUPABASE_URL and SUPABASE_ANON_KEY in .env
- [ ] User authenticated in app

## Database Setup Verification

### 1. Check disease_checks Table

Run in Supabase SQL Editor:

```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'disease_checks';
```

Expected: 1 row returned

### 2. Check RLS Policies

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'disease_checks';
```

Expected: 3 policies (SELECT, INSERT, UPDATE)

### 3. Check Indexes

```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'disease_checks';
```

Expected: At least 2 indexes (owner_id, created_at)

### 4. Check Storage Bucket

Go to: Supabase Dashboard > Storage

Expected: Bucket named `disease-images` exists (private)

### 5. Check Storage Policies

```sql
SELECT * FROM storage.policies 
WHERE bucket_id = 'disease-images';
```

Expected: At least 2 policies (upload own, read own)

## Edge Function Verification

### 1. Check Deployment

Go to: Supabase Dashboard > Edge Functions

Expected: `disease-scan` function listed

### 2. Check Environment Variables

```bash
supabase secrets list
```

Expected (optional):
- `AI_API_KEY` (if using real AI)
- `AI_BASE_URL` (if custom endpoint)

### 3. Test Edge Function Locally

```bash
# Start local functions
supabase functions serve disease-scan

# In another terminal, test with curl
curl -X POST http://localhost:54321/functions/v1/disease-scan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "diseaseCheckId": "test-uuid",
    "imagePath": "test-user/test-image.jpg"
  }'
```

Expected: Error (test UUID won't exist) but function should respond, not crash

### 4. Check Function Logs

Go to: Supabase Dashboard > Edge Functions > disease-scan > Logs

Expected: No unexpected errors (404s are ok for test calls)

## App Testing

### A. Stub Mode (No AI_API_KEY)

This tests the full flow with mock responses.

#### 1. Open App
- [ ] Launch Expo app: `npx expo start`
- [ ] Navigate to "My Tank" tab
- [ ] Select a tank (or create one if needed)

#### 2. Scan Button Visible
- [ ] "Scan for Diseases" button visible in Disease Detection card
- [ ] Button has camera icon
- [ ] "History" button visible (if logged in)

#### 3. Take Photo
- [ ] Tap "Scan for Diseases"
- [ ] Camera permission requested (first time)
- [ ] Camera opens
- [ ] Take a photo
- [ ] Photo captured successfully

#### 4. Progress UI
- [ ] Modal opens showing progress
- [ ] "Uploading..." stage shown first
- [ ] Spinner/loading indicator visible
- [ ] Stage changes to "Analyzing..."
- [ ] Stage changes to "Complete"

#### 5. Results Display
- [ ] Result modal shows disease name
- [ ] Confidence percentage displayed
- [ ] Symptoms list shown
- [ ] Treatment steps listed
- [ ] Advice text visible
- [ ] Severity indicator shown

#### 6. Database Check
Run in Supabase SQL Editor:

```sql
SELECT * FROM disease_checks 
ORDER BY created_at DESC 
LIMIT 1;
```

Expected:
- [ ] Row exists
- [ ] owner_id matches your user
- [ ] tank_id matches selected tank (or null)
- [ ] image_path format: `{user_id}/{uuid}.jpg`
- [ ] result.status = 'complete'
- [ ] result.likelyIssue exists
- [ ] result.confidence exists
- [ ] result.model = 'stub-v1'

#### 7. Storage Check
Go to: Supabase Dashboard > Storage > disease-images

Expected:
- [ ] Folder with your user ID exists
- [ ] Image file exists in that folder
- [ ] Image is viewable (JPEG)
- [ ] Image matches what you captured

#### 8. History View
- [ ] Tap "History" button
- [ ] Modal opens
- [ ] Latest check visible in list
- [ ] Shows disease name
- [ ] Shows confidence
- [ ] Shows date/time
- [ ] Shows severity
- [ ] Shows advice preview

#### 9. Multiple Scans
- [ ] Take 2-3 more photos
- [ ] Each completes successfully
- [ ] History shows all scans
- [ ] Ordered by newest first
- [ ] Each has unique ID

### B. Real AI Mode (With AI_API_KEY)

#### 1. Set API Key

```bash
supabase secrets set AI_API_KEY=sk-proj-your-openai-key
```

#### 2. Take Photo of Fish
- [ ] Use a real fish image (or test photo)
- [ ] Upload completes
- [ ] Analyzing stage takes 5-15 seconds
- [ ] Results returned

#### 3. Verify AI Response
- [ ] result.model = 'gpt-4o' (or your model)
- [ ] result.likelyIssue is specific (not generic stub)
- [ ] result.confidence is between 0 and 1
- [ ] Advice is relevant to detected issue

#### 4. Check Edge Function Logs
- [ ] No errors in logs
- [ ] See "Processing check..." log
- [ ] See "Image downloaded, calling AI API..." log
- [ ] See "AI analysis complete..." log

## Error Testing

### 1. No Camera Permission
- [ ] Deny camera permission
- [ ] Error message shown
- [ ] App doesn't crash

### 2. Offline Mode
- [ ] Turn off network
- [ ] Try to scan
- [ ] Upload fails gracefully
- [ ] Error message shown

### 3. Invalid Tank ID
Edit code temporarily to pass invalid tank ID:
- [ ] Scan completes (tank_id optional)
- [ ] Record created with null tank_id

### 4. Edge Function Error
Temporarily remove AI_API_KEY and break edge function:
- [ ] Error caught
- [ ] DB record updated with error status
- [ ] User sees error message

### 5. Unauthorized Access
Try to fetch someone else's check (requires manual DB manipulation):
```sql
-- Try to read another user's check (should fail)
SELECT * FROM disease_checks WHERE owner_id != auth.uid();
```
- [ ] Returns empty (RLS blocks)

### 6. Large Image
- [ ] Upload very large image (>10MB)
- [ ] Either succeeds or shows clear error
- [ ] App doesn't crash

## Performance Testing

### 1. Upload Speed
- [ ] Small image (<1MB): ~1-3 seconds
- [ ] Large image (3-5MB): ~3-8 seconds

### 2. AI Analysis Speed
- [ ] Stub mode: ~0-1 seconds
- [ ] Real AI: ~5-15 seconds

### 3. Total Flow Time
- [ ] Stub mode: ~3-10 seconds
- [ ] Real AI: ~10-25 seconds

### 4. History Load Time
- [ ] With 1 check: <1 second
- [ ] With 20 checks: <2 seconds

## Security Testing

### 1. RLS Isolation
Create two test accounts and verify:
- [ ] User A cannot see User B's checks
- [ ] User A cannot update User B's checks
- [ ] User A cannot access User B's images

### 2. Storage Isolation
- [ ] User A cannot read User B's folder in disease-images
- [ ] User A cannot upload to User B's folder

### 3. Edge Function Auth
Call edge function without auth header:
```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/disease-scan \
  -H "Content-Type: application/json" \
  -d '{"diseaseCheckId":"test"}'
```
- [ ] Returns 401 or auth error

### 4. Service Role Key
- [ ] Service role key NOT in app code
- [ ] Service role key only in edge function env
- [ ] Anon key used in app

## Integration Testing

### 1. Tank Switching
- [ ] Create checks for Tank A
- [ ] Switch to Tank B
- [ ] Create checks for Tank B
- [ ] History filters correctly

### 2. Premium Features (if applicable)
- [ ] Free users see check counter
- [ ] Premium users bypass limits
- [ ] Paywall shown when limit reached

### 3. Mascot Integration
- [ ] Mascot appears with tips (if configured)
- [ ] Mascot timing is appropriate

## Edge Cases

### 1. No Tank Selected
- [ ] Can still scan
- [ ] Record created with null tank_id
- [ ] History shows all tanks

### 2. Deleted Tank
- [ ] Scan with tank ID
- [ ] Delete tank
- [ ] History still shows check
- [ ] tank_id preserved (ON DELETE SET NULL)

### 3. Quick Repeated Scans
- [ ] Take 3 photos quickly
- [ ] All upload successfully
- [ ] No race conditions
- [ ] All appear in history

### 4. Background App
- [ ] Start scan
- [ ] Put app in background
- [ ] Return to app
- [ ] Scan completes or errors gracefully

## Browser Testing (Expo Web)

If testing on web:
- [ ] Camera picker works (or file picker)
- [ ] Upload works
- [ ] Results display correctly
- [ ] History loads

## Cleanup

After testing:

```sql
-- Delete test checks
DELETE FROM disease_checks WHERE owner_id = 'YOUR_USER_ID';
```

In Supabase Storage:
- Delete test images from disease-images bucket

## Success Criteria

✅ All core flows work without errors
✅ Database records created correctly
✅ Images uploaded to storage
✅ Edge function processes requests
✅ Results displayed in UI
✅ History shows past checks
✅ RLS prevents data leaks
✅ Error states handled gracefully

## Known Limitations

- Analysis time varies by model/network
- Large images may timeout
- AI accuracy depends on image quality
- Not a replacement for veterinary advice

## Troubleshooting

### "TypeError: Cannot read property 'readAsStringAsync' of undefined"
**Cause**: expo-file-system not installed

**Fix**: 
```bash
npm install expo-file-system
npx expo prebuild --clean
```

### "Edge function not found"
**Cause**: Function not deployed or wrong project

**Fix**:
```bash
supabase functions deploy disease-scan
```

### "Unauthorized" error
**Cause**: User not logged in or session expired

**Fix**: Log out and log back in

### Images not appearing in storage
**Cause**: Storage policies not set up

**Fix**: Run storage RLS policies from schema.sql

### AI returns stub data with API key set
**Cause**: API key invalid or API error

**Fix**: Check edge function logs for API errors

## Next Steps

After successful testing:
1. Monitor edge function logs for errors
2. Track API costs (if using real AI)
3. Gather user feedback
4. Consider adding:
   - Image compression
   - Retry logic
   - Push notifications
   - Export reports


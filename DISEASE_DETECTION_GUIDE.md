# Disease Detection Implementation Guide

This guide covers the complete end-to-end disease detection feature implementation using Supabase Edge Functions and real AI models.

## Architecture Overview

```
User Action → Photo Picker → Upload to Storage → Create DB Record 
    ↓
Edge Function Invocation → Download Image → AI Analysis → Update DB
    ↓
App Polls/Refreshes → Display Results → Save to History
```

## Components

### 1. App-Side Code (Expo)

#### `utils/diseaseDetection.ts`
Main orchestration file:
- `uploadImageToStorage()`: Uploads JPEG to `disease-images/{userId}/{uuid}.jpg`
- `callDiseaseDetectionEdgeFunction()`: Invokes `disease-scan` edge function
- `runDiseaseDetection()`: Main entry point with progress callbacks

#### `utils/remoteDiseaseChecks.ts`
Database operations:
- `createDiseaseCheckPlaceholder()`: Creates row with `status: 'processing'`
- `updateDiseaseCheckResult()`: Updates result JSONB column
- `fetchDiseaseCheckHistory()`: Gets last 20 checks for user/tank

#### UI Components
- **Button**: "Scan for Diseases" in [app/(tabs)/mytank.tsx](../app/(tabs)/mytank.tsx)
- **Progress Modal**: Shows uploading → analyzing → complete stages
- **History Modal**: Lists past checks with results
- **Result Display**: Shows likely issue, confidence, advice, treatment steps

### 2. Edge Function

#### `supabase/functions/disease-scan/index.ts`
Supabase Deno edge function:
1. Validates auth token
2. Verifies ownership of `diseaseCheckId`
3. Downloads image from storage (service role)
4. Calls AI vision API (OpenAI GPT-4o or compatible)
5. Parses structured JSON response
6. Updates `disease_checks.result` column
7. Returns result to client

**Security**:
- Uses service role key only on server
- Verifies `owner_id` matches caller
- RLS policies enforce data isolation

### 3. Database Schema

```sql
CREATE TABLE public.disease_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES public.tanks(id) ON DELETE SET NULL,
  image_path TEXT NOT NULL,
  result JSONB DEFAULT '{"status": "processing"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX disease_checks_owner_id_idx ON disease_checks(owner_id);
CREATE INDEX disease_checks_created_at_idx ON disease_checks(created_at DESC);

-- RLS Policies
CREATE POLICY "Users can read own checks"
  ON disease_checks FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own checks"
  ON disease_checks FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own checks"
  ON disease_checks FOR UPDATE
  USING (auth.uid() = owner_id);
```

### 4. Storage Bucket

```sql
-- Create bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('disease-images', 'disease-images', false);

-- RLS Policies for storage
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'disease-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'disease-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## AI Model Integration

### OpenAI GPT-4o (Default)

The edge function uses OpenAI's GPT-4o vision model by default:

```typescript
// In edge function
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert aquarium veterinarian...'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this fish image...' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
        ]
      }
    ]
  })
});
```

### Response Format

The AI model must return JSON in this structure:

```json
{
  "likelyIssue": "Ich (White Spot Disease)",
  "confidence": 0.87,
  "advice": "Start treatment immediately with raised temperature and medication",
  "symptoms": ["White spots on body", "Flashing behavior", "Clamped fins"],
  "treatment": [
    "Raise temperature to 82-86°F gradually",
    "Add aquarium salt (1 tablespoon per 5 gallons)",
    "Use ich medication as directed"
  ],
  "severity": "Moderate"
}
```

### Alternative AI Providers

#### Azure OpenAI
Set `AI_BASE_URL` to your Azure endpoint:
```bash
supabase secrets set AI_BASE_URL=https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT
supabase secrets set AI_API_KEY=your-azure-key
```

#### OpenRouter (Multi-model proxy)
```bash
supabase secrets set AI_BASE_URL=https://openrouter.ai/api/v1
supabase secrets set AI_API_KEY=your-openrouter-key
```

#### Anthropic Claude (with adapter)
Requires modifying the edge function to use Anthropic's API format.

### Stub Mode

If `AI_API_KEY` is not set, the edge function returns realistic mock data:
- 3 random responses (Ich, Fin Rot, Healthy Fish)
- Proper JSON structure
- DB record still updated correctly

This allows testing the full flow without API costs.

## Deployment

### 1. Database Setup

Run these SQL commands in Supabase SQL Editor:

```sql
-- See database/schema.sql or database/migration-disease-checks.sql
-- Create disease_checks table with indexes and RLS policies
```

### 2. Storage Setup

```bash
# Create bucket via Supabase Dashboard > Storage > Create bucket
# Name: disease-images
# Public: false

# Or via SQL (already in schema)
```

### 3. Deploy Edge Function

```bash
cd /app
supabase functions deploy disease-scan
```

### 4. Set Environment Variables

```bash
# Required (auto-provided by Supabase)
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# SUPABASE_ANON_KEY

# Optional (for real AI)
supabase secrets set AI_API_KEY=sk-proj-your-openai-key
# supabase secrets set AI_BASE_URL=https://api.openai.com/v1  # default
```

### 5. Test Edge Function

```bash
# Local testing
supabase functions serve disease-scan --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/disease-scan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "diseaseCheckId": "existing-uuid",
    "imagePath": "user-id/image.jpg",
    "tankId": "tank-uuid"
  }'
```

### 6. App Configuration

Ensure `.env` has:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

No changes needed to app code - it automatically calls the deployed edge function.

## Usage Flow

### User Perspective

1. **Open My Tank tab**
2. **Tap "Scan for Diseases" button**
3. **Take photo or select from library**
4. **Wait for analysis** (progress shown):
   - Uploading... (image upload to storage)
   - Analyzing... (AI processing)
   - Complete (results displayed)
5. **View results**:
   - Likely issue (disease name or "Healthy Fish")
   - Confidence percentage
   - Symptoms detected
   - Treatment recommendations
   - Advice text
6. **View history**:
   - Tap "History" button
   - See last 20 checks for selected tank (or all tanks)

### Developer Flow

1. **Image Upload**:
   ```typescript
   const { path } = await uploadImageToStorage({ localUri, userId });
   // Uploads to: disease-images/{userId}/{uuid}.jpg
   ```

2. **Create DB Record**:
   ```typescript
   const { id } = await createDiseaseCheckPlaceholder({
     ownerId: userId,
     tankId,
     imagePath: path
   });
   // Creates row with result: {status: 'processing'}
   ```

3. **Invoke Edge Function**:
   ```typescript
   const { data } = await supabase.functions.invoke('disease-scan', {
     body: { diseaseCheckId: id, imagePath: path, tankId }
   });
   // Edge function downloads image, calls AI, updates DB
   ```

4. **Display Results**:
   ```typescript
   // Result is already in DB and returned from edge function
   setDiseaseAnalysisResult(data);
   ```

## Error Handling

### App-Side Errors
- **Permission Denied**: User rejected camera/library access
- **Upload Failed**: Network issue or storage quota exceeded
- **Edge Function Error**: Timeout or server error
- **Auth Error**: User not logged in

### Edge Function Errors
- **Missing Auth**: Returns 401
- **Ownership Violation**: Returns 403
- **Image Download Failed**: Returns 500, updates DB with error
- **AI API Error**: Falls back to stub response
- **Parse Error**: Returns mock data

All errors update the `disease_checks.result` with:
```json
{
  "status": "error",
  "error": "Error message here"
}
```

## Performance

- **Image Upload**: ~2-5 seconds (depends on size/network)
- **AI Analysis**: ~5-15 seconds (depends on model)
- **Total Time**: ~10-20 seconds end-to-end
- **Storage Cost**: ~0.1 MB per image

## Cost Estimates

### OpenAI GPT-4o Vision
- **Input**: ~1000 tokens (system prompt + image)
- **Output**: ~150 tokens (JSON response)
- **Cost per scan**: ~$0.01 USD

### Storage (Supabase)
- **Images**: 500 KB average
- **Free tier**: 1 GB = ~2000 images
- **Cost**: $0.021/GB/month

### Edge Function Invocations
- **Free tier**: 500K invocations/month
- **Cost**: Minimal for typical usage

## Testing Checklist

- [ ] Database tables created with RLS policies
- [ ] Storage bucket created with proper policies
- [ ] Edge function deployed
- [ ] AI_API_KEY set (or test stub mode)
- [ ] App can take/select photos
- [ ] Images upload to storage successfully
- [ ] DB records created with processing status
- [ ] Edge function invoked without errors
- [ ] Results displayed in app UI
- [ ] History loads past checks
- [ ] RLS prevents accessing other users' data
- [ ] Error states handled gracefully

## Troubleshooting

### "Failed to upload image"
- Check storage bucket exists and is named `disease-images`
- Verify storage RLS policies allow user to insert
- Check user is authenticated

### "Edge function timeout"
- Increase timeout in Supabase Dashboard > Edge Functions
- Check AI_API_KEY is valid
- Test with stub mode (remove AI_API_KEY)

### "Unauthorized" from edge function
- Verify auth token is passed in Authorization header
- Check user session is valid
- Confirm RLS policies on disease_checks table

### "Image not found in storage"
- Verify imagePath format: `{userId}/{filename}.jpg`
- Check image was uploaded successfully
- Confirm service role key can access storage

### Results not appearing
- Check edge function logs in Supabase Dashboard
- Verify disease_checks.result column updated
- Refresh/reload history in app

## Security Considerations

1. **Never expose service role key in app** - Only in edge function env
2. **Validate all inputs** - Edge function checks ownership
3. **Use RLS everywhere** - Both DB and storage
4. **Rate limiting** - Consider adding rate limits to edge function
5. **Image validation** - Edge function could validate image type/size
6. **HIPAA/Privacy** - Images may contain identifying info, handle appropriately

## Future Enhancements

- [ ] Retry logic for failed API calls
- [ ] Image preprocessing (resize, compression)
- [ ] Multiple image upload
- [ ] Video analysis support
- [ ] Disease trend tracking over time
- [ ] Integration with treatment reminders
- [ ] Export history as PDF report
- [ ] Offline mode with background sync
- [ ] Push notifications when analysis complete
- [ ] Multi-language support for advice

## Support

For issues or questions:
- Check Supabase Dashboard logs
- Review edge function logs
- Test with stub mode first
- Verify environment variables set correctly


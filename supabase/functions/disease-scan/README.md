# Disease Scan Edge Function

This Supabase Edge Function performs AI-powered disease detection on fish images using OpenAI Vision API.

## Environment Variables

Required in Supabase Edge Functions settings:

- `PROJECT_URL` - Supabase project URL
- `SERVICE_ROLE_KEY` - Supabase service role key  
- `SUPABASE_ANON_KEY` - Auto-provided by Supabase
- `OPENAI_API_KEY` - Your OpenAI API key (optional, returns stub data if missing)

## Deploy

```bash
supabase functions deploy disease-scan
```

## Set Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

## Test Locally

```bash
supabase functions serve disease-scan --env-file .env.local
```

## API

### Request

```json
POST /functions/v1/disease-scan
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "diseaseCheckId": "uuid-of-existing-disease-check-record"
}
```

### Response (Success)

```json
{
  "ok": true,
  "result": {
    "status": "complete",
    "model": "gpt-4o",
    "likelyIssue": "Ich (White Spot Disease)",
    "confidence": 0.87,
    "severity": "high",
    "observations": [
      "Multiple small white spots visible on body and fins",
      "Fish appears to be flashing (rubbing against objects)"
    ],
    "advice": [
      "Raise temperature gradually to 82-86°F over 48 hours",
      "Add aquarium salt (1 tablespoon per 5 gallons)",
      "Treat with ich medication following package directions"
    ],
    "disclaimer": "This analysis is for educational purposes only and does not constitute veterinary advice...",
    "updatedAt": "2026-01-07T12:34:56.789Z"
  }
}
```

### Response (Error)

```json
{
  "ok": false,
  "error": "Disease check not found or access denied"
}
```

## How It Works

1. **Validate Auth**: Reads JWT from Authorization header and verifies user is logged in
2. **Verify Ownership**: Fetches `disease_checks` row and ensures `owner_id` matches authenticated user
3. **Download Image**: Uses service role key to download image from `disease-images` storage bucket
4. **Call OpenAI**: Sends base64-encoded image to GPT-4o Vision with structured prompt
5. **Parse Response**: Extracts JSON with disease analysis (likelyIssue, confidence, severity, observations, advice)
6. **Update Database**: Writes result back to `disease_checks.result` column
7. **Return to Client**: Sends analysis back to app

## Security

- ✅ User auth validated via JWT
- ✅ Ownership verified before processing
- ✅ Service role key used only server-side
- ✅ RLS policies enforced on database
- ✅ No way to analyze another user's disease check

## AI Model

Uses **OpenAI GPT-4o** (vision-capable) by default.

### Output Format

```typescript
{
  likelyIssue: string | null,       // Disease name or null if healthy
  confidence: number,                // 0.0 to 1.0
  severity: 'low'|'medium'|'high'|'unknown',
  observations: string[],            // Visual findings
  advice: string[],                  // Actionable treatment steps
  disclaimer: string                 // Always includes disclaimer
}
```

### Stub Mode

If `OPENAI_API_KEY` is not set, function returns realistic mock data:
- 2 random disease scenarios (Ich, healthy fish)
- Proper JSON structure
- Database still updated correctly
- Perfect for testing without API costs

## Cost Per Request

- **OpenAI GPT-4o**: ~$0.01 per image
- **Supabase Edge Function**: Free tier = 500K requests/month
- **Storage bandwidth**: Minimal (~0.5MB per image download)

## Error Handling

All errors are caught and:
1. Logged to edge function logs
2. Written to `disease_checks.result` with `status: 'error'`
3. Returned to client as `{ ok: false, error: "..." }`

## Troubleshooting

### "Missing authorization header"
- Ensure app passes `Authorization: Bearer <token>` header
- Check user is logged in

### "Disease check not found or access denied"
- Verify disease_checks record exists
- Confirm owner_id matches authenticated user
- Check RLS policies are applied

### "Failed to download image from storage"
- Verify image_path is correct format: `{userId}/{uuid}.jpg`
- Check storage bucket `disease-images` exists
- Confirm service role key can access storage

### Stub responses when API key is set
- Check edge function logs for OpenAI errors
- Verify API key is valid and has credits
- Check OpenAI API status

## Logs

View in Supabase Dashboard:
```
Edge Functions → disease-scan → Logs
```

Look for:
- `[disease-scan] Request from user {uid}`
- `[disease-scan] Processing check {id}, image: {path}`
- `[disease-scan] Image downloaded, calling OpenAI Vision API...`
- `[disease-scan] Analysis complete: {disease} (confidence: {conf})`

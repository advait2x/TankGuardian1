# Disease Detection - Quick Reference

## 🚀 Deploy in 5 Minutes

### 1. Database Setup (2 min)
```sql
-- Copy/paste into Supabase SQL Editor
-- File: database/migration-disease-detection.sql
```
Creates table, RLS policies, storage bucket.

### 2. Deploy Edge Function (1 min)
```bash
cd /app
./deploy-disease-detection.sh
```
Or manually:
```bash
supabase functions deploy disease-scan
```

### 3. Set AI Key (Optional, 1 min)
```bash
supabase secrets set AI_API_KEY=sk-proj-your-openai-key
```
Skip this for stub/test mode.

### 4. Run App (1 min)
```bash
npx expo start
```
Go to: My Tank → Scan for Diseases → Take photo

---

## 📱 User Flow

```
[Scan for Diseases] → 📸 Camera → ⬆️ Uploading → 🤖 Analyzing → ✅ Results
                                                                        ↓
                                                            [History] ← 💾 Saved
```

---

## 💻 Code Usage

### Main Entry Point
```typescript
import { runDiseaseDetection } from '@/utils/diseaseDetection';

const result = await runDiseaseDetection({
  localUri: imageUri,        // from ImagePicker
  tankId: tank?.id,          // optional
  sessionUserId: user.id,    // required
  onProgress: (stage) => {   // optional callback
    // stage: 'uploading' | 'analyzing' | 'complete' | 'error'
  }
});

if (result.ok) {
  // result.result contains:
  // { likelyIssue, confidence, advice, symptoms, treatment, severity }
}
```

### Get History
```typescript
import { fetchDiseaseCheckHistory } from '@/utils/remoteDiseaseChecks';

const { ok, checks } = await fetchDiseaseCheckHistory({
  ownerId: user.id,
  tankId: tank?.id,  // optional - filter by tank
  limit: 20          // optional - default 20
});
```

---

## 🗄️ Database

### Table: disease_checks
```typescript
{
  id: UUID,
  owner_id: UUID,           // → auth.users(id)
  tank_id: UUID | null,     // → tanks(id)
  image_path: string,       // "userId/uuid.jpg"
  result: {
    status: 'processing' | 'complete' | 'error',
    likelyIssue?: string,
    confidence?: number,
    advice?: string,
    symptoms?: string[],
    treatment?: string[],
    severity?: string,
    model?: string,
    error?: string
  },
  created_at: timestamp
}
```

### Storage: disease-images
```
disease-images/
  {userId}/
    {uuid}.jpg
    {uuid}.jpg
    ...
```

---

## ⚡ Edge Function

### Endpoint
```
POST https://{project}.supabase.co/functions/v1/disease-scan
```

### Request
```json
{
  "diseaseCheckId": "uuid",
  "imagePath": "userId/image.jpg",
  "tankId": "uuid"  // optional
}
```

### Headers
```
Authorization: Bearer {user_jwt}
Content-Type: application/json
```

### Response
```json
{
  "status": "complete",
  "model": "gpt-4o",
  "likelyIssue": "Ich (White Spot Disease)",
  "confidence": 0.87,
  "advice": "Treatment advice...",
  "symptoms": ["symptom1", "symptom2"],
  "treatment": ["step1", "step2"],
  "severity": "Moderate"
}
```

---

## 🔐 Security

| Layer | Access Control |
|-------|----------------|
| **App** | Anon key only, RLS enforced |
| **Edge Function** | Service role key (server-side) |
| **Database** | RLS: owner_id = auth.uid() |
| **Storage** | RLS: folder = auth.uid() |

Users **cannot**:
- ❌ Read others' disease checks
- ❌ Update others' records  
- ❌ Access others' images

---

## 🤖 AI Configuration

### OpenAI (Default)
```bash
supabase secrets set AI_API_KEY=sk-proj-...
# AI_BASE_URL defaults to https://api.openai.com/v1
```

### Azure OpenAI
```bash
supabase secrets set AI_API_KEY=your-azure-key
supabase secrets set AI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
```

### Stub Mode (Testing)
```bash
# Don't set AI_API_KEY
# Edge function returns mock data
```

---

## 📊 Monitoring

### Check Recent Scans
```sql
SELECT 
  id,
  owner_id,
  tank_id,
  result->>'status' as status,
  result->>'likelyIssue' as issue,
  (result->>'confidence')::float as confidence,
  created_at
FROM disease_checks
ORDER BY created_at DESC
LIMIT 20;
```

### Error Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE result->>'status' = 'error') * 100.0 / COUNT(*) as error_rate
FROM disease_checks
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Edge Function Logs
Supabase Dashboard → Edge Functions → disease-scan → Logs

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot read readAsStringAsync" | `npm install expo-file-system` |
| "Edge function not found" | `supabase functions deploy disease-scan` |
| "Unauthorized" | Check user is logged in |
| Images not in storage | Run migration SQL |
| Stub responses with API key | Check edge function logs for API errors |
| Upload fails | Check storage bucket exists and has RLS policies |

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [DISEASE_DETECTION_COMPLETE.md](DISEASE_DETECTION_COMPLETE.md) | Implementation summary |
| [DISEASE_DETECTION_GUIDE.md](DISEASE_DETECTION_GUIDE.md) | Complete documentation |
| [DISEASE_DETECTION_TESTING.md](DISEASE_DETECTION_TESTING.md) | Testing checklist |
| [supabase/functions/disease-scan/README.md](supabase/functions/disease-scan/README.md) | Edge function docs |

---

## 💰 Costs

| Item | Free Tier | Cost |
|------|-----------|------|
| Edge function calls | 500K/month | Minimal after |
| Storage | 1 GB | $0.021/GB/month |
| OpenAI GPT-4o | - | ~$0.01/scan |

**Example**: 100 scans/month ≈ **$1 USD**

---

## ✅ Verify Deployment

```bash
# 1. Check database
psql> SELECT COUNT(*) FROM disease_checks;

# 2. Check storage
# Dashboard → Storage → disease-images (should exist)

# 3. Check edge function
# Dashboard → Edge Functions → disease-scan (should be deployed)

# 4. Test in app
# My Tank → Scan for Diseases → Take photo → See results
```

---

## 🎉 Success!

If you can:
- ✅ Take a photo
- ✅ See "Uploading..." then "Analyzing..."
- ✅ Get results with disease/confidence/advice
- ✅ View in history

**You're all set!** 🐠✨

---

## Support

- 📖 Full docs: [DISEASE_DETECTION_GUIDE.md](DISEASE_DETECTION_GUIDE.md)
- 🧪 Testing: [DISEASE_DETECTION_TESTING.md](DISEASE_DETECTION_TESTING.md)
- 🔍 Logs: Supabase Dashboard
- 💬 Edge function logs show API calls/errors

---

**Version**: 1.0.0  
**Updated**: January 7, 2026

# Network Request Failed - Fix Applied

## Problem Diagnosed
"TypeError: Network request failed" when signing up or logging in means the request **never reaches Supabase**.

## Root Cause
iOS App Transport Security (ATS) was blocking network requests to Supabase because:
1. No explicit exception domain was configured for `supabase.co`
2. iOS requires explicit permission for external HTTPS endpoints

## Fixes Applied

### 1. Updated app.json
Added iOS-specific ATS configuration to allow Supabase:
```json
"ios": {
  "infoPlist": {
    "NSAppTransportSecurity": {
      "NSAllowsArbitraryLoads": false,
      "NSExceptionDomains": {
        "supabase.co": {
          "NSIncludesSubdomains": true,
          "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
          "NSExceptionRequiresForwardSecrecy": true,
          "NSExceptionMinimumTLSVersion": "TLSv1.2"
        }
      }
    }
  }
}
```

### 2. Added Debug Logging
Enhanced logging in:
- `utils/supabase.ts` - Logs all fetch requests and responses
- `app/signup.tsx` - Detailed error messages for network failures

## Required Actions

### ⚠️ IMPORTANT: Must Rebuild iOS App
The Info.plist changes require a **native rebuild**:

```bash
# Option 1: EAS Build (if using EAS)
eas build --platform ios --profile development

# Option 2: Local build
npx expo prebuild --clean
npx expo run:ios
```

**DO NOT** just restart Metro bundler - that won't update native iOS configuration!

### Testing Steps
1. Rebuild the iOS app (see above)
2. Open the app on device/simulator
3. Try to create an account
4. Check Metro logs for:
   - `[Supabase] 🔗 Full URL:` - Confirms URL is loaded
   - `[Supabase] 📡 Fetch request to:` - Shows network attempt
   - `[Supabase] ✅ Response:` - Should show 200 status
   - `[Signup] Sign up successful` - Confirms signup worked

### If Still Failing
Check logs for:
- Missing environment variables
- Different error messages (not "Network request failed")
- Supabase project status (could be paused/deleted)

## Verification
Run on iOS device and the signup should now work without "Network request failed" error.

#!/bin/bash

# Disease Detection Deployment Script
# 
# This script helps deploy the disease detection feature to Supabase.
# 
# Prerequisites:
# - Supabase CLI installed (npm install -g supabase)
# - Supabase project linked (supabase link --project-ref YOUR_PROJECT_REF)
# - OpenAI API key (optional, for real AI)

set -e

echo "🔬 Disease Detection Deployment Script"
echo "========================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Warning: Supabase project not linked"
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Deploy Edge Function
echo "📦 Step 1: Deploying disease-scan edge function..."
supabase functions deploy disease-scan

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully"
else
    echo "❌ Edge function deployment failed"
    exit 1
fi
echo ""

# Step 2: Set AI API Key (optional)
echo "🔑 Step 2: Set AI API Key (optional)"
echo "If you have an OpenAI API key, enter it now to enable real AI analysis."
echo "Leave blank to use stub mode for testing."
echo ""
read -p "OpenAI API Key (or press Enter to skip): " API_KEY

if [ ! -z "$API_KEY" ]; then
    echo "Setting AI_API_KEY secret..."
    echo "$API_KEY" | supabase secrets set AI_API_KEY
    
    if [ $? -eq 0 ]; then
        echo "✅ AI_API_KEY set successfully"
    else
        echo "❌ Failed to set AI_API_KEY"
        exit 1
    fi
else
    echo "⏭️  Skipping AI_API_KEY - stub mode will be used"
fi
echo ""

# Step 3: Optional - Set custom AI base URL
echo "🌐 Step 3: Custom AI Base URL (optional)"
echo "If using Azure OpenAI or another provider, enter the base URL."
echo "Leave blank to use default OpenAI endpoint."
echo ""
read -p "AI Base URL (or press Enter to skip): " BASE_URL

if [ ! -z "$BASE_URL" ]; then
    echo "Setting AI_BASE_URL secret..."
    echo "$BASE_URL" | supabase secrets set AI_BASE_URL
    
    if [ $? -eq 0 ]; then
        echo "✅ AI_BASE_URL set successfully"
    else
        echo "❌ Failed to set AI_BASE_URL"
        exit 1
    fi
fi
echo ""

# Step 4: Verify database setup
echo "📊 Step 4: Database Setup"
echo ""
echo "Please ensure the following are set up in your Supabase project:"
echo ""
echo "1. disease_checks table exists"
echo "   - Run SQL in database/schema.sql or database/rls-policies.sql"
echo ""
echo "2. disease-images storage bucket exists"
echo "   - Create in: Supabase Dashboard > Storage > Create bucket"
echo "   - Name: disease-images"
echo "   - Public: false"
echo ""
echo "3. RLS policies are applied"
echo "   - For disease_checks table"
echo "   - For storage.objects (disease-images bucket)"
echo ""
read -p "Have you completed the database setup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please complete database setup before testing"
    echo "See DISEASE_DETECTION_GUIDE.md for details"
    exit 0
fi

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📱 Next Steps:"
echo "1. Build and run your Expo app: npx expo start"
echo "2. Go to My Tank tab"
echo "3. Tap 'Scan for Diseases' button"
echo "4. Take a photo and wait for analysis"
echo ""
echo "📖 Documentation: DISEASE_DETECTION_GUIDE.md"
echo "🔍 Function logs: https://app.supabase.com/project/_/functions/disease-scan/logs"
echo ""
echo "Happy scanning! 🐠✨"

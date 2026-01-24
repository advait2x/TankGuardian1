// Test Supabase Connection
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Supabase Connection\n');
console.log('Environment Variables:');
console.log('- EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? `✅ ${supabaseUrl}` : '❌ Not found');
console.log('- EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✅ ${supabaseAnonKey.slice(0, 20)}...` : '❌ Not found');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ Missing environment variables. Cannot test connection.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('\n📡 Testing Connection...\n');

  try {
    // Test 1: Simple query to check connection
    console.log('Test 1: Basic connectivity check...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (healthError) {
      console.log('❌ Connection failed:', healthError.message);
      console.log('   Details:', healthError);
    } else {
      console.log('✅ Connection successful!');
      console.log('   Profiles table accessible:', healthCheck !== null);
    }

    // Test 2: Check auth status
    console.log('\nTest 2: Auth status...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Auth check failed:', sessionError.message);
    } else if (session) {
      console.log('✅ Active session found');
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
    } else {
      console.log('⚠️  No active session (not signed in)');
    }

    // Test 3: Check tables accessibility
    console.log('\nTest 3: Checking table access...');
    const tables = ['profiles', 'tanks', 'tank_items', 'fish_species', 'water_logs'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ${table}: ❌ ${error.message}`);
      } else {
        console.log(`   ${table}: ✅ Accessible (${data?.length || 0} row preview)`);
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }

  console.log('\n✅ Test complete\n');
}

testConnection();

// IMPORTANT: Must import polyfill FIRST
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean =>
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;

let client: ReturnType<typeof createClient> | null = null;

if (!isSupabaseConfigured()) {
  console.error(
    '[Supabase] ❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
} else {
  console.log('[Supabase] ✅ URL ends with:', supabaseUrl!.slice(-12));
  console.log('[Supabase] ✅ ANON ends with:', supabaseAnonKey!.slice(-12));
  console.log('[Supabase] 🔗 Full URL:', supabaseUrl);

  client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-react-native',
      },
      fetch: (url, options = {}) => {
        console.log('[Supabase] 📡 Fetch request to:', url);
        console.log('[Supabase] 📡 Request method:', options.method);
        
        return fetch(url, options)
          .then(response => {
            console.log('[Supabase] ✅ Response:', response.status, response.statusText);
            return response;
          })
          .catch(error => {
            console.error('[Supabase] ❌ Fetch error:', error.message);
            console.error('[Supabase] ❌ Error type:', error.constructor.name);
            console.error('[Supabase] ❌ URL was:', url);
            throw error;
          });
      },
    },
  });
}

export const supabase = client;

declare module '@supabase/supabase-js' {
  export interface SupabaseClientOptions {
    auth?: {
      persistSession?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions
  ): any;

  export * from '@supabase/supabase-js';
}


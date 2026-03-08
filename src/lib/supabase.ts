import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY;

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';

/**
 * True only when real Supabase credentials are provided via environment variables.
 * When false, the app falls back to localStorage-only mode.
 */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl !== PLACEHOLDER_URL &&
  supabaseAnonKey !== 'placeholder';

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase environment variables not set. ' +
    'Copy .env.example to .env and fill in your Supabase project URL and anon key. ' +
    'Running in offline/demo mode — data will be stored locally.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? PLACEHOLDER_URL,
  supabaseAnonKey ?? 'placeholder',
);

export type { User as SupabaseUser } from '@supabase/supabase-js';

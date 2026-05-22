import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function resolveAuthenticatedUserId(
  preferredUserId?: string | null,
): Promise<string | null> {
  if (preferredUserId) return preferredUserId;
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

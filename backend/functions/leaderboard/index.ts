// Edge Function: leaderboard
// Deno runtime (Supabase standard)
// Computes and returns the top-100 leaderboard rankings.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://krux-dimd.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify the user is authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Query top 100 by green_score
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, name, avatar, green_score, location, streak')
      .order('green_score', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Leaderboard query error:', error);
      return errorResponse('Failed to fetch leaderboard', 500);
    }

    const leaderboard = (profiles ?? []).map((p, index) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      green_score: p.green_score,
      location: p.location,
      streak: p.streak,
      rank: index + 1,
    }));

    return new Response(JSON.stringify(leaderboard), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

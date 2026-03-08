/**
 * handshake-initiate — Edge Function
 *
 * Links a user to a physical bin and creates a pending scan_session.
 * Called by the mobile app (Step 1 of the scanner flow).
 *
 * POST body: { user_id: string, bin_id: string }
 * Returns:   { session_id, bin_type, bin_location }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const bodySchema = z.object({
  user_id: z.string().uuid(),
  bin_id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { user_id, bin_id } = parsed.data;

    // 1. Fetch bin record by physical bin_id string
    const { data: bin, error: binErr } = await supabase
      .from('bins')
      .select('id, bin_type, location_name, status')
      .eq('bin_id', bin_id)
      .single();

    if (binErr || !bin) {
      return new Response(
        JSON.stringify({ error: 'Bin not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (bin.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Bin is ${bin.status as string}` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Create scan session
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: session, error: sessErr } = await supabase
      .from('scan_sessions')
      .insert({
        user_id,
        bin_id: bin.id as string,
        status: 'pending_scan',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (sessErr || !session) {
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        session_id: session.id as string,
        bin_type: bin.bin_type as string,
        bin_location: bin.location_name as string,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

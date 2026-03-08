/**
 * bin-drop-event — Edge Function
 *
 * Receives IoT payloads from ESP32 bin sensors.
 * Authenticated via a shared API key (not user JWT).
 *
 * POST body: { bin_id: string, ir_triggered: boolean, delta_weight?: number, timestamp: number }
 * Returns:   { matched: boolean, session_id?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bin-api-key',
};

const bodySchema = z.object({
  bin_id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  ir_triggered: z.boolean(),
  delta_weight: z.number().optional(),
  timestamp: z.number().int().positive(),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate bin API key (separate from user JWT)
  const binApiKey = req.headers.get('x-bin-api-key');
  const expectedKey = Deno.env.get('BIN_API_KEY');
  if (!expectedKey || binApiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
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
    const { bin_id, ir_triggered, delta_weight } = parsed.data;

    // Look up the bin record
    const { data: bin } = await supabase
      .from('bins')
      .select('id')
      .eq('bin_id', bin_id)
      .single();

    if (!bin) {
      return new Response(
        JSON.stringify({ error: 'Bin not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const binUUID = bin.id as string;

    // Update bin heartbeat
    await supabase
      .from('bins')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', binUUID);

    // Find latest pending session for this bin (within last 60 seconds)
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: session } = await supabase
      .from('scan_sessions')
      .select('id, user_id, krux_earned')
      .eq('bin_id', binUUID)
      .eq('status', 'pending_drop')
      .gte('created_at', sixtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Log the raw drop event
    await supabase.from('drop_events').insert({
      bin_id: binUUID,
      session_id: session?.id ?? null,
      delta_weight: delta_weight ?? null,
      ir_sensor_triggered: ir_triggered,
      raw_payload: parsed.data,
      matched: !!session,
    });

    if (!session || !ir_triggered) {
      return new Response(
        JSON.stringify({ matched: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Match found — complete the session
    await supabase
      .from('scan_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session.id as string);

    // Update profile stats atomically using separate increments
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('total_scans, green_score')
      .eq('id', session.user_id as string)
      .single();

    if (currentProfile) {
      await supabase
        .from('profiles')
        .update({
          total_scans: (currentProfile.total_scans as number) + 1,
          green_score: (currentProfile.green_score as number) + (session.krux_earned as number) * 2,
        })
        .eq('id', session.user_id as string);
    }

    // Broadcast drop confirmation via Realtime
    await supabase.channel('drop_event:' + (session.id as string)).send({
      type: 'broadcast',
      event: 'drop_confirmed',
      payload: { session_id: session.id as string },
    });

    return new Response(
      JSON.stringify({ matched: true, session_id: session.id as string }),
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

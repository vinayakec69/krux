/**
 * scan-validate — Edge Function
 *
 * Server-side scan validation + KRUX coin minting.
 * Called immediately after ML classification on the client.
 *
 * POST body: ScanValidatePayload (see src/services/api.ts)
 * Returns:   { success, krux_earned, new_balance, fraud_detected?, fraud_reason? }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const bodySchema = z.object({
  session_id: z.string().uuid(),
  predicted_class: z.enum(['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'OTHER']),
  confidence: z.number().min(0).max(1),
  image_hash: z.string().max(256),
  perceptual_hash: z.string().max(256),
  color_histogram: z.string().max(2048),
  device_fingerprint: z.string().max(256),
  gps: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

// Base KRUX per plastic type
const BASE_COINS: Record<string, number> = {
  PET: 15, HDPE: 20, PVC: 8, LDPE: 10, PP: 12, PS: 7, OTHER: 5,
};

const MAX_DAILY_KRUX = 200;
const MAX_DAILY_SCANS = 20;
const MAX_HOURLY_SCANS = 5;
const PHASH_HAMMING_THRESHOLD = 5;

/** Hamming distance between two equal-length hex strings. */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 999;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4][xor];
  }
  return dist;
}

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
    // ── Parse & validate input ──────────────────────────────────────────────
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const body = parsed.data;

    // ── Fetch session ───────────────────────────────────────────────────────
    const { data: session, error: sessErr } = await supabase
      .from('scan_sessions')
      .select('id, user_id, status, expires_at, bin_id')
      .eq('id', body.session_id)
      .single();

    if (sessErr || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (session.status !== 'pending_scan') {
      return new Response(
        JSON.stringify({ error: 'Session not in pending_scan state' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (new Date(session.expires_at as string) < new Date()) {
      await supabase.from('scan_sessions').update({ status: 'expired' }).eq('id', body.session_id);
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = session.user_id as string;

    // ── Rate limiting ───────────────────────────────────────────────────────
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3_600_000).toISOString();
    const todayStart = new Date(now.toDateString()).toISOString();

    const { count: hourlyCount } = await supabase
      .from('scan_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
      .in('status', ['completed', 'scanned', 'pending_drop']);

    if ((hourlyCount ?? 0) >= MAX_HOURLY_SCANS) {
      await logFraud(supabase, userId, body.session_id, 'rate_limit_hourly', 1.0, { hourlyCount });
      return new Response(
        JSON.stringify({ success: false, fraud_detected: true, fraud_reason: 'Too many scans per hour' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { count: dailyCount } = await supabase
      .from('scan_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart)
      .in('status', ['completed']);

    if ((dailyCount ?? 0) >= MAX_DAILY_SCANS) {
      await logFraud(supabase, userId, body.session_id, 'rate_limit_daily', 1.0, { dailyCount });
      return new Response(
        JSON.stringify({ success: false, fraud_detected: true, fraud_reason: 'Daily scan limit reached' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Perceptual-hash duplicate check (last 500 scans) ───────────────────
    if (body.perceptual_hash) {
      const { data: recentScans } = await supabase
        .from('scan_sessions')
        .select('perceptual_hash')
        .eq('user_id', userId)
        .not('perceptual_hash', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      const isDuplicate = (recentScans ?? []).some(
        (s: { perceptual_hash: string }) =>
          hammingDistance(body.perceptual_hash, s.perceptual_hash) < PHASH_HAMMING_THRESHOLD,
      );

      if (isDuplicate) {
        await logFraud(supabase, userId, body.session_id, 'duplicate_image', 0.9, {
          perceptual_hash: body.perceptual_hash,
        });
        await supabase.from('scan_sessions').update({ status: 'fraud' }).eq('id', body.session_id);
        return new Response(
          JSON.stringify({ success: false, fraud_detected: true, fraud_reason: 'Duplicate image detected' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Daily earning cap check ─────────────────────────────────────────────
    const { data: dailyEarnings } = await supabase
      .from('krux_ledger')
      .select('amount')
      .eq('user_id', userId)
      .eq('tx_type', 'scan_reward')
      .gte('created_at', todayStart);

    const todayTotal = (dailyEarnings ?? []).reduce(
      (sum: number, row: { amount: number }) => sum + row.amount,
      0,
    );

    if (todayTotal >= MAX_DAILY_KRUX) {
      return new Response(
        JSON.stringify({ success: false, fraud_detected: true, fraud_reason: 'Daily earning cap reached' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Calculate reward ────────────────────────────────────────────────────
    const base = BASE_COINS[body.predicted_class] ?? 5;
    const multiplier = 0.5 + body.confidence * 1.5;          // 0.5x – 2.0x
    const kruxEarned = Math.min(
      Math.round(base * multiplier),
      MAX_DAILY_KRUX - todayTotal,
    );

    // ── Fetch current profile balance ───────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('krux_balance')
      .eq('id', userId)
      .single();

    const currentBalance = (profile?.krux_balance as number) ?? 0;
    const newBalance = currentBalance + kruxEarned;

    // ── Atomically update session + profile + ledger ────────────────────────
    await supabase
      .from('scan_sessions')
      .update({
        status: 'pending_drop',
        predicted_class: body.predicted_class,
        confidence: body.confidence,
        image_hash: body.image_hash,
        perceptual_hash: body.perceptual_hash,
        color_histogram: body.color_histogram,
        device_fingerprint: body.device_fingerprint,
        gps_lat: body.gps?.lat ?? null,
        gps_lng: body.gps?.lng ?? null,
        krux_earned: kruxEarned,
      })
      .eq('id', body.session_id);

    await supabase
      .from('profiles')
      .update({ krux_balance: newBalance })
      .eq('id', userId);

    await supabase.from('krux_ledger').insert({
      user_id: userId,
      amount: kruxEarned,
      tx_type: 'scan_reward',
      reference_id: body.session_id,
      balance_after: newBalance,
    });

    return new Response(
      JSON.stringify({ success: true, krux_earned: kruxEarned, new_balance: newBalance }),
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

async function logFraud(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  fraudType: string,
  confidence: number,
  details: Record<string, unknown>,
) {
  await supabase.from('fraud_logs').insert({
    user_id: userId,
    session_id: sessionId,
    fraud_type: fraudType,
    confidence,
    details,
    action_taken: 'flagged',
  });
  // Check auto-ban threshold
  await supabase.rpc('check_auto_ban', { p_user_id: userId });
}

/**
 * fraud-check — Edge Function
 *
 * Standalone fraud analysis endpoint (can be called independently for
 * additional validation beyond scan-validate).
 *
 * POST body: { session_id, user_id, perceptual_hash, device_fingerprint, gps? }
 * Returns:   { fraud_detected: boolean, reasons: string[], confidence: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const bodySchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  perceptual_hash: z.string().max(256).optional(),
  device_fingerprint: z.string().max(256).optional(),
  gps: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

/** Haversine distance in km between two GPS coordinates. */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { user_id, perceptual_hash, gps } = parsed.data;

    const reasons: string[] = [];
    let maxConfidence = 0;

    // ── Duplicate image check ─────────────────────────────────────────────
    if (perceptual_hash) {
      const { data: recent } = await supabase
        .from('scan_sessions')
        .select('perceptual_hash')
        .eq('user_id', user_id)
        .not('perceptual_hash', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      const duplicate = (recent ?? []).some(
        (s: { perceptual_hash: string }) =>
          hammingDistance(perceptual_hash, s.perceptual_hash) < 5,
      );

      if (duplicate) {
        reasons.push('Duplicate image');
        maxConfidence = Math.max(maxConfidence, 0.95);
      }
    }

    // ── GPS velocity check ────────────────────────────────────────────────
    if (gps) {
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const { data: lastSession } = await supabase
        .from('scan_sessions')
        .select('gps_lat, gps_lng, created_at')
        .eq('user_id', user_id)
        .gte('created_at', oneHourAgo)
        .not('gps_lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSession?.gps_lat && lastSession?.gps_lng) {
        const dist = haversineKm(
          lastSession.gps_lat as number, lastSession.gps_lng as number,
          gps.lat, gps.lng,
        );
        const hoursSince =
          (Date.now() - new Date(lastSession.created_at as string).getTime()) / 3_600_000;
        const speedKmH = dist / Math.max(hoursSince, 0.001);

        // Human cannot travel > 900 km/h
        if (speedKmH > 900) {
          reasons.push(`GPS velocity anomaly (${Math.round(speedKmH)} km/h)`);
          maxConfidence = Math.max(maxConfidence, 0.99);
        }
      }
    }

    const fraudDetected = reasons.length > 0;

    return new Response(
      JSON.stringify({ fraud_detected: fraudDetected, reasons, confidence: maxConfidence }),
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

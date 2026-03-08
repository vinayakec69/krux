// Edge Function: validate-scan
// Deno runtime (Supabase standard)
// Validates a plastic scan submission server-side before crediting coins.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://krux-dimd.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CONFIDENCE_THRESHOLD = 40;
const MAX_SCANS_PER_DAY = 50;
const DUPLICATE_WINDOW_HOURS = 24;

interface ScanPayload {
  image_hash: string;
  color_histogram?: string;
  device_id: string;
  gps_lat?: number;
  gps_lng?: number;
  plastic_type: string;
  confidence: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Use the user's JWT for auth verification
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Admin client for writes
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Parse and validate the request body
    const payload: ScanPayload = await req.json();
    const { image_hash, color_histogram, device_id, gps_lat, gps_lng, plastic_type, confidence } = payload;

    if (!image_hash || !device_id || !plastic_type) {
      return errorResponse('Missing required fields: image_hash, device_id, plastic_type', 400);
    }

    // 3. Confidence threshold check
    if (confidence < CONFIDENCE_THRESHOLD) {
      return errorResponse(`Confidence ${confidence}% is below minimum threshold of ${CONFIDENCE_THRESHOLD}%`, 422);
    }

    // 4. GPS bounds check (if provided)
    if (gps_lat !== undefined && (gps_lat < -90 || gps_lat > 90)) {
      return errorResponse('Invalid GPS latitude', 422);
    }
    if (gps_lng !== undefined && (gps_lng < -180 || gps_lng > 180)) {
      return errorResponse('Invalid GPS longitude', 422);
    }

    // 5. Duplicate image hash check (within 24-hour window)
    const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3600 * 1000).toISOString();
    const { data: dupeCheck } = await adminClient
      .from('scans')
      .select('id')
      .eq('image_hash', image_hash)
      .eq('user_id', user.id)
      .gte('created_at', windowStart)
      .limit(1)
      .single();

    if (dupeCheck) {
      return errorResponse('Duplicate scan detected within the last 24 hours', 409);
    }

    // 6. Rate limit: max 50 scans/day/user
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { count: todayScans } = await adminClient
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayStart.toISOString());

    if ((todayScans ?? 0) >= MAX_SCANS_PER_DAY) {
      return errorResponse(`Daily scan limit of ${MAX_SCANS_PER_DAY} reached`, 429);
    }

    // 7. Calculate coins earned (base 10 * confidence multiplier)
    const baseCoins = 10;
    const confidenceMultiplier = confidence / 100;
    const coinsEarned = Math.round(baseCoins * confidenceMultiplier);

    // 8. Get current balance
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('krux_balance, total_scans, green_score')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse('Profile not found', 404);
    }

    const newBalance = profile.krux_balance + coinsEarned;

    // 9. Insert scan record, coin transaction, and update profile atomically
    const { data: scan, error: scanError } = await adminClient
      .from('scans')
      .insert({
        user_id: user.id,
        plastic_type,
        confidence,
        image_hash,
        color_histogram: color_histogram ?? null,
        device_id,
        gps_lat: gps_lat ?? null,
        gps_lng: gps_lng ?? null,
        krux_earned: coinsEarned,
        verified: true,
      })
      .select('id')
      .single();

    if (scanError || !scan) {
      console.error('Scan insert error:', scanError);
      return errorResponse('Failed to record scan', 500);
    }

    const { error: txError } = await adminClient
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: coinsEarned,
        balance_after: newBalance,
        tx_type: 'scan_reward',
        reference_id: scan.id,
        metadata: { plastic_type, confidence },
      });

    if (txError) {
      console.error('Transaction insert error:', txError);
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        krux_balance: newBalance,
        total_scans: (profile.total_scans ?? 0) + 1,
        green_score: (profile.green_score ?? 0) + coinsEarned * 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return errorResponse('Failed to update balance', 500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        coins_earned: coinsEarned,
        new_balance: newBalance,
        scan_id: scan.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

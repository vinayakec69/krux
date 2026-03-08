// Edge Function: credit-coins
// Deno runtime (Supabase standard)
// Generic atomic coin credit/debit function used by: purchases, referrals,
// spin wheel, challenges, and streak bonuses.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://krux-dimd.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type TxType =
  | 'scan_reward'
  | 'purchase'
  | 'referral_bonus'
  | 'spin_reward'
  | 'challenge_reward'
  | 'streak_bonus'
  | 'admin_adjustment';

interface CreditCoinsPayload {
  amount: number;             // positive = credit, negative = debit
  tx_type: TxType;
  reference_id?: string;
  metadata?: Record<string, unknown>;
  // For purchase action
  action?: 'purchase';
  items?: { product_id: string; quantity: number }[];
  delivery_info?: Record<string, string>;
}

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const payload: CreditCoinsPayload = await req.json();

    // Handle purchase action
    if (payload.action === 'purchase') {
      return await handlePurchase(adminClient, user.id, payload);
    }

    const { amount, tx_type, reference_id, metadata } = payload;

    if (amount === undefined || !tx_type) {
      return errorResponse('Missing required fields: amount, tx_type', 400);
    }

    // Fetch current balance
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('krux_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse('Profile not found', 404);
    }

    // Validate sufficient balance for debits
    if (amount < 0 && profile.krux_balance + amount < 0) {
      return errorResponse('Insufficient balance', 402);
    }

    const newBalance = profile.krux_balance + amount;

    // Insert coin transaction
    const { data: tx, error: txError } = await adminClient
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount,
        balance_after: newBalance,
        tx_type,
        reference_id: reference_id ?? null,
        metadata: metadata ?? {},
      })
      .select('id')
      .single();

    if (txError || !tx) {
      console.error('Transaction insert error:', txError);
      return errorResponse('Failed to create transaction', 500);
    }

    // Update profile balance
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        krux_balance: newBalance,
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
        new_balance: newBalance,
        transaction_id: tx.id,
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

async function handlePurchase(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  payload: CreditCoinsPayload
): Promise<Response> {
  const { items, delivery_info } = payload;

  if (!items || items.length === 0 || !delivery_info) {
    return errorResponse('Missing items or delivery_info for purchase', 400);
  }

  // Calculate total cost
  let total = 0;
  const productIds = items.map(i => i.product_id);
  const { data: products, error: productsError } = await adminClient
    .from('products')
    .select('id, price, stock')
    .in('id', productIds);

  if (productsError || !products) {
    return errorResponse('Failed to fetch products', 500);
  }

  for (const item of items) {
    const product = products.find(p => p.id === item.product_id);
    if (!product) return errorResponse(`Product ${item.product_id} not found`, 404);
    if (product.stock < item.quantity) return errorResponse(`Insufficient stock for product ${item.product_id}`, 409);
    total += product.price * item.quantity;
  }

  // Check balance
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('krux_balance')
    .eq('id', userId)
    .single();

  if (profileError || !profile) return errorResponse('Profile not found', 404);
  if (profile.krux_balance < total) return errorResponse('Insufficient balance', 402);

  const newBalance = profile.krux_balance - total;

  // Create order
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .insert({
      user_id: userId,
      total,
      status: 'confirmed',
      delivery_info,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('Order insert error:', orderError);
    return errorResponse('Failed to create order', 500);
  }

  // Create order items
  const orderItems = items.map(item => {
    const product = products.find(p => p.id === item.product_id)!;
    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: product.price,
    };
  });

  const { error: orderItemsError } = await adminClient
    .from('order_items')
    .insert(orderItems);

  if (orderItemsError) {
    console.error('Order items insert error:', orderItemsError);
  }

  // Deduct coins and record transaction
  const { data: tx, error: txError } = await adminClient
    .from('coin_transactions')
    .insert({
      user_id: userId,
      amount: -total,
      balance_after: newBalance,
      tx_type: 'purchase',
      reference_id: order.id,
      metadata: { item_count: items.length },
    })
    .select('id')
    .single();

  if (txError) console.error('Transaction insert error:', txError);

  // Update balance
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ krux_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) {
    console.error('Profile update error:', updateError);
    return errorResponse('Failed to update balance', 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      order_id: order.id,
      new_balance: newBalance,
      transaction_id: tx?.id ?? null,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

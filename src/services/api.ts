/**
 * API service: all calls to Supabase Edge Functions.
 */

import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HandshakeResult {
  session_id: string;
  bin_type: 'PET' | 'HDPE' | 'OTHER';
  bin_location: string;
}

export interface ScanValidatePayload {
  session_id: string;
  predicted_class: string;
  confidence: number;
  image_hash: string;
  perceptual_hash: string;
  color_histogram: string;
  device_fingerprint: string;
  gps?: { lat: number; lng: number };
}

export interface ScanValidateResult {
  success: boolean;
  krux_earned: number;
  new_balance: number;
  fraud_detected?: boolean;
  fraud_reason?: string;
}

export interface DropEventPayload {
  bin_id: string;
  ir_triggered: boolean;
  delta_weight?: number;
  timestamp: number;
}

export interface DropEventResult {
  matched: boolean;
  session_id?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown> | ScanValidatePayload | DropEventPayload,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body as Record<string, unknown> });
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No response from function ${name}`);
  return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initiate a bin-link handshake (Step 1 of the scanner flow).
 * Creates a pending scan_session on the server.
 */
export async function initiateHandshake(
  userId: string,
  binId: string,
): Promise<HandshakeResult> {
  return invokeFunction<HandshakeResult>('handshake-initiate', {
    user_id: userId,
    bin_id: binId,
  });
}

/**
 * Submit scan result for server-side validation and coin minting (Step 2).
 */
export async function validateScan(
  payload: ScanValidatePayload,
): Promise<ScanValidateResult> {
  return invokeFunction<ScanValidateResult>('scan-validate', payload);
}

/**
 * Simulate an ESP32 drop event (development/demo mode only).
 * In production this endpoint is called by the physical bin hardware.
 */
export async function simulateDropEvent(
  payload: DropEventPayload,
): Promise<DropEventResult> {
  return invokeFunction<DropEventResult>('bin-drop-event', payload);
}

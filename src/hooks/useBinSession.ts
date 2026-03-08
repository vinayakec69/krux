/**
 * useBinSession — manages the 4-step bin-linked scanning flow:
 *   idle → handshake → scanned → waiting_drop → completed | expired | error
 */

import { useState, useCallback, useRef } from 'react';
import { initiateHandshake, validateScan, type ScanValidatePayload } from '@/services/api';

export type BinSessionStatus =
  | 'idle'
  | 'handshaking'
  | 'pending_scan'
  | 'scanned'
  | 'waiting_drop'
  | 'completed'
  | 'expired'
  | 'error';

export interface BinInfo {
  binType: 'PET' | 'HDPE' | 'OTHER';
  binLocation: string;
}

export interface BinSessionState {
  status: BinSessionStatus;
  sessionId: string | null;
  binId: string | null;
  binInfo: BinInfo | null;
  kruxEarned: number;
  newBalance: number;
  error: string | null;
}

const INITIAL_STATE: BinSessionState = {
  status: 'idle',
  sessionId: null,
  binId: null,
  binInfo: null,
  kruxEarned: 0,
  newBalance: 0,
  error: null,
};

const DROP_TIMEOUT_MS = 120_000; // 2 minutes

export function useBinSession(userId: string) {
  const [state, setState] = useState<BinSessionState>(INITIAL_STATE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDropTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  /** Step 1: link user to a bin and create a pending session. */
  const startHandshake = useCallback(
    async (binId: string) => {
      setState({ ...INITIAL_STATE, status: 'handshaking', binId });
      try {
        const result = await initiateHandshake(userId, binId);
        setState((s) => ({
          ...s,
          status: 'pending_scan',
          sessionId: result.session_id,
          binInfo: {
            binType: result.bin_type,
            binLocation: result.bin_location,
          },
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: err instanceof Error ? err.message : 'Handshake failed',
        }));
      }
    },
    [userId],
  );

  /** Step 2: submit ML result for server-side validation. */
  const submitScan = useCallback(async (payload: ScanValidatePayload) => {
    setState((s) => ({ ...s, status: 'scanned' }));
    try {
      const result = await validateScan(payload);

      if (result.fraud_detected) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: result.fraud_reason ?? 'Scan rejected — suspicious activity detected.',
        }));
        return;
      }

      // Server confirmed valid scan — wait for physical drop
      setState((s) => ({
        ...s,
        status: 'waiting_drop',
        kruxEarned: result.krux_earned,
        newBalance: result.new_balance,
      }));

      // Start the 2-minute session expiry timer
      timeoutRef.current = setTimeout(() => {
        setState((s) => {
          if (s.status === 'waiting_drop') return { ...s, status: 'expired' };
          return s;
        });
      }, DROP_TIMEOUT_MS);
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Scan validation failed',
      }));
    }
  }, []);

  /** Called by the Realtime subscription when the bin confirms the drop. */
  const confirmDrop = useCallback(() => {
    clearDropTimeout();
    setState((s) => ({ ...s, status: 'completed' }));
  }, []);

  /** Reset to idle (used by "Scan Another" button). */
  const reset = useCallback(() => {
    clearDropTimeout();
    setState(INITIAL_STATE);
  }, []);

  return { state, startHandshake, submitScan, confirmDrop, reset };
}

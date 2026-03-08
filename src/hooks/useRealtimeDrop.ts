/**
 * useRealtimeDrop — subscribes to Supabase Realtime for drop-event
 * confirmations from the ESP32 sensor, scoped to a specific session_id.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeDropOptions {
  sessionId: string | null;
  onDropConfirmed: () => void;
}

export function useRealtimeDrop({
  sessionId,
  onDropConfirmed,
}: UseRealtimeDropOptions): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onDropRef = useRef(onDropConfirmed);

  // Keep callback ref current without re-subscribing
  useEffect(() => {
    onDropRef.current = onDropConfirmed;
  }, [onDropConfirmed]);

  useEffect(() => {
    // Clean up any existing subscription
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!sessionId) return;

    // Subscribe to changes on drop_events table for this session
    const channel = supabase
      .channel(`drop_event:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drop_events',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          onDropRef.current();
        },
      )
      // Also listen for broadcast events (sent by the edge function)
      .on('broadcast', { event: 'drop_confirmed' }, (payload) => {
        if (
          payload.payload &&
          (payload.payload as Record<string, unknown>)['session_id'] === sessionId
        ) {
          onDropRef.current();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId]);
}

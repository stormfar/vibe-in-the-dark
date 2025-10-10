'use client';

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;
let currentChannel: RealtimeChannel | null = null;

/**
 * Get or create a Supabase Realtime client connection
 * @param gameCode The game code to connect to (channel name)
 */
export function getSocket(gameCode?: string): RealtimeChannel {
  // Initialize Supabase client if not already done
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[Supabase] Initializing client with URL:', url?.substring(0, 30) + '...');

    if (!url || !key || url === 'your-supabase-url-here') {
      console.error('[Supabase] Invalid configuration! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    }

    supabaseClient = createClient(url!, key!, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log('[Supabase] Client initialized');
  }

  const channelName = `game-${gameCode || 'lobby'}`;

  // Subscribe to the channel if not already subscribed or if gameCode changed
  if (!currentChannel || currentChannel.topic !== channelName) {
    if (currentChannel) {
      supabaseClient!.removeChannel(currentChannel);
    }

    currentChannel = supabaseClient!.channel(channelName);

    currentChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase] Successfully subscribed to:', channelName);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Supabase] Subscription error:', status);
      } else if (status === 'TIMED_OUT') {
        console.error('[Supabase] Subscription timed out');
      } else if (status === 'CLOSED') {
        console.log('[Supabase] Channel closed');
      }
    });
  }

  return currentChannel;
}

/**
 * Disconnect the current channel
 */
export function disconnectSocket() {
  if (currentChannel && supabaseClient) {
    supabaseClient.removeChannel(currentChannel);
    currentChannel = null;
  }
}

/**
 * Emit an event to the Supabase Realtime server
 * Note: This is a no-op for client-side. All events are triggered from the server.
 */
export function emitEvent(channel: RealtimeChannel, type: string, payload: unknown) {
  console.log('[Supabase] Client-side emit called (no-op):', type);
}

/**
 * Listen for events from the Supabase Realtime server
 */
export function onEvent(channel: RealtimeChannel, type: string, handler: (payload: unknown) => void) {
  const eventHandler = (data: { event: string; payload: any }) => {
    try {
      handler(data.payload);
    } catch (error) {
      console.error('[Supabase] Error handling event:', error);
    }
  };

  // Bind the handler using Supabase broadcast
  channel.on('broadcast', { event: type }, eventHandler);

  // Return cleanup function that removes this specific handler
  return () => {
    // Supabase doesn't provide granular event unbinding, so we'll need to unsubscribe the whole channel
    // This is handled by disconnectSocket() or when switching channels
  };
}

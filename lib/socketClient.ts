'use client';

import Pusher, { Channel } from 'pusher-js';

let pusherClient: Pusher | null = null;
let currentChannel: Channel | null = null;

/**
 * Get or create a Pusher client connection
 * @param gameCode The game code to connect to (channel name)
 */
export function getSocket(gameCode?: string): Channel {
  // Initialize Pusher client if not already done
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }

  const channelName = `game-${gameCode || 'lobby'}`;

  // Subscribe to the channel if not already subscribed or if gameCode changed
  if (!currentChannel || currentChannel.name !== channelName) {
    if (currentChannel) {
      pusherClient.unsubscribe(currentChannel.name);
    }
    currentChannel = pusherClient.subscribe(channelName);
  }

  return currentChannel;
}

/**
 * Disconnect the current channel
 */
export function disconnectSocket() {
  if (currentChannel && pusherClient) {
    pusherClient.unsubscribe(currentChannel.name);
    currentChannel = null;
  }
}

/**
 * Emit an event to the Pusher server
 * Note: Client events require a specific Pusher feature and are prefixed with "client-"
 * For this app, we rely on server-side triggers via API routes
 */
export function emitEvent(channel: Channel, type: string, payload: unknown) {
  // Pusher client events are not used in this implementation
  // All events are triggered from the server via HTTP API
  console.log('[Pusher] Client-side emit called (no-op):', type);
}

/**
 * Listen for events from the Pusher server
 */
export function onEvent(channel: Channel, type: string, handler: (payload: unknown) => void) {
  const eventHandler = (data: any) => {
    try {
      handler(data);
    } catch (error) {
      console.error('[Pusher] Error handling event:', error);
    }
  };

  channel.bind(type, eventHandler);

  // Return cleanup function
  return () => {
    channel.unbind(type, eventHandler);
  };
}

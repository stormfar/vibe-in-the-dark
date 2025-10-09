'use client';

import PartySocket from 'partysocket';

let socket: PartySocket | null = null;

/**
 * Get or create a PartySocket connection
 * @param gameCode The game code to connect to (room ID)
 */
export function getSocket(gameCode?: string): PartySocket {
  if (!socket || (gameCode && socket.room !== gameCode)) {
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';
    const room = gameCode || 'lobby';

    socket = new PartySocket({
      host,
      room,
    });
  }
  return socket;
}

/**
 * Disconnect the current socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Emit an event to the PartyKit server
 */
export function emitEvent(socket: PartySocket, type: string, payload: unknown) {
  socket.send(JSON.stringify({ type, payload }));
}

/**
 * Listen for events from the PartyKit server
 */
export function onEvent(socket: PartySocket, type: string, handler: (payload: unknown) => void) {
  const messageHandler = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === type) {
        handler(data.payload);
      }
    } catch (error) {
      console.error('[PartySocket] Error parsing message:', error);
    }
  };

  socket.addEventListener('message', messageHandler);

  // Return cleanup function
  return () => {
    socket.removeEventListener('message', messageHandler);
  };
}

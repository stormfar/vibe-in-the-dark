import type * as Party from "partykit/server";
import { routePartykitRequest } from "partyserver";

/**
 * PartyKit Server for Vibe in the Dark
 *
 * This server runs on Cloudflare Workers and acts as a pure WebSocket relay.
 * It does NOT store game state - that lives in Next.js API routes.
 *
 * Architecture:
 * 1. Clients connect to PartyKit rooms (one room per game code)
 * 2. Clients fetch initial state from Next.js API (/api/game/state)
 * 3. Next.js API routes broadcast updates via HTTP POST to PartyKit
 * 4. PartyKit relays those updates to all connected clients in the room
 */
export class VibeServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  /**
   * Handle new WebSocket connections
   */
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(
      `[PartyKit] Client ${conn.id} connected to room ${this.room.id}`
    );

    // Send a welcome message so client knows connection is established
    conn.send(JSON.stringify({
      type: 'connected',
      payload: { roomId: this.room.id }
    }));
  }

  /**
   * Handle incoming WebSocket messages from clients
   *
   * NOTE: Clients should NOT send game state requests here.
   * Instead, they should fetch state from Next.js API directly.
   * This is just for logging/debugging.
   */
  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      console.log(`[PartyKit] Received message from ${sender.id}:`, data.type);

      // We don't need to handle these messages - clients will get state from API
      // This is just a passive relay server
    } catch (error) {
      console.error('[PartyKit] Error parsing message:', error);
    }
  }

  /**
   * Handle client disconnection
   */
  onClose(conn: Party.Connection) {
    console.log(`[PartyKit] Client ${conn.id} disconnected from room ${this.room.id}`);
  }

  /**
   * Handle HTTP requests to the party
   * This is used by Next.js API routes to broadcast updates to all connected clients
   */
  async onRequest(req: Party.Request) {
    // Only allow POST requests for broadcasting events
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await req.json();
      const { type, payload } = body as { type: string; payload: unknown };

      console.log(`[PartyKit] Broadcasting event type: ${type} to room ${this.room.id} (${this.room.connections.size} clients)`);

      // Broadcast the event to all connections in this room
      this.room.broadcast(JSON.stringify({ type, payload }));

      return new Response(JSON.stringify({
        success: true,
        broadcasted: this.room.connections.size
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[PartyKit] Error handling HTTP request:', error);
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

VibeServer satisfies Party.Worker;

// Export for both PartyKit dev and Cloudflare Workers deployment
export default {
  async fetch(request: Party.Request, env: Party.FetcherEnv): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  }
} satisfies Party.Worker;

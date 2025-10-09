import type {
  GameStatusUpdateEvent,
  ParticipantJoinedEvent,
  PreviewUpdateEvent,
  VoteUpdateEvent,
  ReactionUpdateEvent,
  WinnerDeclaredEvent,
} from './types';

/**
 * Get the PartyKit HTTP endpoint for a game room
 */
function getPartyKitEndpoint(gameCode: string): string {
  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/party/${gameCode}`;
}

/**
 * Broadcast an event to all clients in a game room via PartyKit HTTP API
 */
async function broadcastToRoom(gameCode: string, type: string, payload: unknown): Promise<void> {
  try {
    const endpoint = getPartyKitEndpoint(gameCode);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, payload }),
    });

    if (!response.ok) {
      console.error(`[PartyKit] Failed to broadcast event ${type}:`, response.statusText);
    }
  } catch (error) {
    console.error(`[PartyKit] Error broadcasting event ${type}:`, error);
  }
}

// Emit game status update to all clients in a game
export async function emitGameStatusUpdate(gameCode: string, event: GameStatusUpdateEvent) {
  await broadcastToRoom(gameCode, 'game:statusUpdate', event);
}

// Emit participant joined event
export async function emitParticipantJoined(gameCode: string, event: ParticipantJoinedEvent) {
  await broadcastToRoom(gameCode, 'game:participantJoined', event);
}

// Emit preview update
export async function emitPreviewUpdate(gameCode: string, event: PreviewUpdateEvent) {
  await broadcastToRoom(gameCode, 'preview:update', event);
}

// Emit vote update
export async function emitVoteUpdate(gameCode: string, event: VoteUpdateEvent) {
  await broadcastToRoom(gameCode, 'vote:update', event);
}

// Emit reaction update
export async function emitReactionUpdate(gameCode: string, event: ReactionUpdateEvent) {
  await broadcastToRoom(gameCode, 'reaction:update', event);
}

// Emit winner declared
export async function emitWinnerDeclared(gameCode: string, event: WinnerDeclaredEvent) {
  await broadcastToRoom(gameCode, 'game:winnerDeclared', event);
}

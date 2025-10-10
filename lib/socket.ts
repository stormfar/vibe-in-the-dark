import Pusher from 'pusher';
import type {
  GameStatusUpdateEvent,
  ParticipantJoinedEvent,
  PreviewUpdateEvent,
  VoteUpdateEvent,
  ReactionUpdateEvent,
  WinnerDeclaredEvent,
} from './types';

// Initialize Pusher server client
const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

/**
 * Broadcast an event to all clients in a game room via Pusher HTTP API
 */
async function broadcastToRoom(gameCode: string, eventName: string, data: unknown): Promise<void> {
  try {
    const channelName = `game-${gameCode}`;
    console.log(`[Pusher Server] Broadcasting "${eventName}" to channel "${channelName}"`, data);
    await pusherServer.trigger(channelName, eventName, data);
    console.log(`[Pusher Server] Successfully broadcasted "${eventName}"`);
  } catch (error) {
    console.error(`[Pusher] Failed to broadcast event ${eventName}:`, error);
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

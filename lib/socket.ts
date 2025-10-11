import { createClient } from '@supabase/supabase-js';
import type {
  GameStatusUpdateEvent,
  ParticipantJoinedEvent,
  PreviewUpdateEvent,
  VoteUpdateEvent,
  ReactionUpdateEvent,
  WinnerDeclaredEvent,
  SabotageAppliedEvent,
} from './types';

// Initialize Supabase server client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Broadcast an event to all clients in a game room via Supabase Realtime
 */
async function broadcastToRoom(gameCode: string, eventName: string, data: unknown): Promise<void> {
  try {
    const channelName = `game-${gameCode}`;
    console.log(`[Supabase Server] Broadcasting "${eventName}" to channel "${channelName}"`, data);

    const channel = supabaseServer.channel(channelName);
    await channel.subscribe();

    await channel.send({
      type: 'broadcast',
      event: eventName,
      payload: data,
    });

    console.log(`[Supabase Server] Successfully broadcasted "${eventName}"`);

    // Clean up - unsubscribe after sending
    await supabaseServer.removeChannel(channel);
  } catch (error) {
    console.error(`[Supabase] Failed to broadcast event ${eventName}:`, error);
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

// Emit sabotage applied
export async function emitSabotageApplied(gameCode: string, event: SabotageAppliedEvent) {
  await broadcastToRoom(gameCode, 'sabotage:applied', event);
}

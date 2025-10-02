import { Server as SocketIOServer } from 'socket.io';
import type {
  GameStatusUpdateEvent,
  ParticipantJoinedEvent,
  PreviewUpdateEvent,
  VoteUpdateEvent,
  WinnerDeclaredEvent,
} from './types';

// Get the global io instance
export function getIO(): SocketIOServer | null {
  if (typeof window === 'undefined') {
    return (global as { io?: SocketIOServer }).io || null;
  }
  return null;
}

// Emit game status update to all clients in a game
export function emitGameStatusUpdate(gameCode: string, event: GameStatusUpdateEvent) {
  const io = getIO();
  if (!io) return;
  io.to(gameCode).emit('game:statusUpdate', event);
}

// Emit participant joined event
export function emitParticipantJoined(gameCode: string, event: ParticipantJoinedEvent) {
  const io = getIO();
  if (!io) return;
  io.to(gameCode).emit('game:participantJoined', event);
}

// Emit preview update
export function emitPreviewUpdate(gameCode: string, event: PreviewUpdateEvent) {
  const io = getIO();
  if (!io) return;
  io.to(gameCode).emit('preview:update', event);
}

// Emit vote update
export function emitVoteUpdate(gameCode: string, event: VoteUpdateEvent) {
  const io = getIO();
  if (!io) return;
  io.to(gameCode).emit('vote:update', event);
}

// Emit winner declared
export function emitWinnerDeclared(gameCode: string, event: WinnerDeclaredEvent) {
  const io = getIO();
  if (!io) return;
  io.to(gameCode).emit('game:winnerDeclared', event);
}

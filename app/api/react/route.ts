import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/lib/gameState';
import type { ReactionRequest, ReactionResponse, Reaction } from '@/lib/types';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const body: ReactionRequest = await req.json();
    const { gameCode, participantId, reactionType, voterFingerprint } = body;

    if (!gameCode || !participantId || !reactionType || !voterFingerprint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const game = getGame(gameCode);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const participant = game.participants.find(p => p.id === participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Always add new reaction (unlimited reactions - additive)
    const reaction: Reaction = {
      id: nanoid(),
      participantId,
      type: reactionType,
      voterFingerprint,
      timestamp: Date.now(),
    };
    game.reactions.push(reaction);

    // Update participant reaction count (additive)
    participant.reactions[reactionType]++;

    // Emit reaction update via Socket.IO
    const io = (global as { io?: import('socket.io').Server }).io;
    if (io) {
      io.to(game.code).emit('reaction:update', {
        participantId,
        reactions: participant.reactions,
      });
    }

    const response: ReactionResponse = {
      success: true,
      reactions: participant.reactions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/react] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

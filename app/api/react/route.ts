import { NextRequest, NextResponse } from 'next/server';
import { addReaction } from '@/lib/gameStateDB';
import type { ReactionRequest, ReactionResponse } from '@/lib/types';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const body: ReactionRequest = await req.json();
    const { gameCode, participantId, reactionType, voterFingerprint } = body;

    if (!gameCode || !participantId || !reactionType || !voterFingerprint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await addReaction(gameCode, participantId, reactionType, nanoid(), voterFingerprint);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to add reaction' }, { status: 404 });
    }

    // Emit reaction update via Supabase Realtime
    const { emitReactionUpdate } = await import('@/lib/socket');
    await emitReactionUpdate(gameCode, {
      participantId,
      reactions: result.reactions!,
    });

    const response: ReactionResponse = {
      success: true,
      reactions: result.reactions!,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/react] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

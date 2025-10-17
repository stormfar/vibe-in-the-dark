import { NextRequest, NextResponse } from 'next/server';
import { applyTiebreakers } from '@/lib/gameStateDB';
import { emitVoteUpdate } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameCode } = body;

    // Validate inputs
    if (!gameCode) {
      return NextResponse.json(
        { error: 'Missing game code' },
        { status: 400 }
      );
    }

    // Apply tiebreakers
    const result = await applyTiebreakers(gameCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Emit vote updates for all participants that got a bonus point
    for (const { participantId, newVoteCount } of result.updatedParticipants) {
      emitVoteUpdate(gameCode, {
        participantId,
        voteCount: newVoteCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Tiebreakers applied successfully',
      updatedCount: result.updatedParticipants.length,
    });
  } catch (error) {
    console.error('Tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to apply tiebreakers' },
      { status: 500 }
    );
  }
}

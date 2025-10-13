import { NextRequest, NextResponse } from 'next/server';
import { getGame, cancelSabotage, addPromptToHistory } from '@/lib/gameStateDB';
import { emitSabotageApplied } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameCode, participantId } = body as {
      gameCode: string;
      participantId: string;
    };

    // Validate inputs
    if (!gameCode || !participantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get game
    const game = await getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check game status
    if (game.status !== 'active' && game.status !== 'voting') {
      return NextResponse.json(
        { error: 'Cannot cancel sabotage at this time' },
        { status: 400 }
      );
    }

    // Find participant
    const participant = game.participants.find(p => p.id === participantId);
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Check if participant has active sabotages
    if (participant.activeSabotages.length === 0) {
      return NextResponse.json(
        { error: 'You have no active sabotages to cancel' },
        { status: 400 }
      );
    }

    // Check if participant has prompts remaining (only during active game)
    if (game.status === 'active' && participant.promptHistory.length >= game.maxPrompts) {
      return NextResponse.json(
        { error: 'You need at least one prompt remaining to cancel sabotage' },
        { status: 400 }
      );
    }

    // Clear all sabotages for this participant using DB helper
    // We need to clear all types, so call for each active sabotage
    for (const sabotageType of participant.activeSabotages) {
      await cancelSabotage(gameCode, participantId, sabotageType);
    }

    // Add a fake prompt to history to consume one prompt (only during active game)
    if (game.status === 'active') {
      await addPromptToHistory(gameCode, participantId, '[SABOTAGE CANCELLED]');
    }

    // Emit sabotage update (cleared)
    await emitSabotageApplied(gameCode, {
      targetParticipantId: participantId,
      sabotageType: 'comic-sans', // Doesn't matter, will be ignored
      activeSabotages: [], // Empty array = cleared
    });

    console.log(`[Sabotage] ${participant.name} cancelled their sabotages`);

    return NextResponse.json({
      success: true,
      message: 'Sabotages cancelled!',
    });
  } catch (error) {
    console.error('Cancel sabotage error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel sabotage' },
      { status: 500 }
    );
  }
}

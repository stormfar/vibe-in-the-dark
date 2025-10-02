import { NextRequest, NextResponse } from 'next/server';
import { startGame, getGame, moveToActive } from '@/lib/gameState';
import { emitGameStatusUpdate } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { gameCode } = await request.json();

    if (!gameCode) {
      return NextResponse.json(
        { error: 'Missing game code' },
        { status: 400 }
      );
    }

    // Start game (moves to reveal phase)
    const success = startGame(gameCode);

    if (!success) {
      return NextResponse.json(
        { error: 'Could not start game' },
        { status: 400 }
      );
    }

    const game = getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Skip reveal phase - go straight to active
    console.log('Moving directly to active phase (no reveal)');
    moveToActive(gameCode);
    const updatedGame = getGame(gameCode);

    if (!updatedGame) {
      return NextResponse.json(
        { error: 'Game not found after starting' },
        { status: 404 }
      );
    }

    // Emit status update for active phase
    console.log('Emitting game:statusUpdate for active phase');
    emitGameStatusUpdate(gameCode, {
      status: 'active',
      startTime: updatedGame.startTime,
      timeRemaining: updatedGame.duration,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}

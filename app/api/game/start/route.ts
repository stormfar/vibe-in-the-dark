import { NextRequest, NextResponse } from 'next/server';
import { startGame, getGame, moveToActive, openVoting, setGameTimer, clearGameTimer } from '@/lib/gameState';
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

    // Clear any existing timer for this game
    clearGameTimer(gameCode);

    // Set up automatic timer to open voting when duration expires
    const durationMs = updatedGame.duration * 1000;
    console.log(`[Game ${gameCode}] Setting timer for ${updatedGame.duration}s (${durationMs}ms)`);

    const timer = setTimeout(() => {
      console.log(`[Game ${gameCode}] Timer expired! Opening voting automatically`);
      const success = openVoting(gameCode);

      if (success) {
        console.log(`[Game ${gameCode}] Voting opened automatically`);
        const game = getGame(gameCode);
        if (game) {
          emitGameStatusUpdate(gameCode, {
            status: 'voting',
            startTime: game.startTime,
            timeRemaining: 0,
          });
        }
      } else {
        console.error(`[Game ${gameCode}] Failed to open voting automatically`);
      }
    }, durationMs);

    setGameTimer(gameCode, timer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}

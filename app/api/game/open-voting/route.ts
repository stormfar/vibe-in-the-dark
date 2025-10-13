import { NextRequest, NextResponse } from 'next/server';
import { openVoting, getGame } from '@/lib/gameStateDB';
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

    const success = await openVoting(gameCode);

    if (!success) {
      return NextResponse.json(
        { error: 'Could not open voting' },
        { status: 400 }
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Emit status update
    emitGameStatusUpdate(gameCode, {
      status: 'voting',
      startTime: game.startTime,
      timeRemaining: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Open voting error:', error);
    return NextResponse.json(
      { error: 'Failed to open voting' },
      { status: 500 }
    );
  }
}

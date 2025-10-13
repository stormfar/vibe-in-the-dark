import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode');

    if (!gameCode) {
      return NextResponse.json(
        { error: 'Missing game code' },
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

    return NextResponse.json({
      status: game.status,
      code: game.code,
    });
  } catch (error) {
    console.error('Game status error:', error);
    return NextResponse.json(
      { error: 'Failed to get game status' },
      { status: 500 }
    );
  }
}

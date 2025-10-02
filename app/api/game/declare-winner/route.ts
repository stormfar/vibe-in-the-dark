import { NextRequest, NextResponse } from 'next/server';
import { declareWinner } from '@/lib/gameState';
import { emitWinnerDeclared } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { gameCode } = await request.json();

    if (!gameCode) {
      return NextResponse.json(
        { error: 'Missing game code' },
        { status: 400 }
      );
    }

    const result = declareWinner(gameCode);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not declare winner' },
        { status: 400 }
      );
    }

    // Emit winner declared event
    emitWinnerDeclared(gameCode, result);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Declare winner error:', error);
    return NextResponse.json(
      { error: 'Failed to declare winner' },
      { status: 500 }
    );
  }
}

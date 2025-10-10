import { NextRequest, NextResponse } from 'next/server';
import { createGame } from '@/lib/gameState';
import type { CreateGameRequest, CreateGameResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateGameRequest = await request.json();
    const { renderMode, targetType, targetImageUrl, targetText, targetDescription, duration, customCode, maxPrompts, maxCharacters } = body;

    // Validate inputs
    if (!renderMode || !targetType || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate target based on type
    if (targetType === 'image') {
      if (!targetImageUrl) {
        return NextResponse.json(
          { error: 'Missing image URL' },
          { status: 400 }
        );
      }
      if (!targetImageUrl.startsWith('http://') && !targetImageUrl.startsWith('https://')) {
        return NextResponse.json(
          { error: 'That image link is dead. Try another?' },
          { status: 400 }
        );
      }
    } else if (targetType === 'text') {
      if (!targetText || !targetText.trim()) {
        return NextResponse.json(
          { error: 'Missing target description' },
          { status: 400 }
        );
      }
    }

    // Validate duration (max 10 minutes)
    if (duration < 60 || duration > 600) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 10 minutes' },
        { status: 400 }
      );
    }

    // Create the game
    const game = createGame(renderMode, targetType, duration, targetImageUrl, targetText, targetDescription, customCode, maxPrompts, maxCharacters);

    console.log('Game created successfully:', {
      gameCode: game.code,
      status: game.status,
    });

    const response: CreateGameResponse = {
      gameCode: game.code,
      adminUrl: `/admin/game/${game.code}`,
      voterUrl: `/game/${game.code}/vote`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

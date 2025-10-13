import { NextRequest, NextResponse } from 'next/server';
import { getGame, addSabotage } from '@/lib/gameStateDB';
import { emitSabotageApplied } from '@/lib/socket';
import { v4 as uuidv4 } from 'uuid';
import type { SabotageType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameCode, sourceParticipantId, targetParticipantId, sabotageType } = body as {
      gameCode: string;
      sourceParticipantId: string;
      targetParticipantId: string;
      sabotageType: SabotageType;
    };

    // Validate inputs
    if (!gameCode || !sourceParticipantId || !targetParticipantId || !sabotageType) {
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

    // Check sabotage mode is enabled
    if (!game.sabotageMode) {
      return NextResponse.json(
        { error: 'Sabotage mode is not enabled for this game' },
        { status: 400 }
      );
    }

    // Check game status
    if (game.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      );
    }

    // Find source participant
    const sourceParticipant = game.participants.find(p => p.id === sourceParticipantId);
    if (!sourceParticipant) {
      return NextResponse.json(
        { error: 'Source participant not found' },
        { status: 404 }
      );
    }

    // Check if source has already used sabotage
    if (sourceParticipant.sabotageUsed) {
      return NextResponse.json(
        { error: 'You have already used your sabotage!' },
        { status: 400 }
      );
    }

    // Check if source has prompts remaining
    if (sourceParticipant.promptHistory.length >= game.maxPrompts) {
      return NextResponse.json(
        { error: 'You need at least one prompt remaining to use sabotage' },
        { status: 400 }
      );
    }

    // Find target participant
    const targetParticipant = game.participants.find(p => p.id === targetParticipantId);
    if (!targetParticipant) {
      return NextResponse.json(
        { error: 'Target participant not found' },
        { status: 404 }
      );
    }

    // Can't sabotage yourself
    if (sourceParticipantId === targetParticipantId) {
      return NextResponse.json(
        { error: 'You cannot sabotage yourself!' },
        { status: 400 }
      );
    }

    // Apply sabotage using DB helper
    const result = await addSabotage(gameCode, targetParticipantId, sourceParticipantId, sabotageType, uuidv4());

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to apply sabotage' },
        { status: 400 }
      );
    }

    // Emit sabotage event to target
    await emitSabotageApplied(gameCode, {
      targetParticipantId,
      sabotageType,
      activeSabotages: result.activeSabotages!,
    });

    console.log(`[Sabotage] ${sourceParticipant.name} sabotaged ${targetParticipant.name} with ${sabotageType}`);

    return NextResponse.json({
      success: true,
      message: `Sabotage applied to ${targetParticipant.name}!`,
    });
  } catch (error) {
    console.error('Sabotage error:', error);
    return NextResponse.json(
      { error: 'Failed to apply sabotage' },
      { status: 500 }
    );
  }
}

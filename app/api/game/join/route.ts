import { NextRequest, NextResponse } from 'next/server';
import { getGame, addParticipant } from '@/lib/gameState';
import { emitParticipantJoined } from '@/lib/socket';
import type { JoinGameRequest, JoinGameResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: JoinGameRequest = await request.json();
    const { gameCode, participantName } = body;

    // Validate inputs
    if (!gameCode || !participantName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate name length
    if (participantName.length < 2) {
      return NextResponse.json(
        { error: 'Too short. We need at least 2 letters.' },
        { status: 400 }
      );
    }

    if (participantName.length > 20) {
      return NextResponse.json(
        { error: 'Brevity, friend. Keep it under 20.' },
        { status: 400 }
      );
    }

    // Get game by code
    const game = getGame(gameCode);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found. Check that code again?' },
        { status: 404 }
      );
    }

    // Check game status
    if (game.status !== 'lobby') {
      return NextResponse.json(
        { error: 'Game has already started or ended' },
        { status: 400 }
      );
    }

    // Add participant (temporary socketId will be updated when they connect)
    const participant = addParticipant(game.code, participantName, 'temp-socket-id');

    if (!participant) {
      return NextResponse.json(
        { error: 'Could not join game. Name might be taken or game is full.' },
        { status: 400 }
      );
    }

    // Emit participant joined event
    emitParticipantJoined(game.code, {
      participant: {
        id: participant.id,
        name: participant.name,
      },
    });

    const response: JoinGameResponse = {
      gameCode: game.code,
      participantId: participant.id,
      playUrl: `/game/${game.code}/play`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { addVote, removeVote } from '@/lib/gameState';
import { emitVoteUpdate } from '@/lib/socket';
import type { VoteRequest, VoteResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: VoteRequest = await request.json();
    const { gameCode, participantId, voterFingerprint } = body;

    // Validate inputs
    if (!gameCode || !participantId || !voterFingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add vote
    const result = addVote(gameCode, participantId, voterFingerprint);

    if (!result.success) {
      const statusCode = result.error === 'Voting not open yet' ? 400 : 403;
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    // Emit vote update
    emitVoteUpdate(gameCode, {
      participantId,
      voteCount: result.voteCount,
    });

    const response: VoteResponse = {
      success: true,
      newVoteCount: result.voteCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameCode, voterFingerprint } = body;

    // Validate inputs
    if (!gameCode || !voterFingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Remove vote
    const result = removeVote(gameCode, voterFingerprint);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Emit vote update
    if (result.participantId && result.voteCount !== undefined) {
      emitVoteUpdate(gameCode, {
        participantId: result.participantId,
        voteCount: result.voteCount,
      });
    }

    const response: VoteResponse = {
      success: true,
      newVoteCount: result.voteCount || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Vote undo error:', error);
    return NextResponse.json(
      { error: 'Failed to undo vote' },
      { status: 500 }
    );
  }
}

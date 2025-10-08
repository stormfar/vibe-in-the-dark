import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateParticipantCode, addPromptToHistory } from '@/lib/gameState';
import { processPrompt } from '@/lib/claude';
import { emitPreviewUpdate } from '@/lib/socket';
import type { PromptRequest, PromptResponse } from '@/lib/types';

// Rate limiting: simple in-memory store
const promptTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 3000; // 3 seconds

export async function POST(request: NextRequest) {
  try {
    const body: PromptRequest = await request.json();
    const { gameCode, participantId, prompt } = body;

    // Validate inputs
    if (!gameCode || !participantId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get game
    const game = getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check game status
    if (game.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
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

    // Check if participant has reached max prompts
    if (participant.promptHistory.length >= game.maxPrompts) {
      return NextResponse.json(
        { error: `You've reached the maximum of ${game.maxPrompts} prompts!` },
        { status: 400 }
      );
    }

    // Check if prompt exceeds max characters
    if (prompt.length > game.maxCharacters) {
      return NextResponse.json(
        { error: `Prompt exceeds ${game.maxCharacters} character limit!` },
        { status: 400 }
      );
    }

    // Rate limiting
    const key = `${gameCode}:${participantId}`;
    const lastPromptTime = promptTimestamps.get(key) || 0;
    const now = Date.now();

    if (now - lastPromptTime < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Slow down! Claude needs to breathe.' },
        { status: 429 }
      );
    }

    promptTimestamps.set(key, now);

    // Process prompt with Claude
    const result = await processPrompt(
      prompt,
      participant.currentCode.html,
      participant.currentCode.css
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Update participant code
    updateParticipantCode(gameCode, participantId, result.html, result.css);

    // Add to prompt history
    addPromptToHistory(gameCode, participantId, prompt);

    // Get updated game to fetch current prompt count
    const updatedGame = getGame(gameCode);
    const updatedParticipant = updatedGame?.participants.find(p => p.id === participantId);
    const promptCount = updatedParticipant?.promptHistory.length || 0;

    // Emit preview update
    emitPreviewUpdate(gameCode, {
      participantId,
      html: result.html,
      css: result.css,
      promptCount,
    });

    const response: PromptResponse = {
      html: result.html,
      css: result.css,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Prompt processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process prompt' },
      { status: 500 }
    );
  }
}

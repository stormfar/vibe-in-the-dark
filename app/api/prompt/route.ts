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

    // Process prompt with Claude (handle both modes)
    const result = await processPrompt(
      prompt,
      game.renderMode,
      participant.currentCode.html,
      participant.currentCode.css,
      participant.currentCode.jsx
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Update participant code based on mode
    if (game.renderMode === 'retro' && result.html !== undefined && result.css !== undefined) {
      updateParticipantCode(gameCode, participantId, result.html, result.css);
    } else if (game.renderMode === 'turbo' && result.jsx !== undefined) {
      updateParticipantCode(gameCode, participantId, undefined, undefined, result.jsx);
    }

    // Add to prompt history
    addPromptToHistory(gameCode, participantId, prompt);

    // Get updated game to fetch current prompt count
    const updatedGame = getGame(gameCode);
    const updatedParticipant = updatedGame?.participants.find(p => p.id === participantId);
    const promptCount = updatedParticipant?.promptHistory.length || 0;

    // Emit preview update (handle both modes)
    emitPreviewUpdate(gameCode, {
      participantId,
      html: result.html,
      css: result.css,
      jsx: result.jsx,
      promptCount,
    });

    const response: PromptResponse = game.renderMode === 'retro'
      ? { html: result.html, css: result.css }
      : { jsx: result.jsx };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Prompt processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process prompt' },
      { status: 500 }
    );
  }
}

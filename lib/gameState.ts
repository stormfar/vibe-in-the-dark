import { v4 as uuidv4 } from 'uuid';
import type { Game, Participant, Vote, RenderMode } from './types';

// In-memory storage - use global to ensure same instance across all imports
// This is necessary because Next.js API routes and the custom server may load this module separately
declare global {
  var games: Map<string, Game> | undefined;
  var gameTimers: Map<string, NodeJS.Timeout> | undefined;
}

const games = global.games || (global.games = new Map<string, Game>());
const gameTimers = global.gameTimers || (global.gameTimers = new Map<string, NodeJS.Timeout>());

// Generate unique 4-character game code
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game
export function createGame(
  renderMode: RenderMode,
  targetType: 'image' | 'text',
  duration: number,
  targetImageUrl?: string,
  targetText?: string,
  targetDescription?: string,
  customCode?: string,
  maxPrompts?: number,
  maxCharacters?: number
): Game {
  let code = customCode?.toUpperCase() || generateGameCode();

  // Ensure unique code
  while (games.has(code)) {
    if (customCode) {
      throw new Error('Custom game code already in use');
    }
    code = generateGameCode();
  }

  const game: Game = {
    code,
    status: 'lobby',
    renderMode,
    targetType,
    targetImageUrl,
    targetText,
    targetDescription: targetDescription || 'recreate this',
    duration,
    maxPrompts: maxPrompts ?? 3, // Default to 3
    maxCharacters: maxCharacters ?? 1000, // Default to 1000
    startTime: null,
    votingStartTime: null,
    createdAt: Date.now(),
    participants: [],
    votes: [],
    reactions: [],
    winnerId: null,
  };

  games.set(code, game);

  console.log(`[gameState] Game stored. Total games: ${games.size}`);
  console.log(`[gameState] Game codes in memory:`, Array.from(games.keys()));

  return game;
}

// Get game by code (only method needed now)
export function getGame(code: string): Game | undefined {
  const upperCode = code.toUpperCase();
  return games.get(upperCode);
}

// Add participant to game
export function addParticipant(
  gameCode: string,
  participantName: string,
  socketId: string
): Participant | null {
  const game = games.get(gameCode.toUpperCase());
  if (!game) return null;

  // Check for duplicate names
  if (game.participants.some(p => p.name.toLowerCase() === participantName.toLowerCase())) {
    return null;
  }

  // Max 20 participants
  if (game.participants.length >= 20) {
    return null;
  }

  // Initialize code based on render mode
  const currentCode = game.renderMode === 'retro'
    ? {
        html: '<div style="display: flex; align-items: center; justify-content: center; height: 100vh;"><h1>Start proompting!</h1></div>',
        css: '',
      }
    : {
        jsx: `export default function Component() {\n  return (\n    <div className="flex items-center justify-center h-full">\n      <h1 className="text-4xl font-bold">Start proompting!</h1>\n    </div>\n  );\n}`,
      };

  const participant: Participant = {
    id: uuidv4(),
    name: participantName,
    socketId,
    currentCode,
    promptHistory: [],
    reactions: { fire: 0, laugh: 0, think: 0, shock: 0, cool: 0 },
    voteCount: 0,
    joinedAt: Date.now(),
  };

  game.participants.push(participant);
  return participant;
}

// Update participant code (handles both retro and turbo modes)
export function updateParticipantCode(
  gameCode: string,
  participantId: string,
  html?: string,
  css?: string,
  jsx?: string
): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game) return false;

  const participant = game.participants.find(p => p.id === participantId);
  if (!participant) return false;

  // Update based on what's provided
  if (game.renderMode === 'retro' && html !== undefined && css !== undefined) {
    participant.currentCode = { html, css };
  } else if (game.renderMode === 'turbo' && jsx !== undefined) {
    participant.currentCode = { jsx };
  }

  return true;
}

// Add prompt to history
export function addPromptToHistory(
  gameCode: string,
  participantId: string,
  prompt: string
): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game) return false;

  const participant = game.participants.find(p => p.id === participantId);
  if (!participant) return false;

  participant.promptHistory.push({
    prompt,
    timestamp: Date.now(),
  });

  return true;
}

// Start game (move to reveal phase)
export function startGame(gameCode: string): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game || game.status !== 'lobby') return false;

  game.status = 'reveal';
  game.startTime = Date.now();

  return true;
}

// Move from reveal to active
export function moveToActive(gameCode: string): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game || game.status !== 'reveal') return false;

  game.status = 'active';
  return true;
}

// Open voting
export function openVoting(gameCode: string): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game || game.status !== 'active') return false;

  game.status = 'voting';
  game.votingStartTime = Date.now();

  // Clear old votes from previous game sessions
  game.votes = [];

  // Reset vote counts for all participants
  game.participants.forEach(p => {
    p.voteCount = 0;
  });

  // Clear any pending auto-open timer since we're manually opening voting
  clearGameTimer(gameCode);

  console.log('[openVoting] Cleared votes and reset vote counts for fresh voting session');

  return true;
}

// Timer management functions
export function setGameTimer(gameCode: string, timer: NodeJS.Timeout): void {
  gameTimers.set(gameCode.toUpperCase(), timer);
}

export function clearGameTimer(gameCode: string): void {
  const timer = gameTimers.get(gameCode.toUpperCase());
  if (timer) {
    clearTimeout(timer);
    gameTimers.delete(gameCode.toUpperCase());
    console.log(`[Timer] Cleared timer for game ${gameCode}`);
  }
}

export function getGameTimer(gameCode: string): NodeJS.Timeout | undefined {
  return gameTimers.get(gameCode.toUpperCase());
}

// Add vote
export function addVote(
  gameCode: string,
  participantId: string,
  voterFingerprint: string
): { success: boolean; voteCount: number; error?: string } {
  const game = games.get(gameCode.toUpperCase());
  if (!game) {
    return { success: false, voteCount: 0, error: 'Game not found' };
  }

  if (game.status !== 'voting') {
    return { success: false, voteCount: 0, error: 'Voting not open yet' };
  }

  // Check if already voted
  const alreadyVoted = game.votes.some(v => v.voterFingerprint === voterFingerprint);
  console.log('[addVote] Checking if already voted:', {
    voterFingerprint,
    alreadyVoted,
    existingVotes: game.votes.map(v => ({ fp: v.voterFingerprint, participantId: v.participantId })),
  });
  if (alreadyVoted) {
    return { success: false, voteCount: 0, error: 'You already voted, greedy!' };
  }

  // Check participant exists
  const participant = game.participants.find(p => p.id === participantId);
  if (!participant) {
    return { success: false, voteCount: 0, error: 'Participant not found' };
  }

  // Add vote
  const vote: Vote = {
    id: uuidv4(),
    participantId,
    voterFingerprint,
    timestamp: Date.now(),
  };

  game.votes.push(vote);
  participant.voteCount += 1;

  return { success: true, voteCount: participant.voteCount };
}

// Remove vote
export function removeVote(
  gameCode: string,
  voterFingerprint: string
): { success: boolean; participantId?: string; voteCount?: number; error?: string } {
  const game = games.get(gameCode.toUpperCase());
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.status !== 'voting' && game.status !== 'finished') {
    return { success: false, error: 'Cannot undo vote at this time' };
  }

  // Find the vote
  const voteIndex = game.votes.findIndex(v => v.voterFingerprint === voterFingerprint);
  console.log('[removeVote] Looking for vote to remove:', {
    voterFingerprint,
    voteIndex,
    totalVotes: game.votes.length,
  });
  if (voteIndex === -1) {
    return { success: false, error: 'No vote found to undo' };
  }

  const vote = game.votes[voteIndex];
  const participant = game.participants.find(p => p.id === vote.participantId);
  if (!participant) {
    return { success: false, error: 'Participant not found' };
  }

  // Remove vote
  game.votes.splice(voteIndex, 1);
  participant.voteCount = Math.max(0, participant.voteCount - 1);
  console.log('[removeVote] Successfully removed vote. Remaining votes:', game.votes.length);

  return {
    success: true,
    participantId: participant.id,
    voteCount: participant.voteCount,
  };
}

// Declare winner
export function declareWinner(gameCode: string): {
  winnerId: string;
  finalStandings: { participantId: string; name: string; voteCount: number }[];
} | null {
  const game = games.get(gameCode.toUpperCase());
  if (!game || game.status !== 'voting') return null;

  // Sort participants by vote count
  const standings = [...game.participants]
    .sort((a, b) => b.voteCount - a.voteCount)
    .map(p => ({
      participantId: p.id,
      name: p.name,
      voteCount: p.voteCount,
    }));

  const winnerId = standings[0]?.participantId || '';

  game.status = 'finished';
  game.winnerId = winnerId;

  return {
    winnerId,
    finalStandings: standings,
  };
}

// End game manually
export function endGame(gameCode: string): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game) return false;

  game.status = 'finished';
  return true;
}

// Update participant socket ID
export function updateParticipantSocket(
  gameCode: string,
  participantId: string,
  socketId: string
): boolean {
  const game = games.get(gameCode.toUpperCase());
  if (!game) return false;

  const participant = game.participants.find(p => p.id === participantId);
  if (!participant) return false;

  participant.socketId = socketId;
  return true;
}

// Cleanup old games (runs periodically)
export function cleanupOldGames(): number {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  let removed = 0;

  for (const [gameCode, game] of games.entries()) {
    if (now - game.createdAt > TWO_HOURS) {
      games.delete(gameCode);
      removed++;
    }
  }

  return removed;
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldGames, 10 * 60 * 1000); // Every 10 minutes
}

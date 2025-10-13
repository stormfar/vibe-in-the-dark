import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { Game, Participant, Vote, RenderMode } from './types';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
export async function createGame(
  renderMode: RenderMode,
  targetType: 'image' | 'text',
  duration: number,
  targetImageUrl?: string,
  targetText?: string,
  targetDescription?: string,
  sabotageMode?: boolean,
  customCode?: string,
  maxPrompts?: number,
  maxCharacters?: number
): Promise<Game> {
  let code = customCode?.toUpperCase() || generateGameCode();

  // Ensure unique code
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('games')
      .select('code, game_data')
      .eq('code', code)
      .single();

    if (!existing) break;

    // If custom code exists, check if it's finished - if so, delete it and reuse
    if (customCode) {
      const existingGame = existing.game_data as Game;
      if (existingGame.status === 'finished') {
        console.log(`[gameStateDB] Deleting finished game with code ${code} to allow reuse`);
        await deleteGame(code);
        break; // Code is now available
      } else {
        throw new Error('Custom game code already in use by an active game');
      }
    }

    code = generateGameCode();
    attempts++;
  }

  if (attempts >= 10) {
    throw new Error('Failed to generate unique game code');
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
    maxPrompts: maxPrompts ?? 3,
    maxCharacters: maxCharacters ?? 1000,
    sabotageMode: sabotageMode ?? false,
    startTime: null,
    votingStartTime: null,
    createdAt: Date.now(),
    participants: [],
    votes: [],
    reactions: [],
    sabotages: [],
    winnerId: null,
  };

  const { error } = await supabase.from('games').insert([
    {
      code,
      game_data: game,
      created_at: game.createdAt,
    },
  ]);

  if (error) {
    console.error('[gameStateDB] Error creating game:', error);
    throw new Error('Failed to create game');
  }

  console.log(`[gameStateDB] Game created: ${code}`);
  return game;
}

// Get game by code (with version for optimistic locking)
export async function getGame(code: string): Promise<Game | undefined> {
  const upperCode = code.toUpperCase();

  const { data, error } = await supabase
    .from('games')
    .select('game_data, version')
    .eq('code', upperCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return undefined;
    }
    console.error('[gameStateDB] Error fetching game:', error);
    return undefined;
  }

  const game = data?.game_data as Game;
  // Store version in a non-enumerable property so it doesn't pollute the Game object
  if (game) {
    Object.defineProperty(game, '__version', {
      value: data.version,
      writable: false,
      enumerable: false,
    });
  }
  return game;
}

// Update game in database with optimistic locking
async function updateGame(game: Game, maxRetries = 3): Promise<boolean> {
  const currentVersion = (game as any).__version;

  if (currentVersion === undefined) {
    console.warn('[gameStateDB] No version found on game object, update may fail');
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data, error } = await supabase
      .from('games')
      .update({
        game_data: game,
      })
      .eq('code', game.code)
      .eq('version', currentVersion)
      .select('version')
      .single();

    if (!error && data) {
      // Success! Update the version on the game object for future updates
      Object.defineProperty(game, '__version', {
        value: data.version,
        writable: false,
        enumerable: false,
      });
      return true;
    }

    if (error && error.code === 'PGRST116') {
      // Version mismatch (race condition detected) - retry
      console.log(`[gameStateDB] Version conflict detected, retrying (attempt ${attempt + 1}/${maxRetries})`);

      // Fetch latest version of the game
      const latestGame = await getGame(game.code);
      if (!latestGame) {
        console.error('[gameStateDB] Game disappeared during retry');
        return false;
      }

      // Re-apply our changes to the latest version
      // Note: This is a simple merge - caller should handle conflicts if needed
      Object.assign(latestGame, game);
      game = latestGame;
      continue;
    }

    // Other error - log and fail
    console.error('[gameStateDB] Error updating game:', error);
    return false;
  }

  console.error('[gameStateDB] Failed to update game after maximum retries');
  return false;
}

// Add participant to game
export async function addParticipant(
  gameCode: string,
  participantName: string,
  socketId: string
): Promise<Participant | null> {
  const game = await getGame(gameCode);
  if (!game) return null;

  // Check for duplicate names
  if (game.participants.some((p) => p.name.toLowerCase() === participantName.toLowerCase())) {
    return null;
  }

  // Max 20 participants
  if (game.participants.length >= 20) {
    return null;
  }

  // Initialize code based on render mode
  const currentCode =
    game.renderMode === 'retro'
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
    sabotageUsed: false,
    activeSabotages: [],
  };

  game.participants.push(participant);
  await updateGame(game);

  return participant;
}

// Update participant code
export async function updateParticipantCode(
  gameCode: string,
  participantId: string,
  html?: string,
  css?: string,
  jsx?: string
): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game) return false;

  const participant = game.participants.find((p) => p.id === participantId);
  if (!participant) return false;

  // Update based on what's provided
  if (game.renderMode === 'retro' && html !== undefined && css !== undefined) {
    participant.currentCode = { html, css };
  } else if (game.renderMode === 'turbo' && jsx !== undefined) {
    participant.currentCode = { jsx };
  }

  return await updateGame(game);
}

// Add prompt to history
export async function addPromptToHistory(
  gameCode: string,
  participantId: string,
  prompt: string
): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game) return false;

  const participant = game.participants.find((p) => p.id === participantId);
  if (!participant) return false;

  participant.promptHistory.push({
    prompt,
    timestamp: Date.now(),
  });

  return await updateGame(game);
}

// Start game (move to reveal phase)
export async function startGame(gameCode: string): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game || game.status !== 'lobby') return false;

  game.status = 'reveal';
  game.startTime = Date.now();

  return await updateGame(game);
}

// Move from reveal to active
export async function moveToActive(gameCode: string): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game || game.status !== 'reveal') return false;

  game.status = 'active';
  return await updateGame(game);
}

// Open voting
export async function openVoting(gameCode: string): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game || game.status !== 'active') return false;

  game.status = 'voting';
  game.votingStartTime = Date.now();

  // Clear old votes from previous game sessions
  game.votes = [];

  // Reset vote counts for all participants
  game.participants.forEach((p) => {
    p.voteCount = 0;
  });

  console.log('[openVoting] Cleared votes and reset vote counts for fresh voting session');

  return await updateGame(game);
}

// Add vote
export async function addVote(
  gameCode: string,
  participantId: string,
  voterFingerprint: string
): Promise<{ success: boolean; voteCount: number; error?: string }> {
  const game = await getGame(gameCode);
  if (!game) {
    return { success: false, voteCount: 0, error: 'Game not found' };
  }

  if (game.status !== 'voting') {
    return { success: false, voteCount: 0, error: 'Voting not open yet' };
  }

  // Check if already voted
  const alreadyVoted = game.votes.some((v) => v.voterFingerprint === voterFingerprint);
  console.log('[addVote] Checking if already voted:', {
    voterFingerprint,
    alreadyVoted,
    existingVotes: game.votes.map((v) => ({ fp: v.voterFingerprint, participantId: v.participantId })),
  });

  if (alreadyVoted) {
    return { success: false, voteCount: 0, error: 'You already voted, greedy!' };
  }

  // Check participant exists
  const participant = game.participants.find((p) => p.id === participantId);
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

  await updateGame(game);

  return { success: true, voteCount: participant.voteCount };
}

// Remove vote
export async function removeVote(
  gameCode: string,
  voterFingerprint: string
): Promise<{ success: boolean; participantId?: string; voteCount?: number; error?: string }> {
  const game = await getGame(gameCode);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.status !== 'voting' && game.status !== 'finished') {
    return { success: false, error: 'Cannot undo vote at this time' };
  }

  // Find the vote
  const voteIndex = game.votes.findIndex((v) => v.voterFingerprint === voterFingerprint);
  console.log('[removeVote] Looking for vote to remove:', {
    voterFingerprint,
    voteIndex,
    totalVotes: game.votes.length,
  });

  if (voteIndex === -1) {
    return { success: false, error: 'No vote found to undo' };
  }

  const vote = game.votes[voteIndex];
  const participant = game.participants.find((p) => p.id === vote.participantId);
  if (!participant) {
    return { success: false, error: 'Participant not found' };
  }

  // Remove vote
  game.votes.splice(voteIndex, 1);
  participant.voteCount = Math.max(0, participant.voteCount - 1);
  console.log('[removeVote] Successfully removed vote. Remaining votes:', game.votes.length);

  await updateGame(game);

  return {
    success: true,
    participantId: participant.id,
    voteCount: participant.voteCount,
  };
}

// Declare winner
export async function declareWinner(
  gameCode: string,
  autoDeleteAfterMinutes?: number
): Promise<{
  winnerId: string;
  finalStandings: { participantId: string; name: string; voteCount: number }[];
} | null> {
  const game = await getGame(gameCode);
  if (!game || game.status !== 'voting') return null;

  // Sort participants by vote count
  const standings = [...game.participants]
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((p) => ({
      participantId: p.id,
      name: p.name,
      voteCount: p.voteCount,
    }));

  const winnerId = standings[0]?.participantId || '';

  game.status = 'finished';
  game.winnerId = winnerId;

  await updateGame(game);

  // Optional: Schedule auto-deletion after X minutes to free up custom codes
  if (autoDeleteAfterMinutes && autoDeleteAfterMinutes > 0) {
    const deleteAfterMs = autoDeleteAfterMinutes * 60 * 1000;
    console.log(`[gameStateDB] Scheduling deletion of game ${gameCode} in ${autoDeleteAfterMinutes} minutes`);

    setTimeout(async () => {
      console.log(`[gameStateDB] Auto-deleting finished game ${gameCode}`);
      await deleteGame(gameCode);
    }, deleteAfterMs);
  }

  return {
    winnerId,
    finalStandings: standings,
  };
}

// End game manually
export async function endGame(gameCode: string): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game) return false;

  game.status = 'finished';
  return await updateGame(game);
}

// Update participant socket ID
export async function updateParticipantSocket(
  gameCode: string,
  participantId: string,
  socketId: string
): Promise<boolean> {
  const game = await getGame(gameCode);
  if (!game) return false;

  const participant = game.participants.find((p) => p.id === participantId);
  if (!participant) return false;

  participant.socketId = socketId;
  return await updateGame(game);
}

// Delete a game from the database
export async function deleteGame(gameCode: string): Promise<boolean> {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('code', gameCode.toUpperCase());

  if (error) {
    console.error('[gameStateDB] Error deleting game:', error);
    return false;
  }

  console.log(`[gameStateDB] Deleted game: ${gameCode}`);
  return true;
}

// Add reaction
export async function addReaction(
  gameCode: string,
  participantId: string,
  reactionType: string,
  reactionId: string,
  voterFingerprint: string
): Promise<{ success: boolean; reactions?: Record<string, number>; error?: string }> {
  const game = await getGame(gameCode);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const participant = game.participants.find((p) => p.id === participantId);
  if (!participant) {
    return { success: false, error: 'Participant not found' };
  }

  // Add reaction to game
  const reaction = {
    id: reactionId,
    participantId,
    type: reactionType as any,
    voterFingerprint,
    timestamp: Date.now(),
  };
  game.reactions.push(reaction);

  // Update participant reaction count
  participant.reactions[reactionType as keyof typeof participant.reactions]++;

  await updateGame(game);

  return { success: true, reactions: participant.reactions };
}

// Add sabotage
export async function addSabotage(
  gameCode: string,
  targetParticipantId: string,
  sourceParticipantId: string,
  sabotageType: string,
  sabotageId: string
): Promise<{ success: boolean; activeSabotages?: any[]; error?: string }> {
  const game = await getGame(gameCode);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const targetParticipant = game.participants.find((p) => p.id === targetParticipantId);
  const sourceParticipant = game.participants.find((p) => p.id === sourceParticipantId);

  if (!targetParticipant || !sourceParticipant) {
    return { success: false, error: 'Participant not found' };
  }

  // Add sabotage event
  const sabotage = {
    id: sabotageId,
    type: sabotageType as any,
    targetParticipantId,
    sourceParticipantId,
    timestamp: Date.now(),
  };
  game.sabotages.push(sabotage);

  // Update target participant
  targetParticipant.activeSabotages.push(sabotageType as any);

  // Mark source as having used sabotage
  sourceParticipant.sabotageUsed = true;

  await updateGame(game);

  return { success: true, activeSabotages: targetParticipant.activeSabotages };
}

// Cancel sabotage
export async function cancelSabotage(
  gameCode: string,
  participantId: string,
  sabotageType: string
): Promise<{ success: boolean; activeSabotages?: any[]; error?: string }> {
  const game = await getGame(gameCode);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const participant = game.participants.find((p) => p.id === participantId);
  if (!participant) {
    return { success: false, error: 'Participant not found' };
  }

  // Remove sabotage from active sabotages
  participant.activeSabotages = participant.activeSabotages.filter((s) => s !== sabotageType) as any[];

  await updateGame(game);

  return { success: true, activeSabotages: participant.activeSabotages };
}

// Cleanup old games (runs periodically)
export async function cleanupOldGames(): Promise<number> {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - TWO_HOURS;

  const { data: oldGames, error: selectError } = await supabase
    .from('games')
    .select('code')
    .lt('created_at', cutoffTime);

  if (selectError) {
    console.error('[gameStateDB] Error finding old games:', selectError);
    return 0;
  }

  if (!oldGames || oldGames.length === 0) return 0;

  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .lt('created_at', cutoffTime);

  if (deleteError) {
    console.error('[gameStateDB] Error cleaning up old games:', deleteError);
    return 0;
  }

  console.log(`[gameStateDB] Cleaned up ${oldGames.length} old games`);
  return oldGames.length;
}

// Timer management (kept in memory as they're ephemeral)
declare global {
  var gameTimers: Map<string, NodeJS.Timeout> | undefined;
}

const gameTimers = global.gameTimers || (global.gameTimers = new Map<string, NodeJS.Timeout>());

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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
exports.getGame = getGame;
exports.addParticipant = addParticipant;
exports.updateParticipantCode = updateParticipantCode;
exports.addPromptToHistory = addPromptToHistory;
exports.startGame = startGame;
exports.moveToActive = moveToActive;
exports.openVoting = openVoting;
exports.addVote = addVote;
exports.removeVote = removeVote;
exports.declareWinner = declareWinner;
exports.endGame = endGame;
exports.updateParticipantSocket = updateParticipantSocket;
exports.cleanupOldGames = cleanupOldGames;
const uuid_1 = require("uuid");
const games = global.games || (global.games = new Map());
// Generate unique 6-character game code
function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
// Create a new game
function createGame(targetType, duration, targetImageUrl, targetText, customCode, anthropicApiKey, maxPrompts, maxCharacters) {
    let code = (customCode === null || customCode === void 0 ? void 0 : customCode.toUpperCase()) || generateGameCode();
    // Ensure unique code
    while (games.has(code)) {
        if (customCode) {
            throw new Error('Custom game code already in use');
        }
        code = generateGameCode();
    }
    const game = {
        code,
        status: 'lobby',
        targetType,
        targetImageUrl,
        targetText,
        duration,
        maxPrompts: maxPrompts !== null && maxPrompts !== void 0 ? maxPrompts : 3, // Default to 3
        maxCharacters: maxCharacters !== null && maxCharacters !== void 0 ? maxCharacters : 1000, // Default to 1000
        anthropicApiKey,
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
function getGame(code) {
    const upperCode = code.toUpperCase();
    console.log(`[gameState] Looking for game ${upperCode}. Total games in memory: ${games.size}`);
    console.log(`[gameState] Available game codes:`, Array.from(games.keys()));
    return games.get(upperCode);
}
// Add participant to game
function addParticipant(gameCode, participantName, socketId) {
    const game = games.get(gameCode.toUpperCase());
    if (!game)
        return null;
    // Check for duplicate names
    if (game.participants.some(p => p.name.toLowerCase() === participantName.toLowerCase())) {
        return null;
    }
    // Max 20 participants
    if (game.participants.length >= 20) {
        return null;
    }
    const participant = {
        id: (0, uuid_1.v4)(),
        name: participantName,
        socketId,
        currentCode: {
            html: '<div style="display: flex; align-items: center; justify-content: center; height: 100vh;"><h1>Start prompting!</h1></div>',
            css: '',
        },
        promptHistory: [],
        reactions: { fire: 0, laugh: 0, think: 0, shock: 0, cool: 0 },
        voteCount: 0,
        joinedAt: Date.now(),
    };
    game.participants.push(participant);
    return participant;
}
// Update participant code
function updateParticipantCode(gameCode, participantId, html, css) {
    const game = games.get(gameCode.toUpperCase());
    if (!game)
        return false;
    const participant = game.participants.find(p => p.id === participantId);
    if (!participant)
        return false;
    participant.currentCode = { html, css };
    return true;
}
// Add prompt to history
function addPromptToHistory(gameCode, participantId, prompt) {
    const game = games.get(gameCode.toUpperCase());
    if (!game)
        return false;
    const participant = game.participants.find(p => p.id === participantId);
    if (!participant)
        return false;
    participant.promptHistory.push({
        prompt,
        timestamp: Date.now(),
    });
    return true;
}
// Start game (move to reveal phase)
function startGame(gameCode) {
    const game = games.get(gameCode.toUpperCase());
    if (!game || game.status !== 'lobby')
        return false;
    game.status = 'reveal';
    game.startTime = Date.now();
    return true;
}
// Move from reveal to active
function moveToActive(gameCode) {
    const game = games.get(gameCode.toUpperCase());
    if (!game || game.status !== 'reveal')
        return false;
    game.status = 'active';
    return true;
}
// Open voting
function openVoting(gameCode) {
    const game = games.get(gameCode.toUpperCase());
    if (!game || game.status !== 'active')
        return false;
    game.status = 'voting';
    game.votingStartTime = Date.now();
    return true;
}
// Add vote
function addVote(gameCode, participantId, voterFingerprint) {
    const game = games.get(gameCode.toUpperCase());
    if (!game) {
        return { success: false, voteCount: 0, error: 'Game not found' };
    }
    if (game.status !== 'voting') {
        return { success: false, voteCount: 0, error: 'Voting not open yet' };
    }
    // Check if already voted
    if (game.votes.some(v => v.voterFingerprint === voterFingerprint)) {
        return { success: false, voteCount: 0, error: 'You already voted, greedy!' };
    }
    // Check participant exists
    const participant = game.participants.find(p => p.id === participantId);
    if (!participant) {
        return { success: false, voteCount: 0, error: 'Participant not found' };
    }
    // Add vote
    const vote = {
        id: (0, uuid_1.v4)(),
        participantId,
        voterFingerprint,
        timestamp: Date.now(),
    };
    game.votes.push(vote);
    participant.voteCount += 1;
    return { success: true, voteCount: participant.voteCount };
}
// Remove vote
function removeVote(gameCode, voterFingerprint) {
    const game = games.get(gameCode.toUpperCase());
    if (!game) {
        return { success: false, error: 'Game not found' };
    }
    if (game.status !== 'voting' && game.status !== 'finished') {
        return { success: false, error: 'Cannot undo vote at this time' };
    }
    // Find the vote
    const voteIndex = game.votes.findIndex(v => v.voterFingerprint === voterFingerprint);
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
    return {
        success: true,
        participantId: participant.id,
        voteCount: participant.voteCount,
    };
}
// Declare winner
function declareWinner(gameCode) {
    var _a;
    const game = games.get(gameCode.toUpperCase());
    if (!game || game.status !== 'voting')
        return null;
    // Sort participants by vote count
    const standings = [...game.participants]
        .sort((a, b) => b.voteCount - a.voteCount)
        .map(p => ({
        participantId: p.id,
        name: p.name,
        voteCount: p.voteCount,
    }));
    const winnerId = ((_a = standings[0]) === null || _a === void 0 ? void 0 : _a.participantId) || '';
    game.status = 'finished';
    game.winnerId = winnerId;
    return {
        winnerId,
        finalStandings: standings,
    };
}
// End game manually
function endGame(gameCode) {
    const game = games.get(gameCode.toUpperCase());
    if (!game)
        return false;
    game.status = 'finished';
    return true;
}
// Update participant socket ID
function updateParticipantSocket(gameCode, participantId, socketId) {
    const game = games.get(gameCode.toUpperCase());
    if (!game)
        return false;
    const participant = game.participants.find(p => p.id === participantId);
    if (!participant)
        return false;
    participant.socketId = socketId;
    return true;
}
// Cleanup old games (runs periodically)
function cleanupOldGames() {
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

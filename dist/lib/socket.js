"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = getIO;
exports.emitGameStatusUpdate = emitGameStatusUpdate;
exports.emitParticipantJoined = emitParticipantJoined;
exports.emitPreviewUpdate = emitPreviewUpdate;
exports.emitVoteUpdate = emitVoteUpdate;
exports.emitWinnerDeclared = emitWinnerDeclared;
// Get the global io instance
function getIO() {
    if (typeof window === 'undefined') {
        return global.io || null;
    }
    return null;
}
// Emit game status update to all clients in a game
function emitGameStatusUpdate(gameCode, event) {
    const io = getIO();
    if (!io)
        return;
    io.to(gameCode).emit('game:statusUpdate', event);
}
// Emit participant joined event
function emitParticipantJoined(gameCode, event) {
    const io = getIO();
    if (!io)
        return;
    io.to(gameCode).emit('game:participantJoined', event);
}
// Emit preview update
function emitPreviewUpdate(gameCode, event) {
    const io = getIO();
    if (!io)
        return;
    io.to(gameCode).emit('preview:update', event);
}
// Emit vote update
function emitVoteUpdate(gameCode, event) {
    const io = getIO();
    if (!io)
        return;
    io.to(gameCode).emit('vote:update', event);
}
// Emit winner declared
function emitWinnerDeclared(gameCode, event) {
    const io = getIO();
    if (!io)
        return;
    io.to(gameCode).emit('game:winnerDeclared', event);
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getSocket } from '@/lib/socketClient';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import BlueScreenOfDeath from '@/components/BlueScreenOfDeath';
import type { Game, GameStatusUpdateEvent, PreviewUpdateEvent, VoteUpdateEvent, ReactionUpdateEvent, WinnerDeclaredEvent } from '@/lib/types';

export default function AdminGameView() {
  const params = useParams();
  const gameCode = params.gameId as string; // URL param is actually gameCode

  const [game, setGame] = useState<Game | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    console.log('Admin useEffect running for gameCode:', gameCode);
    const socket = getSocket();
    console.log('Socket status:', socket.connected);

    // Add connection event listeners
    socket.on('connect', () => {
      console.log('Socket connected!');
      socket.emit('admin:join', gameCode);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Failed to connect to game server');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      // Only show BSOD if game is active and disconnect was unexpected
      if (game && (game.status === 'active' || game.status === 'voting')) {
        setIsDisconnected(true);
      }
    });

    // If already connected, emit immediately
    if (socket.connected) {
      socket.emit('admin:join', gameCode);
    }

    socket.on('game:state', (gameState: Game) => {
      console.log('Received game state:', gameState);
      setGame(gameState);

      // Calculate time remaining
      if (gameState.startTime && gameState.status === 'active') {
        const elapsed = Date.now() - gameState.startTime;
        setTimeRemaining(Math.max(0, gameState.duration - Math.floor(elapsed / 1000)));
      }
    });

    socket.on('game:error', (error: { message?: string }) => {
      console.error('Game error:', error);
      toast.error(error.message || 'Game not found');
      // Set a flag to show error state instead of loading
      setGame({ code: '', status: 'finished', targetType: 'image', targetImageUrl: '', duration: 0, maxPrompts: 3, maxCharacters: 1000, startTime: null, votingStartTime: null, createdAt: 0, participants: [], votes: [], reactions: [], winnerId: null } as Game);
    });

    socket.on('game:participantJoined', (data: { participant: { id: string; name: string } }) => {
      toast.success(`${data.participant.name} joined the chaos!`);

      // Immediately update local state with new participant
      setGame(prev => {
        if (!prev) return prev;

        // Check if participant already exists (avoid duplicates)
        if (prev.participants.some(p => p.id === data.participant.id)) {
          return prev;
        }

        // Add new participant with default values
        const newParticipant = {
          id: data.participant.id,
          name: data.participant.name,
          socketId: '',
          currentCode: {
            html: '<div style="display: flex; align-items: center; justify-content: center; height: 100vh;"><h1>Start prompting!</h1></div>',
            css: '',
          },
          promptHistory: [],
          reactions: { fire: 0, laugh: 0, think: 0, shock: 0, cool: 0 },
          voteCount: 0,
          joinedAt: Date.now(),
        };

        return {
          ...prev,
          participants: [...prev.participants, newParticipant],
        };
      });
    });

    socket.on('game:statusUpdate', (update: GameStatusUpdateEvent) => {
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: update.status,
          startTime: update.startTime,
        };
      });

      if (update.status === 'active' && update.timeRemaining !== undefined) {
        setTimeRemaining(update.timeRemaining);
      }
    });

    socket.on('preview:update', (update: PreviewUpdateEvent) => {
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.id === update.participantId
              ? {
                  ...p,
                  currentCode: { html: update.html, css: update.css },
                  promptHistory: update.promptCount !== undefined
                    ? Array(update.promptCount).fill({ prompt: '', timestamp: 0 })
                    : p.promptHistory
                }
              : p
          ),
        };
      });
    });

    socket.on('vote:update', (update: VoteUpdateEvent) => {
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.id === update.participantId
              ? { ...p, voteCount: update.voteCount }
              : p
          ),
        };
      });
    });

    socket.on('reaction:update', (update: ReactionUpdateEvent) => {
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.id === update.participantId
              ? { ...p, reactions: update.reactions }
              : p
          ),
        };
      });
    });

    socket.on('game:winnerDeclared', (data: WinnerDeclaredEvent) => {
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'finished',
          winnerId: data.winnerId,
          participants: prev.participants.sort((a, b) => b.voteCount - a.voteCount),
        };
      });

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('game:state');
      socket.off('game:participantJoined');
      socket.off('game:statusUpdate');
      socket.off('preview:update');
      socket.off('vote:update');
      socket.off('reaction:update');
      socket.off('game:winnerDeclared');
    };
  }, [gameCode, game]);

  const handleStartGame = useCallback(async () => {
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });

      if (!response.ok) {
        toast.error('Failed to start game');
        return;
      }

      toast.success('Game started!');
    } catch {
      toast.error('Failed to start game');
    }
  }, [gameCode]);

  const handleOpenVoting = useCallback(async () => {
    try {
      const response = await fetch('/api/game/open-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });

      if (!response.ok) {
        toast.error('Failed to open voting');
        return;
      }

      toast.success('Voting is now open!');
    } catch {
      toast.error('Failed to open voting');
    }
  }, [gameCode]);

  const handleDeclareWinner = useCallback(async () => {
    try {
      const response = await fetch('/api/game/declare-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });

      if (!response.ok) {
        toast.error('Failed to declare winner');
        return;
      }

      toast.success('Winner declared!');
      setShowLeaderboard(true);

      // Celebrate with confetti!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 80,
          origin: { x: 0 },
        });
      }, 200);
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 80,
          origin: { x: 1 },
        });
      }, 400);
    } catch {
      toast.error('Failed to declare winner');
    }
  }, [gameCode]);

  // Timer countdown - recalculate from server time
  useEffect(() => {
    if (game?.status === 'active' && game?.startTime && game?.duration) {
      const startTime = game.startTime;
      const duration = game.duration;
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - Math.floor(elapsed / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          // Auto-open voting when time runs out
          handleOpenVoting();
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [game?.status, game?.startTime, game?.duration, handleOpenVoting]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Development helper: Add fake participants
  const addFakeParticipants = useCallback(async (count: number) => {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate'];
    for (let i = 0; i < count; i++) {
      const name = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
      try {
        await fetch('/api/game/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameCode, participantName: name }),
        });
      } catch (error) {
        console.error('Failed to add fake participant:', error);
      }
    }
  }, [gameCode]);

  // Show BSOD if disconnected during active game
  if (isDisconnected) {
    return <BlueScreenOfDeath variant="admin" />;
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-bg">
        <p className="text-2xl font-bold">Loading...</p>
      </div>
    );
  }

  // Lobby state
  if (game.status === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-neo-bg">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center space-y-6">
            <div>
              <p className="font-bold text-sm mb-2">GAME CODE:</p>
              <div className="neo-border bg-neo-yellow inline-block p-8 animate-pulse">
                <p className="font-[family-name:var(--font-display)] text-7xl">
                  {game.code}
                </p>
              </div>
            </div>

            <div>
              <p className="font-bold text-lg mb-3">Game Settings:</p>
              <div className="flex gap-4 justify-center text-sm">
                <Badge variant="blue" className="px-3 py-1">
                  ⏱️ {Math.floor(game.duration / 60)} min
                </Badge>
                <Badge variant="blue" className="px-3 py-1">
                  📝 {game.maxPrompts} prompts max
                </Badge>
                <Badge variant="blue" className="px-3 py-1">
                  🔤 {game.maxCharacters} chars max
                </Badge>
              </div>
            </div>

            <div>
              <p className="font-bold text-lg mb-3">Brave souls joining:</p>
              {game.participants.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {game.participants.map(p => (
                    <Badge key={p.id} variant="pink" className="text-lg px-4 py-2">
                      {p.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Waiting for participants...</p>
              )}
              <p className="text-sm font-bold mt-2">
                {game.participants.length} victim{game.participants.length !== 1 ? 's' : ''} ready
              </p>
            </div>

            <Button
              variant="pink"
              className="text-3xl py-10 px-12 animate-pulse"
              onClick={handleStartGame}
              disabled={game.participants.length === 0}
            >
              UNLEASH THE CHAOS
            </Button>

            {/* Development Helpers */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="default"
                onClick={() => addFakeParticipants(8)}
                className="text-xs py-2 px-3"
              >
                + 8 Fake Participants
              </Button>
              <Button
                variant="default"
                onClick={() => addFakeParticipants(3)}
                className="text-xs py-2 px-3"
              >
                + 3 More
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Active/Voting/Finished state
  const timerColor = timeRemaining < 10 ? 'text-red-500' : timeRemaining < 30 ? 'text-neo-yellow' : 'text-neo-blue';

  return (
    <div className="min-h-screen bg-neo-bg">
      {/* Top bar */}
      <div className="border-b-4 border-black bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {game.status === 'active' && (
              <div className={`font-[family-name:var(--font-display)] text-5xl ${timerColor}`}>
                {formatTime(timeRemaining)}
              </div>
            )}
            {game.status === 'voting' && (
              <Badge variant="yellow" className="text-2xl px-6 py-3 animate-pulse">
                VOTING OPEN
              </Badge>
            )}
            {game.status === 'finished' && (
              <Badge variant="pink" className="text-2xl px-6 py-3">
                THE PEOPLE HAVE SPOKEN
              </Badge>
            )}

            <div className="ml-4 text-sm flex items-center gap-2">
              <p className="font-bold text-gray-600">Voting/Reaction Link:</p>
              <Badge variant="blue" className="text-base px-4 py-2">
                {typeof window !== 'undefined' ? window.location.origin : ''} + code: {game.code}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {game.status === 'active' && (
              <Button variant="yellow" onClick={handleOpenVoting}>
                END GAME
              </Button>
            )}
            {game.status === 'voting' && (
              <Button variant="pink" onClick={handleDeclareWinner} className="animate-pulse">
                CROWN THE CHAMPION
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid - Optimised for maximum viewport usage */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence>
            {game.participants.map((participant) => {
              const isWinner = game.status === 'finished' && participant.id === game.winnerId;
              const isExpanded = expandedParticipant === participant.id;

              return (
                <motion.div
                  key={participant.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    zIndex: isExpanded ? 50 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`relative ${isExpanded ? 'col-span-full' : ''}`}
                >
                  <Card
                    className={`p-3 relative hover:shadow-md transition-all ${
                      isWinner ? 'neo-border-thick border-yellow-500 animate-pulse' : ''
                    }`}
                    style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.3)' }}
                  >
                    {/* Single row: Name | Heart Votes | Prompt Usage | Reactions */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <p className="font-black text-xs">
                        {isWinner && '👑 '}
                        {participant.name}
                      </p>

                      {/* Prompt usage counter */}
                      {game.status === 'active' && (
                        <span className="text-xs bg-blue-100 border-2 border-blue-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap">
                          📝 {participant.promptHistory?.length || 0}/{game.maxPrompts}
                        </span>
                      )}

                      {(game.status === 'voting' || game.status === 'finished') && (
                        <span className="text-xs bg-pink-100 border-2 border-pink-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap">
                          ❤️ {participant.voteCount}
                        </span>
                      )}

                      {/* Live emoji reactions - inline */}
                      {(game.status === 'active' || game.status === 'voting' || game.status === 'finished') && participant.reactions && (
                        <>
                          {participant.reactions.fire > 0 && (
                            <motion.span
                              key={`fire-${participant.reactions.fire}`}
                              initial={{ scale: 2.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 12, duration: 0.3 }}
                              className="text-xs bg-orange-100 border-2 border-orange-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap"
                            >
                              🔥 {participant.reactions.fire}
                            </motion.span>
                          )}
                          {participant.reactions.laugh > 0 && (
                            <motion.span
                              key={`laugh-${participant.reactions.laugh}`}
                              initial={{ scale: 2.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 12, duration: 0.3 }}
                              className="text-xs bg-yellow-100 border-2 border-yellow-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap"
                            >
                              😂 {participant.reactions.laugh}
                            </motion.span>
                          )}
                          {participant.reactions.think > 0 && (
                            <motion.span
                              key={`think-${participant.reactions.think}`}
                              initial={{ scale: 2.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 12, duration: 0.3 }}
                              className="text-xs bg-blue-100 border-2 border-blue-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap"
                            >
                              🤔 {participant.reactions.think}
                            </motion.span>
                          )}
                          {participant.reactions.shock > 0 && (
                            <motion.span
                              key={`shock-${participant.reactions.shock}`}
                              initial={{ scale: 2.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 12, duration: 0.3 }}
                              className="text-xs bg-purple-100 border-2 border-purple-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap"
                            >
                              😱 {participant.reactions.shock}
                            </motion.span>
                          )}
                          {participant.reactions.cool > 0 && (
                            <motion.span
                              key={`cool-${participant.reactions.cool}`}
                              initial={{ scale: 2.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 12, duration: 0.3 }}
                              className="text-xs bg-teal-100 border-2 border-teal-500 rounded px-1.5 py-0.5 font-bold whitespace-nowrap"
                            >
                              😎 {participant.reactions.cool}
                            </motion.span>
                          )}
                        </>
                      )}
                    </div>

                    <div
                      className={`neo-border bg-white cursor-pointer transition-all relative ${
                        isExpanded ? 'hover:opacity-90' : 'hover:scale-[1.05]'
                      }`}
                      style={{ height: isExpanded ? '70vh' : '200px' }}
                      onClick={() => setExpandedParticipant(isExpanded ? null : participant.id)}
                    >
                      {/* Action buttons - top right */}
                      <div className="absolute top-2 right-2 flex gap-1 z-10 pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const code = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${participant.currentCode?.css || ''}\n</style>\n</head>\n<body>\n${participant.currentCode?.html || ''}\n</body>\n</html>`;
                            const blob = new Blob([code], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${participant.name}-code.html`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-neo-pink hover:text-white neo-border rounded transition-colors text-sm"
                          title="Download Code"
                        >
                          ⬇️
                        </button>
                      </div>

                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <style>${participant.currentCode?.css || ''}</style>
                            </head>
                            <body>${participant.currentCode?.html || '<div style="padding: 20px; font-size: 12px;">Waiting...</div>'}</body>
                          </html>
                        `}
                        sandbox="allow-same-origin"
                        className="w-full h-full border-0 pointer-events-none"
                      />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && game.status === 'finished' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowLeaderboard(false)}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white neo-border neo-shadow-lg max-w-3xl w-full max-h-[80vh] overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <h2 className="font-[family-name:var(--font-display)] text-6xl mb-4">
                FINAL STANDINGS
              </h2>
              <p className="text-xl text-gray-600">From glory to... well, you tried.</p>
            </div>

            <div className="space-y-4">
              {game.participants
                .sort((a, b) => b.voteCount - a.voteCount)
                .map((participant, index) => {
                  const isWinner = index === 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  const medal = medals[index] || `${index + 1}.`;

                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-4 neo-border ${
                        isWinner ? 'bg-yellow-100 border-yellow-500' : 'bg-white'
                      }`}
                    >
                      <div className="text-4xl font-bold w-16 text-center">
                        {medal}
                      </div>

                      <div className="flex-1">
                        <p className={`font-black ${isWinner ? 'text-2xl' : 'text-xl'}`}>
                          {participant.name}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {participant.reactions.fire > 0 && (
                            <span className="text-xs bg-orange-100 border-2 border-orange-500 rounded px-2 py-1">
                              🔥 {participant.reactions.fire}
                            </span>
                          )}
                          {participant.reactions.laugh > 0 && (
                            <span className="text-xs bg-yellow-100 border-2 border-yellow-500 rounded px-2 py-1">
                              😂 {participant.reactions.laugh}
                            </span>
                          )}
                          {participant.reactions.think > 0 && (
                            <span className="text-xs bg-blue-100 border-2 border-blue-500 rounded px-2 py-1">
                              🤔 {participant.reactions.think}
                            </span>
                          )}
                          {participant.reactions.shock > 0 && (
                            <span className="text-xs bg-purple-100 border-2 border-purple-500 rounded px-2 py-1">
                              😱 {participant.reactions.shock}
                            </span>
                          )}
                          {participant.reactions.cool > 0 && (
                            <span className="text-xs bg-teal-100 border-2 border-teal-500 rounded px-2 py-1">
                              😎 {participant.reactions.cool}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`text-right ${isWinner ? 'text-3xl' : 'text-2xl'} font-black`}>
                        <div className="bg-pink-100 border-4 border-pink-500 rounded px-4 py-2">
                          ❤️ {participant.voteCount}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="pink"
                className="text-2xl py-6 px-12"
                onClick={() => setShowLeaderboard(false)}
              >
                Close Leaderboard
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

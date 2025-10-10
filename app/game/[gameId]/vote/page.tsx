'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getSocket, onEvent } from '@/lib/socketClient';
import { fetchGameState } from '@/lib/gameApi';
import { getFingerprint } from '@/lib/fingerprint';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import BlueScreenOfDeath from '@/components/BlueScreenOfDeath';
import PreviewRenderer from '@/components/PreviewRenderer';
import type {
  Game,
  GameStatus,
  ReactionType,
  ReactionRequest,
  ReactionResponse,
  ReactionUpdateEvent,
} from '@/lib/types';

const EMOJI_REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'Fire', color: 'bg-orange-500' },
  { type: 'laugh', emoji: '😂', label: 'Laugh', color: 'bg-yellow-400' },
  { type: 'think', emoji: '🤔', label: 'Think', color: 'bg-blue-400' },
  { type: 'shock', emoji: '😱', label: 'Shock', color: 'bg-purple-500' },
  { type: 'cool', emoji: '😎', label: 'Cool', color: 'bg-teal-500' },
];

export default function VoterView() {
  const params = useParams();
  const gameCode = params.gameId as string; // URL param is gameCode

  const [game, setGame] = useState<Game | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Record<string, ReactionType>>({});
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isLoadingFingerprint, setIsLoadingFingerprint] = useState(true);
  const [isReacting, setIsReacting] = useState(false);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showFinalStandings, setShowFinalStandings] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  // Check if this user is a participant (to prevent self-voting)
  useEffect(() => {
    const storedData = localStorage.getItem(`game_${gameCode}`);
    if (storedData) {
      try {
        const { participantId } = JSON.parse(storedData);
        setMyParticipantId(participantId);
        console.log('[Vote] User is a participant:', participantId);
      } catch (e) {
        console.error('Failed to parse participant data:', e);
      }
    }
  }, [gameCode]);

  // Fetch fingerprint
  useEffect(() => {
    getFingerprint().then(fp => {
      setFingerprint(fp);
      setIsLoadingFingerprint(false);

      // Only load vote/reaction data once we have game state with createdAt
      if (game?.createdAt) {
        // Check if already voted - use createdAt to scope to this game session
        const votedKey = `voted_${gameCode}_${game.createdAt}`;
        const voted = localStorage.getItem(votedKey);
        if (voted) {
          setVotedFor(voted);
        }

        // Load stored reactions
        const reactionsKey = `reactions_${gameCode}_${game.createdAt}`;
        const stored = localStorage.getItem(reactionsKey);
        if (stored) {
          try {
            setMyReactions(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse stored reactions:', e);
          }
        }
      }
    });
  }, [gameCode, game?.createdAt]);

  // PartySocket connection using gameCode
  useEffect(() => {
    const socket = getSocket(gameCode);

    // Fetch initial game state from API
    fetchGameState(gameCode).then(gameState => {
      if (gameState) {
        console.log('Fetched initial game state:', gameState);
        setGame(gameState);
      } else {
        toast.error('Game not found');
      }
    });

    // Polling fallback: Fetch game state every 5 seconds to detect status changes
    const pollingInterval = setInterval(async () => {
      const gameState = await fetchGameState(gameCode);
      if (gameState) {
        setGame(prev => {
          if (prev && prev.status !== gameState.status) {
            console.log('[Vote Polling] Status changed:', prev.status, '->', gameState.status);
          }
          return gameState;
        });
      }
    }, 5000);

    // Handle disconnect events
    const handleClose = () => {
      console.warn('Socket disconnected');
      // Check current game state using setGame callback to avoid stale closure
      setGame(currentGame => {
        if (currentGame && (currentGame.status === 'active' || currentGame.status === 'voting')) {
          setIsDisconnected(true);
        }
        return currentGame;
      });
    };
    // Pusher handles reconnection automatically, no need for close listener

    // Set up event listeners with cleanup functions
    const cleanupGameState = onEvent(socket, 'game:state', (payload) => {
      const gameState = payload as Game;
      setGame(gameState);
    });

    const cleanupStatusUpdate = onEvent(socket, 'game:statusUpdate', (payload) => {
      const update = payload as { status: GameStatus };
      setGame(prev => {
        if (!prev) return prev;
        return { ...prev, status: update.status };
      });

      // Force UI update when voting opens
      if (update.status === 'voting') {
        toast.success('Voting is now open!');
      }
    });

    const cleanupVoteUpdate = onEvent(socket, 'vote:update', (payload) => {
      const update = payload as { participantId: string; voteCount: number };
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

    const cleanupReactionUpdate = onEvent(socket, 'reaction:update', (payload) => {
      const update = payload as ReactionUpdateEvent;
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

    const cleanupPreviewUpdate = onEvent(socket, 'preview:update', (payload) => {
      const update = payload as { participantId: string; html?: string; css?: string; jsx?: string };
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.id === update.participantId
              ? {
                  ...p,
                  currentCode: prev.renderMode === 'retro'
                    ? { html: update.html, css: update.css }
                    : { jsx: update.jsx }
                }
              : p
          ),
        };
      });
    });

    const cleanupWinnerDeclared = onEvent(socket, 'game:winnerDeclared', (payload) => {
      const data = payload as { winnerId: string };
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'finished',
          winnerId: data.winnerId,
          participants: prev.participants.sort((a, b) => b.voteCount - a.voteCount),
        };
      });

      // Show final standings modal
      setShowFinalStandings(true);

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    });

    return () => {
      // Pusher handles cleanup automatically
      cleanupGameState();
      cleanupStatusUpdate();
      cleanupVoteUpdate();
      cleanupReactionUpdate();
      cleanupPreviewUpdate();
      cleanupWinnerDeclared();
      // Clear polling interval
      clearInterval(pollingInterval);
      console.log('[Vote] Cleaned up polling interval');
    };
  }, [gameCode]);

  const handleVote = async (participantId: string) => {
    if (!fingerprint || !game?.createdAt) return;

    const votedKey = `voted_${gameCode}_${game.createdAt}`;

    // Check if trying to undo vote
    if (votedFor === participantId) {
      try {
        // Call DELETE endpoint to remove vote
        const response = await fetch('/api/vote', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameCode,
            voterFingerprint: fingerprint,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || 'Failed to undo vote');
          return;
        }

        setVotedFor(null);
        localStorage.removeItem(votedKey);
        toast.success('Vote undone! You can vote again.');
      } catch {
        toast.error('Failed to undo vote');
      }
      return;
    }

    // Check if already voted for someone else
    if (votedFor) return;

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          participantId,
          voterFingerprint: fingerprint,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to vote');
        return;
      }

      setVotedFor(participantId);
      localStorage.setItem(votedKey, participantId);
      toast.success('Vote recorded!');
    } catch {
      toast.error('Failed to vote');
    }
  };

  const handleReaction = async (participantId: string, reactionType: ReactionType) => {
    if (!fingerprint || !game || isReacting) return;

    // Set short timeout to prevent double-submits but allow rapid clicking
    setIsReacting(true);
    setTimeout(() => setIsReacting(false), 100);

    try {
      const requestBody: ReactionRequest = {
        gameCode,
        participantId,
        reactionType,
        voterFingerprint: fingerprint,
      };

      const response = await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to react');
        return;
      }

      const data: ReactionResponse = await response.json();

      // Update local state
      const newReactions = { ...myReactions, [participantId]: reactionType };
      setMyReactions(newReactions);
      if (game.createdAt) {
        localStorage.setItem(`reactions_${gameCode}_${game.createdAt}`, JSON.stringify(newReactions));
      }

      // Optimistically update the participant's reaction counts
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.id === participantId
              ? { ...p, reactions: data.reactions }
              : p
          ),
        };
      });
    } catch (error) {
      console.error('Failed to react:', error);
      toast.error('Failed to react');
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-bg">
        <p className="text-2xl font-bold">Loading game state...</p>
      </div>
    );
  }

  const canReact = (game.status === 'active' || game.status === 'voting' || game.status === 'finished') && !isLoadingFingerprint;
  const isVotingOpen = game.status === 'voting' || game.status === 'finished';
  const isFinished = game.status === 'finished';

  return (
    <>
      {isDisconnected && <BlueScreenOfDeath variant="voter" />}
      <div className="min-h-screen bg-neo-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-6xl mb-4 rotate-[-1deg] inline-block">
            <span className="neo-border bg-neo-pink text-white px-4 sm:px-6 py-2 sm:py-3 neo-shadow-lg">
              WHO DID IT BEST?
            </span>
          </h1>

          {game.status === 'active' && (
            <p className="text-xl font-bold mt-4 text-gray-600">
              Reactions only for now. Voting opens when the game ends!
            </p>
          )}

          {game.status === 'lobby' && (
            <p className="text-xl font-bold mt-4 text-gray-600">
              Game hasn&apos;t started yet. Hold your horses.
            </p>
          )}

          {game.status === 'reveal' && (
            <p className="text-xl font-bold mt-4 text-gray-600">
              Get ready! The challenge is being revealed...
            </p>
          )}

          {isVotingOpen && (
            <p className="text-xl font-bold mt-4">
              Vote for your favourite and keep sending reactions! 🔥
            </p>
          )}

          {votedFor && (
            <Badge variant="yellow" className="text-lg px-6 py-3 mt-4">
              You voted! Thanks for judging. 🔥
            </Badge>
          )}

          {isFinished && (
            <p className="text-2xl font-bold mt-4 text-neo-pink">
              THE PEOPLE HAVE SPOKEN
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {game.participants
            .sort((a, b) => isFinished ? b.voteCount - a.voteCount : 0)
            .map((participant, index) => {
              const isMyEntry = participant.id === myParticipantId;
              const isWinner = isFinished && participant.id === game.winnerId;
              const hasVotedForThis = votedFor === participant.id;
              const myReactionForThis = myReactions[participant.id];

              const isExpanded = expandedParticipant === participant.id;

              return (
                <motion.div
                  key={participant.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    zIndex: isExpanded ? 50 : 1,
                  }}
                  transition={{ delay: index * 0.1 }}
                  className={isExpanded ? 'col-span-full' : ''}
                >
                  <Card
                    className={`p-4 relative ${
                      isWinner
                        ? 'neo-border-thick border-yellow-500 animate-pulse bg-yellow-50'
                        : hasVotedForThis
                        ? 'bg-green-50'
                        : ''
                    }`}
                  >
                    <CardContent className="p-0 space-y-3">
                      {/* Name, reactions, and votes */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-lg">
                              {isWinner && '👑 '}
                              {participant.name}
                            </p>
                            {/* Vote count on mobile - inline with name */}
                            {isVotingOpen && (
                              <motion.div
                                key={`votes-mobile-${participant.voteCount}`}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.3 }}
                              >
                                <Badge variant="pink" className="text-base sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1 sm:hidden">
                                  ❤️ 🙈
                                </Badge>
                              </motion.div>
                            )}
                          </div>

                          {/* Reaction counts - below name on mobile */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <AnimatePresence mode="popLayout">
                              {EMOJI_REACTIONS.map(({ type, emoji, color }) => {
                                const count = participant.reactions[type] || 0;
                                if (count === 0) return null;

                                return (
                                  <motion.div
                                    key={type}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  >
                                    <Badge className={`${color} text-white px-1.5 py-0.5 border-black flex items-center gap-0.5`}>
                                      <span className="text-xl sm:text-2xl">{emoji}</span>
                                      <span className="text-sm sm:text-lg font-bold">{count}</span>
                                    </Badge>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Vote count on desktop */}
                        {isVotingOpen && (
                          <motion.div
                            key={`votes-desktop-${participant.voteCount}`}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.3 }}
                          >
                            <Badge variant="pink" className="hidden sm:block text-lg px-3 py-1">
                              ❤️ 🙈
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      {/* Preview */}
                      <div
                        className={`neo-border bg-white transition-all relative ${
                          isExpanded ? 'h-[600px] overflow-auto cursor-default' : 'h-64 overflow-hidden cursor-pointer hover:scale-[1.05]'
                        }`}
                        onClick={() => !isExpanded && setExpandedParticipant(participant.id)}
                      >
                        {/* Action buttons - top right */}
                        <div className="absolute top-2 right-2 flex gap-1 z-10 pointer-events-auto">
                          {isExpanded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedParticipant(null);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-red-500 hover:text-white neo-border rounded transition-colors text-sm font-bold"
                              title="Close"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Download screenshot for', participant.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-neo-blue hover:text-white neo-border rounded transition-colors text-sm"
                            title="Download Screenshot"
                          >
                            📷
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const code = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${participant.currentCode.css}\n</style>\n</head>\n<body>\n${participant.currentCode.html}\n</body>\n</html>`;
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
                            📝
                          </button>
                        </div>

                        <div
                          className="w-full h-full"
                          style={{
                            transform: isExpanded ? 'scale(1)' : 'scale(0.25)',
                            transformOrigin: 'top left',
                            width: isExpanded ? '100%' : '400%',
                            height: isExpanded ? '100%' : '400%',
                          }}
                        >
                          <PreviewRenderer
                            renderMode={game.renderMode}
                            html={participant.currentCode.html}
                            css={participant.currentCode.css}
                            jsx={participant.currentCode.jsx}
                            className={`w-full h-full border-0 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}
                          />
                        </div>
                      </div>

                      {/* Reaction buttons during active game */}
                      {canReact && (
                        <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                          {EMOJI_REACTIONS.map(({ type, emoji, label, color }) => {
                            const isSelected = myReactionForThis === type;
                            return (
                              <motion.button
                                key={type}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReaction(participant.id, type)}
                                disabled={game.status === 'finished' || isLoadingFingerprint || isReacting}
                                className={`
                                  text-2xl sm:text-3xl w-11 h-11 sm:w-14 sm:h-14 rounded-lg border-3 border-black
                                  transition-all duration-200
                                  ${isSelected
                                    ? `${color} neo-shadow-lg scale-110`
                                    : 'bg-white hover:bg-gray-100 neo-border'
                                  }
                                  ${game.status === 'finished' || isLoadingFingerprint || isReacting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                title={label}
                              >
                                {emoji}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {/* Vote button during voting */}
                      {isVotingOpen && !isFinished && (
                        <>
                          {isMyEntry ? (
                            <div className="w-full text-center py-3 bg-gray-100 border-4 border-gray-300 rounded font-bold text-gray-600">
                              Your entry (can&apos;t vote for yourself!)
                            </div>
                          ) : (
                            <Button
                              variant={hasVotedForThis ? 'blue' : 'pink'}
                              className="w-full"
                              onClick={() => handleVote(participant.id)}
                              disabled={isLoadingFingerprint || (votedFor !== null && votedFor !== participant.id)}
                            >
                              {hasVotedForThis
                                ? 'UNDO VOTE'
                                : votedFor
                                ? 'LOCKED IN'
                                : 'THIS ONE SLAPS 🔥'}
                            </Button>
                          )}
                        </>
                      )}

                      {/* Show message when voting has ended */}
                      {isFinished && !isWinner && (
                        <div className="text-center py-2">
                          <p className="text-lg font-bold text-gray-600">
                            Voting has ended
                          </p>
                        </div>
                      )}

                      {isFinished && isWinner && (
                        <div className="text-center">
                          <Badge variant="yellow" className="text-xl px-6 py-3">
                            WINNER! 🎉
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
        </div>

        {game.participants.length === 0 && (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-gray-600">
              No participants yet. The chaos hasn&apos;t started!
            </p>
          </div>
        )}
      </div>

      {/* Final Standings Modal */}
      {showFinalStandings && game.status === 'finished' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowFinalStandings(false)}
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
                            <span className="bg-orange-100 border-2 border-orange-500 rounded px-2 py-1 flex items-center gap-1">
                              <span className="text-2xl">🔥</span>
                              <span className="text-lg font-bold">{participant.reactions.fire}</span>
                            </span>
                          )}
                          {participant.reactions.laugh > 0 && (
                            <span className="bg-yellow-100 border-2 border-yellow-500 rounded px-2 py-1 flex items-center gap-1">
                              <span className="text-2xl">😂</span>
                              <span className="text-lg font-bold">{participant.reactions.laugh}</span>
                            </span>
                          )}
                          {participant.reactions.think > 0 && (
                            <span className="bg-blue-100 border-2 border-blue-500 rounded px-2 py-1 flex items-center gap-1">
                              <span className="text-2xl">🤔</span>
                              <span className="text-lg font-bold">{participant.reactions.think}</span>
                            </span>
                          )}
                          {participant.reactions.shock > 0 && (
                            <span className="bg-purple-100 border-2 border-purple-500 rounded px-2 py-1 flex items-center gap-1">
                              <span className="text-2xl">😱</span>
                              <span className="text-lg font-bold">{participant.reactions.shock}</span>
                            </span>
                          )}
                          {participant.reactions.cool > 0 && (
                            <span className="bg-teal-100 border-2 border-teal-500 rounded px-2 py-1 flex items-center gap-1">
                              <span className="text-2xl">😎</span>
                              <span className="text-lg font-bold">{participant.reactions.cool}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`text-right ${isWinner ? 'text-3xl' : 'text-2xl'} font-black`}>
                        <div className="bg-pink-100 border-4 border-pink-500 rounded px-4 py-2">
                          ❤️ {participant.voteCount} {/* Final standings show actual count */}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="pink"
                className="text-xl py-6 px-12"
                onClick={() => setShowFinalStandings(false)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
    </>
  );
}

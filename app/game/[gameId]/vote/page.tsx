'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getSocket } from '@/lib/socketClient';
import { getFingerprint } from '@/lib/fingerprint';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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

  // Fetch fingerprint
  useEffect(() => {
    getFingerprint().then(fp => {
      setFingerprint(fp);
      setIsLoadingFingerprint(false);

      // Check if already voted
      const votedKey = `voted_${gameCode}`;
      const voted = localStorage.getItem(votedKey);
      if (voted) {
        setVotedFor(voted);
      }

      // Load stored reactions
      const reactionsKey = `reactions_${gameCode}`;
      const stored = localStorage.getItem(reactionsKey);
      if (stored) {
        try {
          setMyReactions(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored reactions:', e);
        }
      }
    });
  }, [gameCode]);

  // Socket.IO connection using gameCode
  useEffect(() => {
    const socket = getSocket();
    socket.emit('voter:join', gameCode);

    socket.on('game:state', (gameState: Game) => {
      setGame(gameState);
    });

    socket.on('game:statusUpdate', (update: { status: GameStatus }) => {
      setGame(prev => {
        if (!prev) return prev;
        return { ...prev, status: update.status };
      });

      // Force UI update when voting opens
      if (update.status === 'voting') {
        toast.success('Voting is now open!');
      }
    });

    socket.on('vote:update', (update: { participantId: string; voteCount: number }) => {
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

    socket.on('preview:update', (update: { participantId: string; html: string; css: string }) => {
      setGame(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.id === update.participantId
              ? { ...p, currentCode: { html: update.html, css: update.css } }
              : p
          ),
        };
      });
    });

    socket.on('game:winnerDeclared', (data: { winnerId: string }) => {
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
      socket.off('game:state');
      socket.off('game:statusUpdate');
      socket.off('vote:update');
      socket.off('reaction:update');
      socket.off('preview:update');
      socket.off('game:winnerDeclared');
    };
  }, [gameCode]);

  const handleVote = async (participantId: string) => {
    if (!fingerprint) return;

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
        localStorage.removeItem(`voted_${gameCode}`);
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
      localStorage.setItem(`voted_${gameCode}`, participantId);
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
      localStorage.setItem(`reactions_${gameCode}`, JSON.stringify(newReactions));

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
    <div className="min-h-screen bg-neo-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-6xl mb-4 rotate-[-1deg] inline-block">
            <span className="neo-border bg-neo-pink text-white px-6 py-3 neo-shadow-lg">
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-lg">
                            {isWinner && '👑 '}
                            {participant.name}
                          </p>

                          {/* Reaction counts */}
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
                                  <Badge className={`${color} text-white text-xs px-2 py-0.5 border-black`}>
                                    {emoji} {count}
                                  </Badge>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        {/* Vote count */}
                        {isVotingOpen && (
                          <Badge variant="pink" className="text-lg px-3 py-1">
                            ❤️ {participant.voteCount}
                          </Badge>
                        )}
                      </div>

                      {/* Preview */}
                      <div
                        className={`neo-border bg-white cursor-pointer transition-all relative ${
                          isExpanded ? 'h-[600px] hover:opacity-90' : 'h-64 hover:scale-[1.05]'
                        }`}
                        onClick={() => setExpandedParticipant(isExpanded ? null : participant.id)}
                      >
                        {/* Action buttons - top right */}
                        <div className="absolute top-2 right-2 flex gap-1 z-10 pointer-events-auto">
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

                        <iframe
                          srcDoc={`
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <style>${participant.currentCode.css}</style>
                              </head>
                              <body>${participant.currentCode.html}</body>
                            </html>
                          `}
                          sandbox="allow-same-origin"
                          className="w-full h-full border-0 pointer-events-none"
                        />
                      </div>

                      {/* Reaction buttons during active game */}
                      {canReact && (
                        <div className="flex justify-center gap-2 flex-wrap">
                          {EMOJI_REACTIONS.map(({ type, emoji, label, color }) => {
                            const isSelected = myReactionForThis === type;
                            return (
                              <motion.button
                                key={type}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReaction(participant.id, type)}
                                disabled={isLoadingFingerprint || isReacting}
                                className={`
                                  text-3xl w-14 h-14 rounded-lg border-3 border-black
                                  transition-all duration-200
                                  ${isSelected
                                    ? `${color} neo-shadow-lg scale-110`
                                    : 'bg-white hover:bg-gray-100 neo-border'
                                  }
                                  ${isLoadingFingerprint || isReacting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
                      {isVotingOpen && (
                        <Button
                          variant={hasVotedForThis ? 'blue' : 'pink'}
                          className="w-full"
                          onClick={() => handleVote(participant.id)}
                          disabled={isLoadingFingerprint}
                        >
                          {hasVotedForThis
                            ? 'UNDO VOTE'
                            : votedFor
                            ? 'LOCKED IN'
                            : 'THIS ONE SLAPS 🔥'}
                        </Button>
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
    </div>
  );
}

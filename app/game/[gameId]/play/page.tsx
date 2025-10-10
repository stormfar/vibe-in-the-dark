'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getSocket, onEvent } from '@/lib/socketClient';
import { fetchGameState } from '@/lib/gameApi';
import { getFingerprint } from '@/lib/fingerprint';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import BlueScreenOfDeath from '@/components/BlueScreenOfDeath';
import PreviewRenderer from '@/components/PreviewRenderer';
import type { Game, GameStatus, ReactionType, WinnerDeclaredEvent } from '@/lib/types';

const EMOJI_MAP: Record<ReactionType, string> = {
  fire: '🔥',
  laugh: '😂',
  think: '🤔',
  shock: '😱',
  cool: '😎',
};

export default function GamePlay() {
  const params = useParams();
  const router = useRouter();
  const gameCode = params.gameId as string; // URL param is gameCode

  const [participantId, setParticipantId] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentHtml, setCurrentHtml] = useState('');
  const [currentCss, setCurrentCss] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showFinalStandings, setShowFinalStandings] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handlersSetupRef = useRef<boolean>(false);
  const lastReactionTimestampRef = useRef<number>(0);

  useEffect(() => {
    // Get participant ID from localStorage
    const storedData = localStorage.getItem(`game_${gameCode}`);
    if (storedData) {
      const { participantId: storedParticipantId } = JSON.parse(storedData);
      setParticipantId(storedParticipantId);
      console.log('Play page loaded. Participant:', storedParticipantId, 'GameCode:', gameCode);
    }

    // Get fingerprint for voting
    getFingerprint().then(fp => {
      setFingerprint(fp);
      // Don't check localStorage for votes on play page
      // Votes are only checked on the dedicated vote page
    });
  }, [gameCode]);

  useEffect(() => {
    if (!participantId || !gameCode) return;

    // Prevent duplicate handler setup in React Strict Mode
    if (handlersSetupRef.current) {
      console.log('[Play] Handlers already set up, skipping duplicate setup');
      return;
    }
    handlersSetupRef.current = true;

    const socket = getSocket(gameCode);

    // Fetch initial game state from API
    fetchGameState(gameCode).then(gameState => {
      if (gameState) {
        console.log('Fetched initial game state:', gameState);
        setGame(gameState);

        const participant = gameState.participants.find(p => p.id === participantId);
        if (participant) {
          setCurrentHtml(participant.currentCode.html || '');
          setCurrentCss(participant.currentCode.css || '');
          setPromptHistory(participant.promptHistory.map(p => p.prompt));
        }

        // Calculate time remaining if game is active
        if (gameState.startTime && gameState.status === 'active') {
          const elapsed = Date.now() - gameState.startTime;
          const remaining = Math.max(0, gameState.duration - Math.floor(elapsed / 1000));
          console.log('Active phase - setting time:', remaining);
          setTimeRemaining(remaining);
        }
      } else {
        toast.error('Game not found');
      }
    });

    // Polling fallback: Fetch game state every 5 seconds to detect status changes
    const pollingInterval = setInterval(async () => {
      const gameState = await fetchGameState(gameCode);
      if (gameState) {
        setGame(prev => {
          // Check if status changed (especially important for game ending)
          if (prev && prev.status !== gameState.status) {
            console.log('[Play Polling] Status changed:', prev.status, '->', gameState.status);

            // If game finished and winner declared, show final standings modal
            if (gameState.status === 'finished' && gameState.winnerId) {
              console.log('[Play Polling] Winner detected, showing final standings');
              setShowFinalStandings(true);

              // Trigger confetti celebration
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
            }
          }
          return gameState;
        });
      }
    }, 5000);

    // Handle connection close
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

    const cleanupGameState = onEvent(socket, 'game:state', (payload) => {
      const gameState = payload as Game;
      setGame(gameState);

      const participant = gameState.participants.find(p => p.id === participantId);
      if (participant) {
        setCurrentHtml(participant.currentCode.html || '');
        setCurrentCss(participant.currentCode.css || '');
        setPromptHistory(participant.promptHistory.map(p => p.prompt));
      }

      // Calculate time remaining
      if (gameState.startTime && gameState.status === 'active') {
        const elapsed = Date.now() - gameState.startTime;
        const remaining = Math.max(0, gameState.duration - Math.floor(elapsed / 1000));
        console.log('Active phase - setting time:', remaining);
        setTimeRemaining(remaining);
      }
    });

    const cleanupStatusUpdate = onEvent(socket, 'game:statusUpdate', (payload) => {
      const update = payload as { status: GameStatus; timeRemaining?: number };
      console.log('Play page received game:statusUpdate:', update);

      // Update game status
      setGame(prev => {
        if (!prev) return prev;
        return { ...prev, status: update.status };
      });

      if (update.status === 'active' && update.timeRemaining !== undefined) {
        setTimeRemaining(update.timeRemaining);
      } else if (update.status === 'voting' || update.status === 'finished') {
        setTimeRemaining(0);
      }
    });

    const cleanupPreviewUpdate = onEvent(socket, 'preview:update', (payload) => {
      const update = payload as { participantId: string; html?: string; css?: string; jsx?: string };
      if (update.participantId === participantId) {
        if (update.html !== undefined) setCurrentHtml(update.html);
        if (update.css !== undefined) setCurrentCss(update.css);
        // JSX is handled through game state
      }
    });

    const cleanupReactionUpdate = onEvent(socket, 'reaction:update', (payload) => {
      const update = payload as { participantId: string; reactions: Record<ReactionType, number> };
      console.log('[Play] Received reaction:update event:', update);

      if (update.participantId === participantId) {
        console.log('[Play] Reaction is for current participant:', participantId);

        // Deduplicate based on timestamp (handlers fire within milliseconds)
        const now = Date.now();
        if (now - lastReactionTimestampRef.current < 50) {
          console.log('[Play] Skipping duplicate reaction within 50ms');
          return;
        }
        lastReactionTimestampRef.current = now;

        // Someone reacted to this participant! Create floating emoji explosion
        // Get current game state to detect which reaction increased
        setGame(currentGame => {
          if (!currentGame) return currentGame;

          const participant = currentGame.participants.find(p => p.id === participantId);
          if (participant) {
            console.log('[Play] Current reactions:', participant.reactions);
            console.log('[Play] New reactions:', update.reactions);

            // Find which reaction increased and show emoji immediately
            for (const type of Object.keys(update.reactions) as ReactionType[]) {
              if (update.reactions[type] > (participant.reactions[type] || 0)) {
                console.log('[Play] Detected increased reaction type:', type);
                console.log('[Play] Adding floating emoji for:', type);

                const emoji = EMOJI_MAP[type];
                const newEmoji = {
                  id: `${Date.now()}-${Math.random()}`,
                  emoji,
                  x: Math.random() * 80 + 10,
                  y: Math.random() * 80 + 10,
                };

                // Add emoji - use callback form to avoid closure issues
                setFloatingEmojis(prev => [...prev, newEmoji]);

                // Remove after animation completes
                setTimeout(() => {
                  setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
                }, 2500);

                break; // Only show one emoji per reaction event
              }
            }
          }

          // Update the participant's reaction counts in game state
          return {
            ...currentGame,
            participants: currentGame.participants.map(p =>
              p.id === participantId
                ? { ...p, reactions: update.reactions }
                : p
            ),
          };
        });
      }
    });

    const cleanupVoteUpdate = onEvent(socket, 'vote:update', (payload) => {
      const update = payload as { participantId: string; voteCount: number };
      console.log('[Play] Received vote:update event:', update);

      // Update vote count for the participant
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

    const cleanupWinnerDeclared = onEvent(socket, 'game:winnerDeclared', (payload) => {
      const data = payload as WinnerDeclaredEvent;
      setShowFinalStandings(true);

      // Trigger confetti celebration
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
    });

    return () => {
      // Reset the flag so handlers can be set up again if needed
      handlersSetupRef.current = false;
      // Pusher handles cleanup automatically
      cleanupGameState();
      cleanupStatusUpdate();
      cleanupPreviewUpdate();
      cleanupReactionUpdate();
      cleanupVoteUpdate();
      cleanupWinnerDeclared();
      // Clear polling interval
      clearInterval(pollingInterval);
      console.log('[Play] Cleaned up polling interval');
    };
  }, [participantId, gameCode]);

  // Timer countdown - recalculate from server time
  useEffect(() => {
    if (game?.status === 'active' && game?.startTime && game?.duration) {
      const startTime = game.startTime;
      const duration = game.duration;
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - Math.floor(elapsed / 1000));
        setTimeRemaining(remaining);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game?.status, game?.startTime, game?.duration]);

  const handleSubmitPrompt = async () => {
    if (!prompt.trim() || isProcessing) return;

    // Check if participant has reached max prompts
    if (game && promptHistory.length >= game.maxPrompts) {
      toast.error(`You've reached the maximum of ${game.maxPrompts} prompts!`);
      return;
    }

    // Check if prompt exceeds max characters
    if (game && prompt.length > game.maxCharacters) {
      toast.error(`Prompt exceeds ${game.maxCharacters} character limit!`);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          participantId,
          prompt: prompt.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to process prompt');
        setIsProcessing(false);
        return;
      }

      const data = await response.json();
      // Handle both retro and turbo mode responses
      if (data.html !== undefined) setCurrentHtml(data.html);
      if (data.css !== undefined) setCurrentCss(data.css);
      // JSX updates come through socket
      setPromptHistory([...promptHistory, prompt.trim()]);
      setPrompt('');
      toast.success('Claude has spoken!');
    } catch {
      toast.error('Failed to process prompt');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVote = async (targetParticipantId: string) => {
    if (!fingerprint || !game?.createdAt) return;

    const votedKey = `voted_${gameCode}_${game.createdAt}`;

    // Check if trying to undo vote
    if (votedFor === targetParticipantId) {
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
    if (votedFor) {
      toast.error('You already voted! Click your vote to undo it first.');
      return;
    }

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          participantId: targetParticipantId,
          voterFingerprint: fingerprint,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to vote');
        return;
      }

      setVotedFor(targetParticipantId);
      localStorage.setItem(votedKey, targetParticipantId);
      toast.success('Vote recorded!');
    } catch {
      toast.error('Failed to vote');
    }
  };

  const isGameActive = game?.status === 'active';
  const isGameOver = game?.status === 'voting' || game?.status === 'finished';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {isDisconnected && <BlueScreenOfDeath variant="player" />}
      <div className={`h-screen flex flex-col bg-neo-bg relative overflow-hidden ${timeRemaining <= 15 && isGameActive ? 'animate-shake' : ''}`}>
      {/* Floating emoji explosions - random positions across screen */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {floatingEmojis.map((floatingEmoji) => (
            <motion.div
              key={floatingEmoji.id}
              initial={{
                opacity: 0,
                scale: 0,
                left: `${floatingEmoji.x}%`,
                top: `${floatingEmoji.y}%`,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 2.5, 2.5, 0],
                top: `${floatingEmoji.y - 15}%`,
                rotate: [0, 360],
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="absolute text-7xl"
              style={{
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
              }}
            >
              {floatingEmoji.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game Info Header */}
      {game && isGameActive && (
        <div className="bg-white border-b-4 border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={game.renderMode === 'retro' ? 'pink' : 'blue'} className="text-base px-3 py-1">
              {game.renderMode === 'retro' ? '🕹️ RETRO' : '🚀 TURBO'}
            </Badge>
            <Badge variant="blue" className="text-lg px-4 py-2">
              Game Code: {gameCode}
            </Badge>
          </div>
          <Badge
            variant={timeRemaining <= 15 ? 'pink' : 'blue'}
            className={`${timeRemaining <= 15 ? 'text-3xl' : 'text-lg'} px-4 py-2 transition-all duration-300`}
            style={timeRemaining <= 15 ? { backgroundColor: '#FF006E' } : {}}
          >
            {formatTime(timeRemaining)} left
          </Badge>
        </div>
      )}

      {/* Top section - Side by side: Target (1/3) + Preview (2/3) OR Leaderboard + Preview in voting */}
      <div className="flex-1 p-4 flex gap-4 min-h-0 overflow-hidden">
        {isGameActive && (
          <>
            {/* Target - 1/3 width */}
            <div className="flex-[1] flex flex-col">
              <p className="font-bold text-sm mb-2 text-gray-600">TARGET DESIGN</p>
              <div className="flex-1 neo-border bg-white overflow-hidden flex flex-col">
                {game?.targetType === 'image' ? (
                  <>
                    {game?.targetDescription && (
                      <div className="bg-neo-yellow border-b-4 border-black px-4 py-2 flex-shrink-0">
                        <p className="font-bold text-center text-sm uppercase">
                          {game.targetDescription}
                        </p>
                      </div>
                    )}
                    <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                      <img
                        src={game?.targetImageUrl}
                        alt="Target"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full p-6 flex items-center justify-center">
                    <p className="text-lg font-bold text-center">
                      {game?.targetText}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview - 2/3 width */}
            <div className="flex-[2] flex flex-col">
              <p className="font-bold text-sm mb-2">Your Beautiful Disaster</p>
              <div className="flex-1 neo-border bg-white overflow-hidden">
                {game && (
                  <PreviewRenderer
                    renderMode={game.renderMode}
                    html={currentHtml}
                    css={currentCss}
                    jsx={game.participants.find(p => p.id === participantId)?.currentCode.jsx}
                    className="w-full h-full border-0"
                  />
                )}
              </div>
            </div>
          </>
        )}

        {isGameOver && (
          <>
            {/* Leaderboard - 1/3 width */}
            <div className="flex-[1] flex flex-col">
              <div className="bg-neo-yellow neo-border px-4 py-2 mb-2 flex-shrink-0">
                <h3 className="font-black text-lg text-center">LIVE STANDINGS</h3>
              </div>
              <div className="overflow-y-auto space-y-2" style={{ maxHeight: '1100px' }}>
                {game?.participants
                  .sort((a, b) => b.voteCount - a.voteCount)
                  .map((p, index) => {
                    const isExpanded = expandedParticipant === p.id;
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        animate={{ zIndex: isExpanded ? 50 : 1 }}
                        className={isExpanded ? 'fixed inset-4 z-50' : ''}
                      >
                        <Card
                          className={`p-2 ${
                            p.id === participantId ? 'bg-neo-pink border-pink-600' : 'bg-white'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold text-sm ${p.id === participantId ? 'text-white' : ''}`}>
                                {index + 1}. {p.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {game?.status === 'voting' && p.id !== participantId && (
                                  <Button
                                    variant={votedFor === p.id ? 'yellow' : 'default'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVote(p.id);
                                    }}
                                    className="text-xs px-2 py-1 h-auto"
                                  >
                                    {votedFor === p.id ? '❤️ Voted' : 'Vote'}
                                  </Button>
                                )}
                                <span className={`font-black ${p.id === participantId ? 'text-white' : ''}`}>
                                  ❤️ {p.voteCount}
                                </span>
                              </div>
                            </div>

                            {/* Preview thumbnail */}
                            <div
                              className={`neo-border bg-white cursor-pointer transition-all relative ${
                                isExpanded ? 'h-[500px] hover:opacity-90' : 'h-32 hover:scale-[1.05]'
                              }`}
                              onClick={() => setExpandedParticipant(isExpanded ? null : p.id)}
                            >
                              {/* Action buttons - top right */}
                              <div className="absolute top-1 right-1 flex gap-1 z-10 pointer-events-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const code = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${p.currentCode.css}\n</style>\n</head>\n<body>\n${p.currentCode.html}\n</body>\n</html>`;
                                    const blob = new Blob([code], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${p.name}-code.html`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center bg-white/90 hover:bg-neo-pink hover:text-white neo-border rounded transition-colors text-xs"
                                  title="Download Code"
                                >
                                  ⬇️
                                </button>
                              </div>

                              {game && (
                                <PreviewRenderer
                                  renderMode={game.renderMode}
                                  html={p.currentCode.html}
                                  css={p.currentCode.css}
                                  jsx={p.currentCode.jsx}
                                  className="w-full h-full border-0 pointer-events-none"
                                />
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
              </div>
            </div>

            {/* Preview - 2/3 width */}
            <div className="flex-[2] flex flex-col">
              <div className="bg-neo-yellow neo-border px-4 py-2 mb-2">
                <h3 className="font-black text-lg text-center">YOUR FINAL MASTERPIECE</h3>
              </div>
              <div className="flex-1 neo-border bg-white overflow-hidden">
                {game && (
                  <PreviewRenderer
                    renderMode={game.renderMode}
                    html={currentHtml}
                    css={currentCss}
                    jsx={game.participants.find(p => p.id === participantId)?.currentCode.jsx}
                    className="w-full h-full border-0"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom section - Prompt input (only show when game is active) */}
      {isGameActive && (
        <div className="flex-[0.5] p-4 border-t-4 border-black bg-white">
          <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold">
              {isGameActive ? 'Tell Claude your dreams and watch them get interpreted weirdly' : 'Prompt Input'}
            </label>
            {isGameActive && game && (
              <div className="flex gap-3 text-sm">
                <span className={`font-bold ${promptHistory.length >= game.maxPrompts ? 'text-neo-pink' : 'text-gray-600'}`}>
                  {promptHistory.length}/{game.maxPrompts} prompts
                </span>
                <span className={`font-bold ${prompt.length > game.maxCharacters ? 'text-neo-pink' : 'text-gray-600'}`}>
                  {prompt.length}/{game.maxCharacters} chars
                </span>
              </div>
            )}
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isGameActive ? 'Make it pink, make it pop...' : 'Waiting for game to start...'}
            disabled={!isGameActive || isProcessing}
            className="flex-1 mb-4"
            maxLength={game?.maxCharacters}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitPrompt();
              }
            }}
          />

          <Button
            variant="pink"
            onClick={handleSubmitPrompt}
            disabled={
              !isGameActive ||
              !prompt.trim() ||
              isProcessing ||
              (game ? promptHistory.length >= game.maxPrompts : false) ||
              (game ? prompt.length > game.maxCharacters : false)
            }
            className="w-full text-xl"
          >
            {isProcessing
              ? 'Claude is cooking... 🪄'
              : game && promptHistory.length >= game.maxPrompts
              ? `Prompt limit reached (${game.maxPrompts}/${game.maxPrompts})`
              : 'VIBE IT 🪄'}
          </Button>

          {promptHistory.length > 0 && (
            <details className="mt-4">
              <summary className="font-bold cursor-pointer text-sm">
                Your chaos log ({promptHistory.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                {promptHistory.slice(-3).reverse().map((p, i) => (
                  <p key={i} className="text-xs text-gray-600 truncate">
                    • {p}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
      )}

      {/* Bottom section - Vote button (only show when voting is open) */}
      {game?.status === 'voting' && (
        <div className="flex-[0.5] p-4 border-t-4 border-black bg-neo-yellow">
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <p className="font-black text-2xl text-center">Voting is open!</p>
            <p className="text-lg text-center">Check out everyone&apos;s creations and vote for your favourite</p>
            <Button
              variant="pink"
              onClick={() => router.push(`/game/${gameCode}/vote`)}
              className="text-xl px-8 py-6"
            >
              VOTE FOR MY FAVOURITE
            </Button>
          </div>
        </div>
      )}

      {/* Final Standings Modal */}
      {showFinalStandings && game && (
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
                          ❤️ {participant.voteCount}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="default"
                className="text-lg py-4 px-8"
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

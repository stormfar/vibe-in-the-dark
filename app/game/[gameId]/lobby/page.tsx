'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSocket, onEvent } from '@/lib/socketClient';
import { fetchGameState } from '@/lib/gameApi';
import { getRandomName } from '@/lib/randomNames';
import { toast } from 'sonner';
import type { Game, GameStatus } from '@/lib/types';

export default function GameLobby() {
  const router = useRouter();
  const params = useParams();
  const gameCode = params.gameId as string; // URL param is gameCode

  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [hasSetInitialName, setHasSetInitialName] = useState(false);

  useEffect(() => {
    // Check if already joined (from localStorage)
    const storedData = localStorage.getItem(`game_${gameCode}`);
    if (storedData) {
      const { participantId: storedParticipantId } = JSON.parse(storedData);
      setParticipantId(storedParticipantId);
      setHasJoined(true);
    }
  }, [gameCode]);

  // Fetch game state to get existing participants (before joining)
  useEffect(() => {
    if (!hasJoined) {
      fetchGameState(gameCode).then(gameState => {
        if (gameState) {
          console.log('Fetched initial game state:', gameState);
          setGame(gameState);
        } else {
          toast.error('Game not found');
        }
      });
    }
  }, [hasJoined, gameCode]);

  // Set random default name only once when game loads
  useEffect(() => {
    if (game && !hasSetInitialName && !hasJoined) {
      const existingNames = game.participants.map(p => p.name);
      const randomName = getRandomName(existingNames);
      setName(randomName);
      setHasSetInitialName(true);
    }
  }, [game, hasSetInitialName, hasJoined]);

  useEffect(() => {
    if (!hasJoined || !participantId) return;

    console.log('Participant joining with gameCode:', gameCode);
    const socket = getSocket(gameCode);

    // Fetch initial game state from API
    fetchGameState(gameCode).then(gameState => {
      if (gameState) {
        console.log('Fetched initial game state:', gameState);
        setGame(gameState);

        // If game has started, redirect to play page
        if (gameState.status === 'active') {
          router.push(`/game/${gameCode}/play`);
        }
      } else {
        toast.error('Game not found');
      }
    });

    // Listen for game state
    const cleanupState = onEvent(socket, 'game:state', (payload) => {
      const gameState = payload as Game;
      setGame(gameState);

      // If game has started, redirect to play page
      if (gameState.status === 'active') {
        router.push(`/game/${gameCode}/play`);
      }
    });

    // Listen for game:statusUpdate
    const cleanupStatus = onEvent(socket, 'game:statusUpdate', (payload) => {
      const update = payload as { status: GameStatus };
      console.log('Participant received game:statusUpdate:', update);
      if (update.status === 'active') {
        console.log('Redirecting to play page with gameCode:', gameCode);
        router.push(`/game/${gameCode}/play`);
      }
    });

    // Listen for new participants joining
    const cleanupJoined = onEvent(socket, 'game:participantJoined', (payload) => {
      const data = payload as { participant: { id: string; name: string } };
      console.log('New participant joined:', data.participant);
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
            html: '<div style="display: flex; align-items: center; justify-content: center; height: 100vh;"><h1>Start proompting!</h1></div>',
            css: '',
          },
          promptHistory: [],
          reactions: { fire: 0, laugh: 0, think: 0, shock: 0, cool: 0 },
          voteCount: 0,
          joinedAt: Date.now(),
          sabotageUsed: false,
          activeSabotages: [],
        };

        return {
          ...prev,
          participants: [...prev.participants, newParticipant],
        };
      });
      toast.success(`${data.participant.name} joined the chaos!`);
    });

    return () => {
      cleanupState();
      cleanupStatus();
      cleanupJoined();
    };
  }, [hasJoined, participantId, gameCode, router]);

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          participantName: name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to join game');
        setIsJoining(false);
        return;
      }

      const data = await response.json();
      setParticipantId(data.participantId);
      setHasJoined(true);

      // Store participant ID in localStorage
      localStorage.setItem(`game_${gameCode}`, JSON.stringify({
        participantId: data.participantId,
      }));

      console.log('Joined game. Code:', gameCode, 'Participant ID:', data.participantId);
      toast.success('Successfully joined!');
    } catch {
      toast.error('Failed to join game');
      setIsJoining(false);
    }
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-neo-bg">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Join the Chaos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block font-bold mb-2">Your Name</label>
              <Input
                placeholder="Make it spicy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={20}
              />
            </div>

            <Button
              variant="pink"
              className="w-full"
              onClick={handleJoin}
              disabled={isJoining || !name.trim()}
            >
              {isJoining ? 'JOINING...' : 'JOIN GAME'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-neo-bg">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-4xl text-center">You&apos;re in! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-bold mb-2">GAME CODE:</p>
            <Badge variant="yellow" className="text-2xl px-6 py-3">
              {gameCode.toUpperCase()}
            </Badge>
          </div>

          {game && (
            <div>
              <p className="font-bold text-lg mb-3 text-center">Game Settings:</p>
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
          )}

          <div className="text-center">
            <p className="text-xl font-bold text-gray-600">
              Waiting for the chaos master to start...
            </p>
          </div>

          {game && game.participants.length > 0 && (
            <div>
              <p className="font-bold mb-3 text-lg">Fellow victims:</p>
              <div className="flex flex-wrap gap-2">
                {game.participants.map((p) => (
                  <Badge
                    key={p.id}
                    variant={p.id === participantId ? 'pink' : 'default'}
                  >
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

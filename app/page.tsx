'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { toast } from 'sonner';
import { TypewriterEffect } from '@/components/aceternity/typewriter-effect';

export default function Home() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [isVoter, setIsVoter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGame = async () => {
    if (!gameCode.trim()) return;

    setIsLoading(true);

    // If voter checkbox is checked, go directly to vote page
    if (isVoter) {
      router.push(`/game/${gameCode.toUpperCase()}/vote`);
      return;
    }

    // Otherwise, check game status to decide where to redirect
    try {
      const response = await fetch(`/api/game/status?gameCode=${gameCode.toUpperCase()}`);

      if (!response.ok) {
        toast.error('Game not found');
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // If game is already active, voting, or finished, redirect to vote page
      if (data.status === 'active' || data.status === 'voting' || data.status === 'finished') {
        router.push(`/game/${gameCode.toUpperCase()}/vote`);
      } else {
        // If game is in lobby or reveal, go to lobby to join as participant
        router.push(`/game/${gameCode.toUpperCase()}/lobby`);
      }
    } catch (error) {
      console.error('Error checking game status:', error);
      toast.error('Failed to check game status');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-neo-bg">
      <main className="flex flex-col items-center gap-12 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center">
          <div className="inline-block neo-border bg-black text-white px-8 py-4 neo-shadow-lg rotate-[-1deg] mb-6">
            <TypewriterEffect
              words={[
                { text: "VIBE", className: "text-6xl md:text-8xl" },
                { text: "IN", className: "text-6xl md:text-8xl" },
                { text: "THE", className: "text-6xl md:text-8xl" },
                { text: "DARK", className: "text-6xl md:text-8xl" },
              ]}
              className="font-[family-name:var(--font-display)]"
              cursorClassName="bg-white"
            />
          </div>
          <p className="text-2xl font-bold mt-8">
            Prompt blindly. Watch others suffer. Vote ruthlessly.
          </p>
        </div>

        {/* Input section */}
        <div className="w-full max-w-md space-y-6">
          <div>
            <Input
              placeholder="Drop that code"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              className="text-center text-2xl"
              maxLength={6}
            />
          </div>

          <div className="flex items-center space-x-2 justify-center">
            <Checkbox
              id="voter"
              checked={isVoter}
              onCheckedChange={(checked) => setIsVoter(checked as boolean)}
            />
            <label
              htmlFor="voter"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I&apos;m just here to vote/react
            </label>
          </div>

          <Button
            onClick={handleJoinGame}
            disabled={!gameCode.trim() || isLoading}
            variant="pink"
            className="w-full text-2xl py-8"
          >
            LET&apos;S GOOOO 🔥
          </Button>
        </div>

        {/* Admin link */}
        <div className="text-center">
          <Link
            href="/admin/new"
            className="text-lg font-bold underline hover:no-underline"
          >
            Or host your own chaos
          </Link>
        </div>
      </main>
    </div>
  );
}

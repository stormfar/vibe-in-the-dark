'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [bgFlash, setBgFlash] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);

  // Play audio immediately on page load
  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/rolling.mp3');
    audioRef.current.volume = 0.7; // Set volume to 70%

    if (!hasPlayedRef.current && audioRef.current) {
      hasPlayedRef.current = true;

      // Try to play audio immediately
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playing successfully!');
            setAudioBlocked(false);
          })
          .catch(err => {
            console.log('Autoplay blocked by browser:', err.message);
            console.log('Audio will play on first user interaction');
            setAudioBlocked(true);
            // Hide message after 5 seconds
            setTimeout(() => setAudioBlocked(false), 5000);
          });
      }

      // Start flashing 1 second after page loads
      setTimeout(() => {
        triggerFlashes();
      }, 1000);
    }

    // Fallback: play audio on any user interaction
    const handleUserInteraction = () => {
      if (audioRef.current && audioRef.current.paused && hasPlayedRef.current) {
        audioRef.current.play()
          .then(() => {
            console.log('Audio playing after user interaction!');
            setAudioBlocked(false);
          })
          .catch(err => console.log('Audio play on interaction failed:', err));
      }
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Random flash effect
  const triggerFlashes = () => {
    const flashCount = Math.floor(Math.random() * 3) + 3; // 3-5 flashes
    let currentFlash = 0;

    const flashInterval = setInterval(() => {
      if (currentFlash >= flashCount) {
        clearInterval(flashInterval);
        setBgFlash(false);
        return;
      }

      setBgFlash(prev => !prev);
      currentFlash++;
    }, Math.random() * 150 + 100); // Random interval between 100-250ms
  };

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
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-75 ${
        bgFlash ? 'bg-black' : 'bg-neo-bg'
      }`}
    >
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
          {audioBlocked && (
            <p className="text-sm text-gray-600 mt-4 animate-pulse">
              🔊 Click anywhere to enable sound
            </p>
          )}
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

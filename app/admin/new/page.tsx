'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getRandomTarget } from '@/lib/randomTargets';
import { toast } from 'sonner';

export default function AdminNewGame() {
  const router = useRouter();
  const [targetType, setTargetType] = useState<'image' | 'text'>('image');
  const [targetImageUrl, setTargetImageUrl] = useState('');
  const [targetText, setTargetText] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [duration, setDuration] = useState(300); // 5 minutes default
  const [maxPrompts, setMaxPrompts] = useState(3); // 3 prompts default
  const [maxCharacters, setMaxCharacters] = useState(1000); // 1000 characters default
  const [isCreating, setIsCreating] = useState(false);

  // Set random default target text on mount
  useEffect(() => {
    setTargetText(getRandomTarget());
  }, []);

  const handleCreateGame = async () => {
    // Validate based on target type
    if (targetType === 'image') {
      if (!targetImageUrl.trim()) {
        toast.error('Please provide a target image URL');
        return;
      }
      // Validate URL format
      if (!targetImageUrl.startsWith('http://') && !targetImageUrl.startsWith('https://')) {
        toast.error('Please enter a valid URL starting with http:// or https://');
        return;
      }
    } else {
      if (!targetText.trim()) {
        toast.error('Please provide a target description');
        return;
      }
    }

    setIsCreating(true);

    try {
      const requestBody: {
        targetType: 'image' | 'text';
        targetImageUrl?: string;
        targetText?: string;
        duration: number;
        maxPrompts: number;
        maxCharacters: number;
        customCode?: string;
        anthropicApiKey?: string;
      } = {
        targetType,
        duration,
        maxPrompts,
        maxCharacters,
      };

      // Add target based on type
      if (targetType === 'image') {
        requestBody.targetImageUrl = targetImageUrl;
      } else {
        requestBody.targetText = targetText.trim();
      }

      // Add custom code if provided
      if (customCode.trim()) {
        requestBody.customCode = customCode.trim().toUpperCase();
      }

      // Add API key if provided
      if (anthropicApiKey.trim()) {
        requestBody.anthropicApiKey = anthropicApiKey.trim();
      }

      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Create game error:', error);
        toast.error(error.error || 'Failed to create game');
        setIsCreating(false);
        return;
      }

      const data = await response.json();
      toast.success('Game created! Redirecting to admin view...');

      // Redirect immediately to admin view
      setTimeout(() => {
        router.push(`/admin/game/${data.gameCode}`);
      }, 500);
    } catch (error) {
      console.error('Create game exception:', error);
      toast.error('Failed to create game');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-neo-bg">
      <Card className="max-w-2xl w-full rotate-[-1deg]">
        <CardHeader>
          <CardTitle className="text-4xl">Birth Some Chaos</CardTitle>
          <CardDescription className="text-lg">
            Create a new game and watch people suffer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Type Toggle */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              The Impossible Target
            </label>
            <div className="flex gap-2 mb-4">
              <Button
                variant={targetType === 'image' ? 'pink' : 'default'}
                onClick={() => setTargetType('image')}
                className="flex-1"
              >
                Image URL
              </Button>
              <Button
                variant={targetType === 'text' ? 'pink' : 'default'}
                onClick={() => setTargetType('text')}
                className="flex-1"
              >
                Text Description
              </Button>
            </div>

            {targetType === 'image' ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Paste a URL to an image (PNG, JPG, etc.) that participants should recreate
                </p>
                <Input
                  placeholder="https://example.com/target-design.png"
                  value={targetImageUrl}
                  onChange={(e) => setTargetImageUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Screenshot a UI, upload to Imgur, and paste the link here
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Describe the design participants should create (e.g., &quot;A hero section with blue gradient and centered text&quot;)
                </p>
                <textarea
                  placeholder="Describe the design challenge..."
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  className="w-full h-32 p-3 border-4 border-black neo-shadow-sm font-mono text-sm resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Be specific but not too easy - &quot;A landing page with a hero section, gradient background, and call-to-action button&quot;
                </p>
              </>
            )}
          </div>

          {/* Custom Game Code (Optional) */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              Custom Code (optional)
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Want a memorable game code? Enter 4-6 letters/numbers (e.g., CHAOS, VIBE23)
            </p>
            <Input
              placeholder="Leave blank for random code"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>

          {/* Anthropic API Key (Optional) */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              Anthropic API Key (optional)
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Use your own Anthropic API key for this game. All participants will use this key.{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neo-blue underline hover:text-neo-pink"
              >
                Get your key here →
              </a>
            </p>
            <Input
              placeholder="sk-ant-api03-..."
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              type="password"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 If not provided, the server&apos;s default API key will be used
            </p>
          </div>

          {/* Duration Slider */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              How long should they suffer?
            </label>
            <input
              type="range"
              min="60"
              max="600"
              step="30"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-4 bg-white border-4 border-black neo-shadow-sm appearance-none cursor-pointer"
            />
            <p className="text-center font-bold mt-2 text-xl">
              {Math.floor(duration / 60)} glorious minute{duration >= 120 ? 's' : ''}
            </p>
          </div>

          {/* Max Prompts Slider */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              Maximum Prompts Per Participant
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Limit how many times each participant can prompt Claude
            </p>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={maxPrompts}
              onChange={(e) => setMaxPrompts(parseInt(e.target.value))}
              className="w-full h-4 bg-white border-4 border-black neo-shadow-sm appearance-none cursor-pointer"
            />
            <p className="text-center font-bold mt-2 text-xl">
              {maxPrompts} prompt{maxPrompts !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Max Characters Slider */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              Maximum Characters Per Prompt
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Limit the length of each prompt submission
            </p>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={maxCharacters}
              onChange={(e) => setMaxCharacters(parseInt(e.target.value))}
              className="w-full h-4 bg-white border-4 border-black neo-shadow-sm appearance-none cursor-pointer"
            />
            <p className="text-center font-bold mt-2 text-xl">
              {maxCharacters} characters
            </p>
          </div>

          {/* Create Button */}
          <Button
            variant="yellow"
            className="w-full text-2xl py-8"
            onClick={handleCreateGame}
            disabled={isCreating}
          >
            {isCreating ? 'CREATING...' : 'CREATE GAME'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

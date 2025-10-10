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
  const [renderMode, setRenderMode] = useState<'retro' | 'turbo'>('retro');
  const [targetType, setTargetType] = useState<'image' | 'text'>('image');
  const [targetImageUrl, setTargetImageUrl] = useState('');
  const [targetText, setTargetText] = useState('');
  const [targetDescription, setTargetDescription] = useState('recreate this');
  const [customCode, setCustomCode] = useState('');
  const [duration, setDuration] = useState(300); // 5 minutes default
  const [maxPrompts, setMaxPrompts] = useState(3); // 3 prompts default
  const [maxCharacters, setMaxCharacters] = useState(1000); // 1000 characters default
  const [isCreating, setIsCreating] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState('');

  // Set random default target text on mount and when render mode changes
  useEffect(() => {
    setTargetText(getRandomTarget(renderMode));
  }, [renderMode]);

  const handleImageUrlBlur = () => {
    if (!targetImageUrl.trim()) {
      setImagePreviewUrl('');
      setImagePreviewError('');
      return;
    }

    // Validate URL format
    if (!targetImageUrl.startsWith('http://') && !targetImageUrl.startsWith('https://')) {
      setImagePreviewError('Please enter a valid URL starting with http:// or https://');
      setImagePreviewUrl('');
      return;
    }

    // Try to load the image
    setImagePreviewError('');
    setImagePreviewUrl(targetImageUrl);
  };

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
        renderMode: 'retro' | 'turbo';
        targetType: 'image' | 'text';
        targetImageUrl?: string;
        targetText?: string;
        targetDescription?: string;
        duration: number;
        maxPrompts: number;
        maxCharacters: number;
        customCode?: string;
      } = {
        renderMode,
        targetType,
        duration,
        maxPrompts,
        maxCharacters,
      };

      // Add target based on type
      if (targetType === 'image') {
        requestBody.targetImageUrl = targetImageUrl;
        requestBody.targetDescription = targetDescription.trim() || 'recreate this';
      } else {
        requestBody.targetText = targetText.trim();
      }

      // Add custom code if provided
      if (customCode.trim()) {
        requestBody.customCode = customCode.trim().toUpperCase();
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
          {/* Render Mode Selection */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              Choose Your Weapon
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Select how participants will build their masterpiece
            </p>
            <div className="flex gap-2">
              <Button
                variant={renderMode === 'retro' ? 'pink' : 'default'}
                onClick={() => setRenderMode('retro')}
                className={`flex-1 flex-col h-auto py-4 ${renderMode === 'retro' ? 'ring-4 ring-neo-pink ring-offset-2' : ''}`}
              >
                <span className="text-xl font-black">🕹️ RETRO MODE</span>
                <span className="text-xs font-normal mt-1">HTML/CSS - Like it&apos;s 1999</span>
                {renderMode === 'retro' && <span className="text-xs mt-1">✓ Selected</span>}
              </Button>
              <Button
                variant={renderMode === 'turbo' ? 'blue' : 'default'}
                onClick={() => setRenderMode('turbo')}
                className={`flex-1 flex-col h-auto py-4 ${renderMode === 'turbo' ? 'ring-4 ring-neo-blue ring-offset-2' : ''}`}
              >
                <span className="text-xl font-black">🚀 TURBO MODE</span>
                <span className="text-xs font-normal mt-1">Components - Full React chaos</span>
                {renderMode === 'turbo' && <span className="text-xs mt-1">✓ Selected</span>}
              </Button>
            </div>
          </div>

          {/* Target Type Toggle */}
          <div>
            <label className="block font-bold mb-2 text-lg">
              The Impossible Target
            </label>
            <div className="flex gap-2 mb-4">
              <Button
                variant={targetType === 'image' ? 'pink' : 'default'}
                onClick={() => setTargetType('image')}
                className={`flex-1 ${targetType === 'image' ? 'ring-4 ring-neo-pink ring-offset-2' : ''}`}
              >
                📷 Image URL {targetType === 'image' && '✓'}
              </Button>
              <Button
                variant={targetType === 'text' ? 'pink' : 'default'}
                onClick={() => setTargetType('text')}
                className={`flex-1 ${targetType === 'text' ? 'ring-4 ring-neo-pink ring-offset-2' : ''}`}
              >
                📝 Text Description {targetType === 'text' && '✓'}
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
                  onBlur={handleImageUrlBlur}
                  type="url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Screenshot a UI, upload to Imgur, and paste the link here
                </p>

                {/* Description/Instruction */}
                <div className="mt-4">
                  <label className="block font-bold mb-2">
                    Instruction Text (optional)
                  </label>
                  <p className="text-sm text-gray-600 mb-2">
                    Tell participants what to do with the target image
                  </p>
                  <Input
                    placeholder="recreate this"
                    value={targetDescription}
                    onChange={(e) => setTargetDescription(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This text will appear above the target image (e.g., &quot;recreate this&quot;, &quot;build something similar to this&quot;)
                  </p>
                </div>

                {/* Image Preview */}
                {imagePreviewUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-bold mb-2">Preview:</p>
                    <div className="neo-border bg-white p-4">
                      <img
                        src={imagePreviewUrl}
                        alt="Target preview"
                        className="max-w-full h-auto max-h-64 mx-auto"
                        onError={() => {
                          setImagePreviewError('Failed to load image. Please check the URL.');
                          setImagePreviewUrl('');
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {imagePreviewError && (
                  <div className="mt-2 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-sm">
                    ⚠️ {imagePreviewError}
                  </div>
                )}
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
              Want a memorable game code? Enter any letters/numbers (e.g., VIBE, CHAOS, PARTY2024)
            </p>
            <Input
              placeholder="Leave blank for random 4-char code"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              maxLength={20}
            />
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

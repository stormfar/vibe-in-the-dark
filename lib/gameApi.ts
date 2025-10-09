import type { Game } from './types';

/**
 * Fetch initial game state from Next.js API
 * This is used when clients first connect, instead of getting state from PartyKit
 */
export async function fetchGameState(gameCode: string): Promise<Game | null> {
  try {
    const response = await fetch(`/api/game/state?gameCode=${gameCode}`);

    if (!response.ok) {
      console.error('Failed to fetch game state:', response.statusText);
      return null;
    }

    const game = await response.json();
    return game;
  } catch (error) {
    console.error('Error fetching game state:', error);
    return null;
  }
}

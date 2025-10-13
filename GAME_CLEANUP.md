# Game Cleanup & Code Reuse

## The Problem

When someone creates a game with a custom code (e.g., "DEMO"), that code is locked forever if the game isn't cleaned up. Future attempts to use "DEMO" fail.

## The Solution

**Automatic cleanup** when games finish, allowing custom codes to be reused.

## How It Works

### 1. Creating a Game with Custom Code

```typescript
// First time: Creates game with code "DEMO"
await createGame('turbo', 'image', 300, 'image.jpg', undefined, undefined, false, 'DEMO');
// ✅ Success! Game created

// Later: Try to reuse "DEMO" after previous game finished
await createGame('turbo', 'image', 300, 'image2.jpg', undefined, undefined, false, 'DEMO');
// ✅ Old finished game is deleted, new game created with "DEMO"

// But if game is still active:
await createGame('turbo', 'image', 300, 'image3.jpg', undefined, undefined, false, 'DEMO');
// ❌ Error: "Custom game code already in use by an active game"
```

### 2. Automatic Cleanup Options

You have **three cleanup strategies**:

#### Option A: Manual Cleanup (Current Default)
- Finished games stay in database
- Admin can reuse custom codes (old game is deleted automatically)
- 2-hour cleanup still runs for very old games

#### Option B: Auto-Delete on Winner Declaration
```typescript
// In app/api/game/declare-winner/route.ts
const result = await declareWinner(gameCode, 30); // Delete after 30 minutes
```

This gives participants time to see results, then cleans up automatically.

#### Option C: Immediate Deletion After Voting
```typescript
// After declaring winner
await declareWinner(gameCode);
await deleteGame(gameCode); // Immediate cleanup
```

Use this if you want codes available immediately.

## Code Changes Made

### 1. `createGame()` - Smart Code Reuse

```typescript
// lib/gameStateDB.ts - Lines 57-66

if (customCode) {
  const existingGame = existing.game_data as Game;
  if (existingGame.status === 'finished') {
    // Old game finished? Delete it and reuse the code!
    console.log(`Deleting finished game with code ${code} to allow reuse`);
    await deleteGame(code);
    break; // Code is now available
  } else {
    // Game still active? Reject
    throw new Error('Custom game code already in use by an active game');
  }
}
```

### 2. `deleteGame()` - New Function

```typescript
// lib/gameStateDB.ts - Lines 486-500

export async function deleteGame(gameCode: string): Promise<boolean> {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('code', gameCode.toUpperCase());

  if (error) {
    console.error('[gameStateDB] Error deleting game:', error);
    return false;
  }

  console.log(`[gameStateDB] Deleted game: ${gameCode}`);
  return true;
}
```

### 3. `declareWinner()` - Optional Auto-Delete

```typescript
// lib/gameStateDB.ts - Lines 432-473

export async function declareWinner(
  gameCode: string,
  autoDeleteAfterMinutes?: number // ← New optional parameter
): Promise<...> {
  // ... declare winner logic ...

  // Optional: Schedule auto-deletion
  if (autoDeleteAfterMinutes && autoDeleteAfterMinutes > 0) {
    const deleteAfterMs = autoDeleteAfterMinutes * 60 * 1000;

    setTimeout(async () => {
      console.log(`Auto-deleting finished game ${gameCode}`);
      await deleteGame(gameCode);
    }, deleteAfterMs);
  }

  return { winnerId, finalStandings };
}
```

## Usage Examples

### Example 1: Weekly Event with Same Code

```typescript
// Monday event
createGame('turbo', 'image', 300, 'monday.jpg', undefined, undefined, false, 'WEEKLY');
// ... play game ...
declareWinner('WEEKLY', 30); // Auto-delete after 30 minutes

// Tuesday event (30+ minutes later)
createGame('turbo', 'image', 300, 'tuesday.jpg', undefined, undefined, false, 'WEEKLY');
// ✅ Works! Old game was deleted
```

### Example 2: Demo Games

```typescript
// Demo at 10am
createGame('turbo', 'image', 300, 'demo1.jpg', undefined, undefined, false, 'DEMO');
// ... finish game ...
declareWinner('DEMO', 5); // Delete after 5 minutes

// Demo at 11am
createGame('turbo', 'image', 300, 'demo2.jpg', undefined, undefined, false, 'DEMO');
// ✅ Works! Previous demo was cleaned up
```

### Example 3: Immediate Reuse

```typescript
// Game 1
createGame('turbo', 'image', 300, 'game1.jpg', undefined, undefined, false, 'TEST');
// ... finish game ...
await declareWinner('TEST');
await deleteGame('TEST'); // Immediate cleanup

// Game 2 (seconds later)
createGame('turbo', 'image', 300, 'game2.jpg', undefined, undefined, false, 'TEST');
// ✅ Works immediately!
```

## Enabling Auto-Delete (Optional)

If you want to enable auto-deletion, update the API route:

```typescript
// app/api/game/declare-winner/route.ts

export async function POST(request: NextRequest) {
  try {
    const { gameCode } = await request.json();

    // Option 1: Delete after 30 minutes (recommended)
    const result = await declareWinner(gameCode, 30);

    // Option 2: Delete after 5 minutes (faster turnover)
    // const result = await declareWinner(gameCode, 5);

    // Option 3: Immediate deletion (not recommended - participants can't see results)
    // const result = await declareWinner(gameCode);
    // await deleteGame(gameCode);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not declare winner' },
        { status: 400 }
      );
    }

    // ... emit winner event ...

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Declare winner error:', error);
    return NextResponse.json(
      { error: 'Failed to declare winner' },
      { status: 500 }
    );
  }
}
```

## Cleanup Strategies Summary

| Strategy | When to Use | Setup |
|----------|-------------|-------|
| **Manual** | You rarely reuse codes | No changes needed (default) |
| **30-min Auto** | Weekly events, demos | `declareWinner(code, 30)` |
| **5-min Auto** | Rapid testing, workshops | `declareWinner(code, 5)` |
| **Immediate** | Testing, dev environments | `declareWinner(code)` + `deleteGame(code)` |

## What About Random Codes?

Random codes (generated when no custom code provided) don't need cleanup as urgently because:
- 4 characters = 1,679,616 possible codes
- Low collision risk
- 2-hour cleanup still runs

But auto-deletion still helps keep your database tidy!

## Database Impact

**Storage saved per deleted game:**
- Typical game: ~10-50KB (depending on participants)
- 100 games = 1-5MB
- Free tier: 500MB total

You can store **thousands of games** before hitting limits, but cleanup keeps things tidy.

## Monitoring

Check logs for cleanup events:

```
[gameStateDB] Deleting finished game with code DEMO to allow reuse
[gameStateDB] Deleted game: DEMO
[gameStateDB] Scheduling deletion of game DEMO in 30 minutes
[gameStateDB] Auto-deleting finished game DEMO
```

## Rollback (If Issues)

If auto-deletion causes problems, simply remove the parameter:

```typescript
// Remove auto-delete
const result = await declareWinner(gameCode); // No second parameter
```

Existing scheduled deletions will complete, but no new ones will be scheduled.

---

**Current Behaviour:**
- ✅ Custom codes can be reused after game finishes
- ✅ Active games are protected from being overwritten
- ✅ Auto-deletion is optional (disabled by default)
- ✅ 2-hour cleanup still runs for very old games

**Confidence: 95%** - This is the standard pattern for temporary game sessions.

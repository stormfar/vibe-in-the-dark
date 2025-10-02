# 🔧 Troubleshooting Guide

## Issue 1: Admin View Stuck on "Loading..."

### What's happening:
- URL shows correct game ID (e.g., `/admin/game/e9QNpRsyU3zlDCdeWg3Hp`)
- Server logs show: "Admin joining game {gameId}"
- But page shows "Loading..." forever

### Debug Steps:

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Check for these logs:**
   - "Admin useEffect running for gameId: ..."
   - "Socket status: true/false"
   - "Socket connected!"
   - "Received game state: ..."

3. **What the logs tell you:**
   - If NO "Socket connected!" → Socket.io isn't connecting
   - If "Socket connected!" but NO "Received game state" → Server not finding the game
   - If "Received game state: null" or "undefined" → Game doesn't exist in memory

### Common Fixes:

**Fix A: Socket.io not connecting**
```bash
# Check if server is actually running Socket.io
# Look for "Ready on http://localhost:3000" in terminal
```

**Fix B: Game not found**
- The game is stored in memory, so if you restart the server, it's lost
- Create a new game and immediately navigate to admin view
- Don't refresh the page after creating - click "Go to Admin View" button

**Fix C: Clear cache and restart**
```bash
# Stop server (Ctrl+C)
rm -rf .next
npm run dev
```

---

## Issue 2: Participant Join Gets 404

### What's happening:
- Game code entered: "HJJPQ3"
- URL shows: `/game/HJJPQ3/lobby`
- Server logs: "POST /api/game/join 404 in 36ms"
- Error in console

### Why this happens:
Next.js might not have compiled the route yet, or there's a routing conflict.

### Debug Steps:

1. **Check the browser console for the actual error**
2. **Check server terminal for route compilation:**
   ```
   ✓ Compiled /api/game/join in XXXms
   ```

3. **Try accessing the API directly:**
   Open a new tab and try:
   ```
   http://localhost:3000/api/game/join
   ```
   You should see a 405 Method Not Allowed (not 404)

### Common Fixes:

**Fix A: Route not compiled**
```bash
# Stop and restart server
Ctrl+C
npm run dev
```

**Fix B: Clear Next.js cache**
```bash
rm -rf .next
npm run dev
```

**Fix C: Check TypeScript errors**
```bash
# In a separate terminal
npx tsc --noEmit
```

---

## Issue 3: General Connection Problems

### Symptoms:
- "Failed to connect to game server" toast
- No socket logs in console
- Server shows no socket connections

### Fixes:

**1. Check environment variables:**
```bash
cat .env
```
Should show:
```
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

**2. Check server is running custom server (not Next.js default):**
Your terminal should show:
```
> tsx watch server.ts
> Ready on http://localhost:3000
Client connected: {socketId}
```

NOT just:
```
⚠ Port 3000 is already in use
```

**3. Restart everything:**
```bash
# Kill all node processes
pkill -f node

# Clear everything
rm -rf .next node_modules/.cache

# Restart
npm run dev
```

---

## Testing Flow (Step by Step)

### 1. Start Fresh
```bash
# Terminal 1
npm run dev
```

Wait for "Ready on http://localhost:3000"

### 2. Create Game
1. Open browser: http://localhost:3000/admin/new
2. Paste image URL: `https://picsum.photos/800/600`
3. Click "CREATE GAME"
4. **Immediately** click "Go to Admin View" (don't refresh!)

### 3. Check Admin View
1. Browser console should show:
   ```
   Admin useEffect running for gameId: ...
   Socket status: true
   Socket connected!
   Received game state: {status: 'lobby', ...}
   ```

2. You should see lobby screen with game code

### 4. Join as Participant
1. Open **new incognito/private window** (Cmd+Shift+N)
2. Go to: http://localhost:3000
3. Enter the game code you see in admin view
4. Click "LET'S GOOOO"
5. Enter name, click "JOIN GAME"

### 5. Expected Behaviour
- Participant should see lobby with their name
- Admin view should show toast: "{Name} joined the chaos!"
- Server logs: "Participant {id} joining game {gameId}"

---

## Quick Diagnostic Commands

```bash
# Check if server is running
lsof -i :3000

# Check for TypeScript errors
npx tsc --noEmit

# Check for TypeScript errors in server
npx tsc --project tsconfig.server.json --noEmit

# Force rebuild
rm -rf .next && npm run dev

# Check environment variables
cat .env

# View server logs (if running in background)
tail -f nohup.out
```

---

## Still Not Working?

### Get Full Diagnostic Info:

1. **Server Terminal Output** - Copy full output
2. **Browser Console** - Copy all errors/warnings
3. **Network Tab** - Check failed requests
4. **URL you're visiting** - Copy exact URL
5. **Steps you took** - Exactly what you clicked

### Common "Gotchas":

- ❌ Refreshing the admin page after creating game → Game lost (in-memory storage)
- ❌ Using same browser window for admin and participant → Cookie/storage conflicts
- ❌ Not waiting for server to fully start → Routes not compiled
- ❌ Typo in game code → 404 on game lookup
- ❌ Missing ANTHROPIC_API_KEY → Prompts won't work (but join should still work)

---

**Need more help?** Share your:
1. Complete terminal output
2. Browser console logs
3. Exact steps you're taking

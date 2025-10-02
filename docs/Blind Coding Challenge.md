# PRD: Vibe in the Dark

## Overview
A real-time multiplayer web app for a hackathon game where participants attempt to replicate a target UI using only AI prompts (Claude API), without seeing their code. Built with Next.js, TypeScript, shadcn/ui, Tailwind CSS, and **Neobrutalism UI aesthetic**.

---

## Core Concept
- **Target Reveal:** Participants see a target design for 30 seconds
- **Blind Coding:** Target disappears; participants only see their rendered preview (not code)
- **AI-Driven:** All code changes happen via text prompts to Claude
- **Real-time Sync:** All previews update live on admin's grid view
- **Public Voting:** Anyone can vote for their favorite
- **Duration:** 5-minute rounds
- **Winner:** Admin declares winner based on votes, sparkles ensue ✨

---

## User Roles

### 1. Admin (Game Host)
- Creates game
- Uploads target image
- Controls game flow (start/stop)
- Views all participants' previews in grid layout on projector
- Can click to enlarge/shrink individual previews
- Declares winner after voting

### 2. Participant (Player)
- Joins game via code/link
- Sees target for 30 seconds
- Submits prompts to AI
- Sees only their rendered preview (no code)

### 3. Voter (Anyone with link)
- Views grid of all participant previews
- Votes for favorite (one vote per device)
- Watches chaos unfold

---

## User Flows

### Admin Flow
1. Visit `/admin/new`
2. Upload target image (or paste URL)
3. Set game duration (default 5 min)
4. Generate shareable game code (e.g., `VIBE-2024`)
5. Share game URL with participants
6. Navigate to `/admin/game/[gameId]` - see lobby
7. When ready, click **"Unleash the Chaos"** button
8. Watch grid view with all participants' live previews
9. Click any preview to enlarge it (click again to shrink)
10. Countdown timer displayed prominently
11. At 0:00, game locks, **"Open Voting"** button appears
12. Click "Open Voting" → voting enabled, share voter URL
13. Watch votes roll in on grid (vote counts visible)
14. Click **"Crown the Champion"** button
15. Grid reorders by vote count, winner gets sparkle animation ✨
16. Export/screenshot final results

### Participant Flow
1. Visit `/` (landing page)
2. Enter game code → redirected to `/game/[gameId]/lobby`
3. Enter name (cheeky validation: "Make it spicy" if too boring)
4. Wait for game to start - see other participants joining
5. Game starts: see target image for 30 seconds with countdown
6. Target disappears, replaced with:
   - Live preview iframe (top half of screen)
   - Prompt input field (bottom)
7. Type prompts, hit Enter or click **"Vibe It"**
8. Loading state: "Claude is cooking..."
9. Preview updates with new HTML/CSS
10. Iterate until time runs out
11. Game ends: "Pencils down! Time to face the jury."
12. Preview freezes, wait for results

### Voter Flow
1. Receive voter URL: `/game/[gameId]/vote`
2. See grid of all participant attempts
3. Click **"This one slaps 🔥"** button on favorite
4. Vote recorded, button becomes **"You voted for this"**
5. Watch vote counts update in real-time
6. See winner declared with sparkle animation

---

## Technical Architecture

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui + **Neobrutalism aesthetic**
- **Real-time:** Socket.io (server + client)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **State:** In-memory (global Map on server)

### Neobrutalism Design System

**Colors:**
- Primary: Hot pink (#FF006E) with thick black borders
- Secondary: Electric yellow (#FFBE0B)
- Accent: Cyber blue (#3A86FF)
- Background: Off-white (#FFFBF5)
- Text: Pure black (#000000)

**Styling Rules:**
- All buttons: 4px black border, 6px offset shadow
- Cards: 3px black border, 8px shadow
- Hover states: Shift shadow, slight rotate
- Typography: Bold, chunky fonts (Space Grotesk, Archivo Black)
- No subtle transitions - snap into place
- Playful rotations (-1deg to 2deg)

**Example Button:**
```tsx
<Button className="bg-pink-500 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 font-black text-lg">
  LET'S GO
</Button>
```

### Project Structure
```
/app
  /page.tsx                    # Landing page
  /game/[gameId]/lobby/page.tsx
  /game/[gameId]/play/page.tsx
  /game/[gameId]/vote/page.tsx  # NEW: Voter view
  /admin/new/page.tsx
  /admin/game/[gameId]/page.tsx
  /api/game/create/route.ts
  /api/game/join/route.ts
  /api/prompt/route.ts
  /api/vote/route.ts            # NEW: Vote endpoint
/lib
  /gameState.ts               # In-memory game storage
  /socket.ts                  # Socket.io server setup
  /claude.ts                  # Claude API wrapper
/components
  /ui/*                       # shadcn components
  /game/*                     # Custom game components
  /sparkles.tsx               # NEW: Winner animation
```

---

## Data Models

### Game
```typescript
interface Game {
  id: string;                    // UUID
  code: string;                  // 6-char code (e.g., "VIBE42")
  status: 'lobby' | 'reveal' | 'active' | 'voting' | 'finished';
  targetImageUrl: string;
  duration: number;              // seconds (default 300)
  startTime: number | null;      // timestamp
  votingStartTime: number | null; // NEW: when voting opened
  createdAt: number;             // timestamp
  participants: Participant[];
  votes: Vote[];                 // NEW: voting data
  winnerId: string | null;       // NEW: declared winner
}
```

### Participant
```typescript
interface Participant {
  id: string;                    // UUID
  name: string;
  socketId: string;
  currentCode: {
    html: string;
    css: string;
  };
  promptHistory: {
    prompt: string;
    timestamp: number;
  }[];
  voteCount: number;             // NEW: real-time vote tally
  joinedAt: number;
}
```

### Vote
```typescript
interface Vote {
  id: string;
  participantId: string;
  voterFingerprint: string;      // Device fingerprint for one-vote-per-device
  timestamp: number;
}
```

---

## API Routes

### POST `/api/game/create`
**Body:**
```json
{
  "targetImageUrl": "https://...",
  "duration": 300
}
```
**Response:**
```json
{
  "gameId": "abc-123",
  "gameCode": "VIBE42",
  "adminUrl": "/admin/game/abc-123",
  "voterUrl": "/game/abc-123/vote"
}
```

### POST `/api/game/join`
**Body:**
```json
{
  "gameCode": "VIBE42",
  "participantName": "John"
}
```
**Response:**
```json
{
  "gameId": "abc-123",
  "participantId": "xyz-789",
  "playUrl": "/game/abc-123/play"
}
```

### POST `/api/prompt`
**Body:**
```json
{
  "gameId": "abc-123",
  "participantId": "xyz-789",
  "prompt": "Make the button bigger and blue"
}
```
**Response:**
```json
{
  "html": "<div>...</div>",
  "css": ".btn { ... }"
}
```

### POST `/api/vote`
**Body:**
```json
{
  "gameId": "abc-123",
  "participantId": "xyz-789",
  "voterFingerprint": "hash-of-device-info"
}
```
**Response:**
```json
{
  "success": true,
  "newVoteCount": 7
}
```
**Errors:**
- 403: Already voted
- 400: Voting not open yet

---

## WebSocket Events

### Server → Client

**`game:statusUpdate`**
```json
{
  "status": "reveal" | "active" | "voting" | "finished",
  "startTime": 1234567890,
  "timeRemaining": 300
}
```

**`game:participantJoined`**
```json
{
  "participant": {
    "id": "xyz",
    "name": "John"
  }
}
```

**`preview:update`**
```json
{
  "participantId": "xyz-789",
  "html": "<div>...</div>",
  "css": ".btn { ... }"
}
```

**`vote:update`** (NEW)
```json
{
  "participantId": "xyz-789",
  "voteCount": 7
}
```

**`game:winnerDeclared`** (NEW)
```json
{
  "winnerId": "xyz-789",
  "finalStandings": [
    { "participantId": "xyz", "name": "John", "voteCount": 12 },
    { "participantId": "abc", "name": "Jane", "voteCount": 8 }
  ]
}
```

### Client → Server

**`game:join`**
```json
{
  "gameId": "abc-123",
  "participantId": "xyz-789"
}
```

**`prompt:submit`**
```json
{
  "gameId": "abc-123",
  "participantId": "xyz-789",
  "prompt": "Add a gradient background"
}
```

---

## UI Specifications

### Landing Page (`/`)
**Vibe:** Chaotic energy, bold typography

- **Header:** "VIBE IN THE DARK" (huge, rotated -1deg, thick shadow)
- **Subheader:** "Code with AI. See nothing. Vibe everything."
- **Input:** Game code field
  - Placeholder: "Drop that code"
  - Neobrutalism border, offset shadow
- **Button:** "LET'S GOOOO 🔥" (hot pink, chunky)
- **Link:** "Or host your own chaos" → `/admin/new`

### Admin: Create Game (`/admin/new`)
**Vibe:** Professional chaos organizer

- **Header:** "Birth Some Chaos"
- **Form:**
  - **Target image upload:**
    - Label: "The Impossible Target"
    - Drag-drop zone with chunky dashed border
    - Or URL input: "Paste a link if you're lazy"
  - **Duration slider:**
    - Label: "How long should they suffer?"
    - 1-10 min range
    - Value display: "5 glorious minutes"
  - **Button:** "CREATE GAME" (electric yellow)
- **Result card:**
  - Game code in HUGE text with copy button
  - "Share this with your victims"
  - Two links:
    - Admin view (hot pink button)
    - Voter link (cyber blue button)

### Admin: Game View (`/admin/game/[gameId]`)

**Lobby state:**
- **Header:** "GAME CODE:" (in massive text)
- **Code display:** Huge code with pulsing border
- **Participant list:**
  - Title: "Brave souls joining:"
  - Each participant: name with small avatar/initial
  - Live count: "7 victims ready"
- **Button:** "UNLEASH THE CHAOS" (giant, hot pink, pulsing)

**Active state:**
- **Top bar:**
  - Countdown timer: Huge digits, changes color at <30s (yellow) and <10s (red)
  - "END GAME" button (top right, small for now)
  
- **Grid layout:**
  - CSS Grid, responsive columns (3-4 based on count)
  - Each cell:
    - Thick black border (4px)
    - Participant name in bold at top
    - Preview iframe (sandboxed)
    - Hover: lift effect with bigger shadow
    - Click: expand to 2x size (overlay mode), click again to shrink
    - Small "👁️ Watch" indicator on hover

**Voting state:**
- **Top bar:**
  - "VOTING OPEN" badge (pulsing)
  - Vote counts visible on each card
  - "CROWN THE CHAMPION" button (glowing, hot pink)
  
- **Grid:**
  - Same as active, but with vote count badges (top-right corner)
  - Real-time vote updates with bounce animation
  - Clicking doesn't expand, but shows current vote count in tooltip

**Finished state:**
- **Reorder animation:** Grid items smoothly reorder by vote count
- **Winner (first position):**
  - Sparkle/confetti animation overlay
  - Crown emoji 👑 badge
  - Double-size card initially
  - Pulsing gold border (thick)
- **Rest ordered by votes descending**
- **Buttons:**
  - "PLAY AGAIN" (hot pink)
  - "EXPORT RESULTS" (cyber blue)

### Participant: Lobby (`/game/[gameId]/lobby`)
**Vibe:** Nervous excitement

- **Header:** "You're in! 🎉"
- **Game code display:** "Game: VIBE42" (in case they want to share)
- **Status:** "Waiting for the chaos master to start..."
- **Participant list:** "Fellow victims:"
  - Other participant names
  - Live updating
- **Target preview:**
  - Small thumbnail
  - Label: "Sneak peek at what you're about to fail at"

### Participant: Play (`/game/[gameId]/play`)

**Layout:**
- **Top half (60% height):**
  - **During reveal (first 30s):**
    - Target image (full width)
    - Countdown overlay: "MEMORIZE THIS: 27s"
    - Dramatic color change at 5s
  - **After reveal:**
    - Live preview iframe
    - Label: "Your Beautiful Disaster"
    - Timer in corner: "3:45 left to pivot"
  
- **Bottom half (40% height):**
  - **Prompt section:**
    - Large textarea (neobrutalism border)
    - Placeholder: "Tell Claude your dreams and watch them get interpreted weirdly"
    - Character count (optional): "Say more words"
  - **Button:** "VIBE IT 🪄" (hot pink, full width, chunky)
  - **Loading state:** 
    - Button becomes: "Claude is cooking..." with spinner
    - Disable input
  - **Prompt history** (small, collapsible):
    - "Your chaos log" (expandable)
    - Last 3 prompts shown

**Countdown warnings:**
- At 60s: "ONE MINUTE LEFT" banner (yellow)
- At 10s: "FINAL SECONDS" banner (red, pulsing)
- At 0s: 
  - "PENCILS DOWN" overlay
  - Preview freezes
  - Input disabled
  - Message: "Time to face the music. The public will judge you now."

### Voter View (`/game/[gameId]/vote`)
**Vibe:** Judge Judy energy

**Before voting opens:**
- **Message:** "Voting hasn't started yet. Hold your horses."
- **Grid preview:** Can see previews but no voting buttons

**During voting:**
- **Header:** "WHO DID IT BEST?"
- **Instruction:** "Click to vote. Choose wisely. Or don't. We're not your boss."
- **Grid layout:**
  - Similar to admin view
  - Each card has participant name + preview
  - **Vote button:** "THIS ONE SLAPS 🔥" (bottom of card)
    - Hot pink initially
    - On click: becomes green "YOU VOTED FOR THIS ✓"
    - Disabled for other cards after voting
  - Vote count badge (top-right): "❤️ 7 votes"
  - Real-time updates as votes come in

**After winner declared:**
- Grid reorders automatically
- Winner has sparkle animation
- Message: "THE PEOPLE HAVE SPOKEN"
- Final vote counts visible

---

## Claude API Integration

### System Prompt
```
You are helping a participant in a coding challenge. They can only see their rendered HTML preview, not the code itself.

Given their current HTML and CSS, and their natural language prompt, generate ONLY the updated HTML and CSS.

Rules:
- Output ONLY valid HTML and CSS
- Keep it simple and static (no JavaScript)
- Make incremental changes based on their prompt
- If they ask for something unclear, make your best guess and be creative
- Wrap CSS in a <style> tag inside the HTML
- Have fun with it - this is a game!

Current code:
HTML: {currentHtml}
CSS: {currentCss}

User prompt: {userPrompt}

Output format (respond with ONLY this, no explanation):
<html>
<style>
/* CSS here */
</style>
<body>
<!-- HTML here -->
</body>
</html>
```

### Parsing Claude Response
- Extract everything between `<html>` and `</html>`
- Parse out `<style>` block as CSS
- Rest is HTML
- Store separately in participant.currentCode

### Error Handling
- If Claude API fails: show "Claude got confused. Try again with different words?"
- If parse fails: keep previous code, show "That prompt broke Claude's brain 🤯"
- Rate limit: 1 prompt per 3 seconds per participant
- Show error toast (neobrutalism style with thick border)

---

## Preview Rendering

### Iframe Implementation
```tsx
<iframe
  srcDoc={`
    <!DOCTYPE html>
    <html>
      <head>
        <style>${css}</style>
      </head>
      <body>${html}</body>
    </html>
  `}
  sandbox="allow-same-origin"
  className="w-full h-full border-4 border-black"
/>
```

### Sandbox Security
- No `allow-scripts` (prevent XSS)
- Static HTML/CSS only
- Safe for untrusted AI-generated code

### Expanded Preview (Admin)
- On click: overlay modal with 2x size preview
- Semi-transparent backdrop
- Click outside or X button to close
- Participant name in header
- Current vote count (during voting)

---

## Voting System

### Fingerprinting
Use a combination for device fingerprinting:
- User agent
- Screen resolution
- Timezone
- Canvas fingerprint (simple hash)
- Store as SHA-256 hash

**Library suggestion:** Use `@fingerprintjs/fingerprintjs` or similar

### Vote Flow
1. Voter clicks "THIS ONE SLAPS" button
2. Client generates fingerprint
3. POST to `/api/vote` with participantId + fingerprint
4. Server validates:
   - Game is in "voting" status
   - Fingerprint hasn't voted yet
   - Participant exists
5. Record vote, increment count
6. Emit `vote:update` via WebSocket
7. All clients update vote count badge

### Vote Display
- Real-time counter on each preview card
- Animate count changes (bounce effect)
- Admin view shows all votes
- Voter view shows all votes
- Participant view: DON'T show votes (keep suspense)

### Declaring Winner
1. Admin clicks "CROWN THE CHAMPION"
2. Server:
   - Changes game status to "finished"
   - Sets winnerId to participant with most votes
   - Emits `game:winnerDeclared` event
3. All clients:
   - Reorder grid by vote count (smooth animation)
   - Apply sparkle animation to winner
   - Lock further voting

---

## Sparkle Animation

### Winner Effects
- Confetti falling from top (use `canvas-confetti` library)
- Golden pulsing border around winner card
- Crown emoji 👑 badge (animated entrance)
- Card slightly larger than others
- Subtle rotation oscillation

### CSS Animation
```css
@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(-1deg); }
  50% { transform: scale(1.05) rotate(1deg); }
}

.winner-card {
  animation: sparkle 2s ease-in-out infinite;
  border-color: gold;
  border-width: 6px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}
```

### Confetti Trigger
```tsx
import confetti from 'canvas-confetti';

confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 }
});
```

---

## Game State Management

### In-Memory Store (`/lib/gameState.ts`)
```typescript
const games = new Map<string, Game>();

export const gameState = {
  createGame: (targetImageUrl: string, duration: number) => Game,
  getGame: (gameId: string) => Game | undefined,
  addParticipant: (gameId: string, participant: Participant) => void,
  updateParticipantCode: (gameId: string, participantId: string, code: CodeUpdate) => void,
  startGame: (gameId: string) => void,
  openVoting: (gameId: string) => void,
  addVote: (gameId: string, participantId: string, voterFingerprint: string) => boolean,
  declareWinner: (gameId: string) => string, // returns winnerId
  endGame: (gameId: string) => void,
};
```

### Cleanup
- Games auto-delete 2 hours after creation
- Run cleanup interval every 10 minutes

---

## Edge Cases & Validations

### Game Creation
- Validate image URL (check if accessible)
- Generate unique 6-char codes (retry if collision)
- Max duration: 10 minutes
- Error messages: "That image link is dead. Try another?"

### Joining Game
- Reject if game status is "voting" or "finished"
- Reject duplicate participant names (suggest adding number)
- Max 20 participants per game
- Name validation:
  - Min 2 chars: "Too short. We need at least 2 letters."
  - Max 20 chars: "Brevity, friend. Keep it under 20."
  - No profanity: "Keep it PG, champ."

### During Game
- Disable prompts when time = 0
- Handle participant disconnect: keep their last preview
- Handle admin disconnect: game continues
- Rate limit prompts (3 sec cooldown per participant)
- If too many rapid prompts: "Slow down! Claude needs to breathe."

### Voting
- One vote per fingerprint per game
- Can't vote for yourself (if fingerprint matches participant socket)
- Voting only available when status = "voting"
- Error toast: "You already voted, greedy!"

### Claude API
- Timeout: 20 seconds
- Retry once on 5xx errors
- Fall back to previous code if parse fails
- Rate limit handling (429): Show "Claude is overwhelmed. Wait a sec."

---

## UI Components Needed (shadcn)

Install these with Neobrutalism overrides:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
```

**Customize in `components/ui` for Neobrutalism:**
- Add thick borders
- Hard shadows
- Bold colors
- Chunky fonts

---

## Cheeky Copy Examples

### Button CTAs
- "LET'S GOOOO 🔥"
- "UNLEASH THE CHAOS"
- "VIBE IT 🪄"
- "THIS ONE SLAPS 🔥"
- "CROWN THE CHAMPION"
- "I'M FEELING LUCKY"

### Error Messages
- "Claude got confused. Try again with different words?"
- "That prompt broke Claude's brain 🤯"
- "Slow down! Claude needs to breathe."
- "You already voted, greedy!"
- "That image link is dead. Try another?"
- "Too short. We need at least 2 letters."

### Status Messages
- "Claude is cooking..."
- "Waiting for the chaos master to start..."
- "PENCILS DOWN"
- "Time to face the music."
- "THE PEOPLE HAVE SPOKEN"
- "Your Beautiful Disaster"
- "Fellow victims:"

### Instructions
- "Tell Claude your dreams and watch them get interpreted weirdly"
- "Click to vote. Choose wisely. Or don't. We're not your boss."
- "Sneak peek at what you're about to fail at"
- "Say more words"

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_WS_URL=http://localhost:3000
NODE_ENV=development
```

---

## Deployment Notes

### Recommended: Railway or Render
- Socket.io requires persistent server
- Easy WebSocket support
- Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Alternative: Vercel + Pusher
- Replace Socket.io with Pusher Channels
- Use Vercel Serverless Functions
- More complex but Vercel-native

---

## Success Criteria

**MVP Complete When:**
- ✅ Admin can create game with target image
- ✅ Participants can join via code
- ✅ Target shows for 30s, then disappears
- ✅ Participants can send prompts → Claude → preview updates
- ✅ Admin sees live grid of all previews
- ✅ Admin can click to enlarge/shrink individual previews
- ✅ Game timer works and ends game at 0:00
- ✅ Voting system: public can vote, one vote per device
- ✅ Real-time vote counts update
- ✅ Admin declares winner → grid reorders, sparkles appear
- ✅ Neobrutalism styling throughout
- ✅ Cheeky copy everywhere

**Nice-to-Haves (Post-MVP):**
- Prompt history replay for each participant
- Export final results as image grid
- Sound effects for timer warnings
- Leaderboard page with past games
- Multiple rounds support

---

## Testing Checklist

- [ ] Create game with valid/invalid image URLs
- [ ] Join with 10+ browser tabs (simulate participants)
- [ ] Start game → 30s reveal works correctly
- [ ] Send prompts → previews update in <5 seconds
- [ ] Admin grid shows all previews in real-time
- [ ] Admin can click to enlarge/shrink previews
- [ ] Test countdown timer and auto-end at 0:00
- [ ] Open voting → vote buttons appear
- [ ] Vote with different devices/browsers
- [ ] Verify one-vote-per-device enforcement
- [ ] Vote counts update in real-time
- [ ] Declare winner → reorder animation + sparkles
- [ ] Test participant disconnect/reconnect
- [ ] Test Claude API error handling
- [ ] Test rate limiting on prompts and votes
- [ ] Mobile responsive check (all views)
- [ ] Neobrutalism styling consistent across all pages

---

## Development Priority

**Phase 1: Core Loop**
1. In-memory game state
2. Admin: create game
3. Participant: join game
4. Basic Socket.io setup
5. Claude API integration + prompt endpoint
6. Preview iframe rendering

**Phase 2: Game Flow**
7. Lobby → Reveal (30s) → Active states
8. Game countdown timer
9. End game / freeze previews
10. Admin grid view with real-time updates

**Phase 3: Voting System**
11. Voter view page
12. Fingerprint generation
13. Vote API endpoint
14. Real-time vote count updates via WebSocket
15. One-vote-per-device validation

**Phase 4: Winner Declaration**
16. "Open Voting" and "Crown Champion" admin controls
17. Grid reorder animation by vote count
18. Sparkle/confetti winner animation
19. Final standings display

**Phase 5: Admin Features**
20. Click to enlarge/shrink previews in grid

**Phase 6: Polish**
21. Neobrutalism styling (all components)
22. Cheeky copy throughout
23. Error handling and toasts
24. Loading states
25. Responsive layout
26. Accessibility (keyboard nav, screen readers)

---

## Additional Technical Notes

### Neobrutalism Implementation
- Use Tailwind's arbitrary values for thick shadows: `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`
- Custom fonts via `next/font/google`: Space Grotesk, Archivo Black
- Rotation utilities: `rotate-[-1deg]`, `rotate-[2deg]`
- Transition on transforms, not shadows (performance)

### Grid Reorder Animation
Use Framer Motion or CSS transitions:
```tsx
<motion.div
  layout
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  {/* Participant card */}
</motion.div>
```

### Expand/Shrink Preview
- Use React state to track expanded preview ID
- Render expanded preview in portal/modal
- Animate size change with CSS transform
- Click outside to close (or X button)

---

## Questions for Claude AI (Building This)

- Use Next.js App Router with TypeScript
- All server components by default, use 'use client' when needed
- Socket.io: Install `socket.io` and `socket.io-client`
- Claude API: Install `@anthropic-ai/sdk`
- Fingerprinting: Install `@fingerprintjs/fingerprintjs`
- Confetti: Install `canvas-confetti`
- Animation: Install `framer-motion` (optional, can use CSS)
- Keep components modular and well-typed
- Add comments for complex state management
- Use Tailwind's JIT for Neobrutalism custom shadows

---

**LET'S BUILD THIS CHAOS MACHINE! 🔥✨**
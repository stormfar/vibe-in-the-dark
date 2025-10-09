# 🎨 Vibe in the Dark

A real-time multiplayer web app where participants attempt to replicate a target UI using only AI prompts (Claude API), without seeing their code. Built with Next.js, TypeScript, PartyKit, and Neobrutalism UI aesthetic.

## 🎯 Game Concept

- **Target Reveal:** Participants see a target design for 30 seconds
- **Blind Coding:** Target disappears; participants only see their rendered preview (not code)
- **AI-Driven:** All code changes happen via text prompts to Claude
- **Real-time Sync:** All previews update live on admin's grid view
- **Public Voting:** Anyone can vote for their favourite
- **Duration:** Configurable 1-10 minute rounds
- **Winner:** Admin declares winner based on votes, sparkles ensue ✨

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Holidu LiteLLM access credentials (CLIENT_ID and CLIENT_SECRET)
- GitHub account (for PartyKit deployment)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   CLIENT_ID=gx-vibeinthedark-litellm-client
   CLIENT_SECRET=your-client-secret-here
   NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
   NODE_ENV=development
   ```

3. **Run the development servers:**
   ```bash
   npm run dev
   ```

   This starts both the Next.js dev server (port 3000) and PartyKit dev server (port 1999) concurrently.

   Alternatively, run them separately:
   ```bash
   npm run dev:next   # Next.js only
   npm run dev:party  # PartyKit only
   ```

4. **Open your browser:**
   - Main app: [http://localhost:3000](http://localhost:3000)
   - Admin: [http://localhost:3000/admin/new](http://localhost:3000/admin/new)

## 📖 How to Play

### For Admins (Game Hosts)

1. Visit `/admin/new`
2. Upload a target image URL
3. Set game duration (1-10 minutes)
4. Get your game code and share it with participants
5. Wait for participants to join in the lobby
6. Click **"UNLEASH THE CHAOS"** to start
7. Watch the grid view with live previews
8. When time's up, click **"OPEN VOTING"**
9. Share the voter URL with your audience
10. Click **"CROWN THE CHAMPION"** to declare the winner!

### For Participants

1. Visit the homepage
2. Enter the game code
3. Enter your name
4. Wait in the lobby for the game to start
5. Memorise the target image (30 seconds)
6. Use AI prompts to recreate it (you only see your preview, not code!)
7. Iterate until time runs out
8. Wait for voting results

### For Voters

1. Visit the voter URL shared by the admin
2. View all participant submissions
3. Click **"THIS ONE SLAPS 🔥"** to vote
4. Watch vote counts update in real-time
5. See the winner declared!

## 🏗️ Technical Architecture

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + Neobrutalism design system
- **Real-time:** PartyKit (WebSocket infrastructure on Cloudflare)
- **AI:** Holidu LiteLLM (claude-sonnet-4-20250514 via proxy)
- **State:** In-memory (Map on server)
- **Animations:** Framer Motion
- **Voting:** FingerprintJS for one-vote-per-device
- **Confetti:** canvas-confetti

### Key Features Implemented

✅ Real-time WebSocket communication via PartyKit
✅ In-memory game state management
✅ Claude AI prompt processing
✅ Neobrutalism UI components
✅ Device fingerprinting for voting
✅ Admin grid view with expandable previews
✅ Participant lobby and play views
✅ Voter view with live vote counts
✅ Winner declaration with confetti
✅ Sandboxed iframe previews (no JavaScript execution)
✅ Rate limiting on prompts (3 seconds)
✅ Game cleanup (auto-delete after 2 hours)

## 📁 Project Structure

```
/app
  /page.tsx                           # Landing page
  /admin/new/page.tsx                 # Game creation
  /admin/game/[gameId]/page.tsx       # Admin view (lobby + grid)
  /game/[gameId]/lobby/page.tsx       # Participant lobby
  /game/[gameId]/play/page.tsx        # Participant play view
  /game/[gameId]/vote/page.tsx        # Voter view
  /api/*                              # API routes
/lib
  /types.ts                           # TypeScript interfaces
  /gameState.ts                       # In-memory state management
  /socket.ts                          # Server-side PartyKit HTTP utilities
  /socketClient.ts                    # Client-side PartySocket wrapper
  /claude.ts                          # Claude API wrapper
  /fingerprint.ts                     # FingerprintJS wrapper
/components/ui                        # Neobrutalism UI components
/partykit
  /server.ts                          # PartyKit WebSocket server
partykit.json                         # PartyKit configuration
```

## 🎨 Neobrutalism Design System

Bold Neobrutalism aesthetic with:

- **Colours:** Hot Pink, Electric Yellow, Cyber Blue, Off-white, Pure Black
- **Typography:** Space Grotesk (body), Archivo Black (display)
- **Styling:** 4-6px black borders, hard drop shadows, playful rotations

## 🔧 Development

### Running the Servers

```bash
npm run dev          # Run both Next.js and PartyKit dev servers
npm run dev:next     # Run Next.js dev server only
npm run dev:party    # Run PartyKit dev server only
npm run build        # Build Next.js for production
npm start            # Run Next.js production build
npm run deploy:party # Deploy PartyKit server
```

### Environment Variables

- `CLIENT_ID` - Holidu LiteLLM client ID (required for AI prompt processing)
- `CLIENT_SECRET` - Holidu LiteLLM client secret (required for AI prompt processing)
- `NEXT_PUBLIC_PARTYKIT_HOST` - PartyKit server URL
  - Development: `localhost:1999`
  - Production: `your-project-name.your-github-username.partykit.dev`
- `NODE_ENV` - development | production

## 🚢 Deployment

### Deploying to Vercel + PartyKit

This app uses a **split deployment architecture**:
- **Next.js frontend/backend** → Deploy to Vercel
- **Real-time WebSocket layer** → Deploy to PartyKit (runs on Cloudflare)

#### 1. Deploy Next.js to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy to Vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

**Environment Variables on Vercel:**
- `CLIENT_ID` - Your LiteLLM client ID
- `CLIENT_SECRET` - Your LiteLLM client secret
- `NEXT_PUBLIC_PARTYKIT_HOST` - Your PartyKit URL (see step 2)
- `NODE_ENV` - `production`

#### 2. Deploy PartyKit Server

```bash
# Deploy to PartyKit (requires GitHub authentication on first run)
npm run deploy:party
```

This will:
1. Open a browser for GitHub authentication (first time only)
2. Deploy your PartyKit server to Cloudflare
3. Provide a URL like: `vibe-in-the-dark.your-github-username.partykit.dev`

**Important:** After deploying PartyKit, update the `NEXT_PUBLIC_PARTYKIT_HOST` environment variable in Vercel with your PartyKit URL (without `http://` or `https://`).

Example:
```
NEXT_PUBLIC_PARTYKIT_HOST=vibe-in-the-dark.yourname.partykit.dev
```

#### 3. Redeploy Vercel

After updating the environment variable, trigger a redeployment on Vercel so the Next.js app connects to your PartyKit server.

### Testing Local Development

1. Start both servers: `npm run dev`
2. Next.js will be available at `http://localhost:3000`
3. PartyKit will be available at `http://localhost:1999`
4. The frontend will automatically connect to the local PartyKit server

### CI/CD (Optional)

For automatic PartyKit deployments on git push, follow the [PartyKit GitHub Actions guide](https://docs.partykit.io/guides/deploying-your-partykit-server/).

## 🐛 Known Limitations

- Games are stored in memory (not persistent across restarts)
- Max 20 participants per game
- No authentication system
- Voting is device-based (can be circumvented)
- LiteLLM API costs apply per prompt
- PartyKit has usage limits on the free tier (see [PartyKit pricing](https://partykit.io/pricing))

## 📄 Licence

MIT

---

**Made with chaos and Neobrutalism vibes** 🔥✨

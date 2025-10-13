# 🎨 Vibe in the Dark

A real-time multiplayer web app where participants attempt to replicate a target UI using only AI prompts (Claude API), without seeing their code. Built with Next.js, TypeScript, Supabase Realtime, and Neobrutalism UI aesthetic.

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
- Supabase account (free tier available at https://supabase.com)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Sign up for a free Supabase account at https://supabase.com
   - Create a new project
   - Wait for your project to be provisioned (~2 minutes)
   - Go to Project Settings > API
   - Note down your:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **Anon/Public Key** (starts with `eyJ...`)
     - **Service Role Key** (starts with `eyJ...`, keep this secret!)

3. **Run database migration:**
   - Go to your Supabase dashboard → SQL Editor
   - Copy the contents of `supabase/migrations/001_create_games_table.sql`
   - Paste and run the SQL
   - This creates the games table that stores game state

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   CLIENT_ID=gx-vibeinthedark-litellm-client
   CLIENT_SECRET=your-client-secret-here

   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   NODE_ENV=development
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
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
- **Real-time:** Supabase Realtime (Broadcast feature)
- **Storage:** Supabase Database (PostgreSQL with JSONB)
- **AI:** Holidu LiteLLM (claude-sonnet-4-20250514 via proxy)
- **Animations:** Framer Motion
- **Voting:** FingerprintJS for one-vote-per-device
- **Confetti:** canvas-confetti

### Key Features Implemented

✅ Real-time communication via Supabase Realtime Broadcast
✅ Persistent game state in Supabase Database
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
  /gameStateDB.ts                     # Supabase database state management
  /socket.ts                          # Server-side Supabase Realtime utilities
  /socketClient.ts                    # Client-side Supabase Realtime wrapper
  /claude.ts                          # Claude API wrapper
  /fingerprint.ts                     # FingerprintJS wrapper
/supabase
  /migrations                         # SQL migrations
/components/ui                        # Neobrutalism UI components
```

## 🎨 Neobrutalism Design System

Bold Neobrutalism aesthetic with:

- **Colours:** Hot Pink, Electric Yellow, Cyber Blue, Off-white, Pure Black
- **Typography:** Space Grotesk (body), Archivo Black (display)
- **Styling:** 4-6px black borders, hard drop shadows, playful rotations

## 🔧 Development

### Running the Server

```bash
npm run dev      # Run Next.js dev server
npm run build    # Build Next.js for production
npm start        # Run Next.js production build
```

### Environment Variables

- `CLIENT_ID` - Holidu LiteLLM client ID (required for AI prompt processing)
- `CLIENT_SECRET` - Holidu LiteLLM client secret (required for AI prompt processing)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (from Project Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key (from Project Settings > API)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (from Project Settings > API, keep secret!)
- `NODE_ENV` - development | production

## 🚢 Deployment

### Deploying to Vercel

This app can be deployed entirely to Vercel since Supabase Realtime handles the real-time layer.

#### 1. Deploy to Vercel

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
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `NODE_ENV` - `production`

#### 2. Supabase Setup

No additional deployment needed! Supabase is a hosted service. Just ensure your environment variables are set correctly in Vercel.

**Supabase Free Tier Limits:**
- **Realtime:** 200 concurrent connections
- **Bandwidth:** 5GB egress per month
- **Messages:** Generous limits for realtime messaging
- Perfect for development and production games
- **No database setup required** - we only use Broadcast feature

If you need more, Supabase Pro is $25/month with significantly higher limits.

### Why Supabase over Pusher?

- **More reliable:** 6ms median latency (vs Pusher's instability)
- **Better performance:** 224k messages/sec capability
- **Cost-effective:** Free tier is more generous
- **Better DX:** Simpler API, fewer connection issues
- **Vercel-native:** Works perfectly on serverless

### Testing Local Development

1. Start the server: `npm run dev`
2. Next.js will be available at `http://localhost:3000`
3. The frontend will automatically connect to Supabase's hosted Realtime service

## 🐛 Known Limitations

- Games are auto-deleted after 2 hours (by design for temporary games)
- Max 20 participants per game
- No authentication system
- Voting is device-based (can be circumvented)
- LiteLLM API costs apply per prompt
- Supabase free tier: 200 concurrent connections, 500MB database

## 📄 Licence

MIT

---

**Made with chaos and Neobrutalism vibes** 🔥✨

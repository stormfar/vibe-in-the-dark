# Future Features: Chaos Enhancement Ideas

This document contains ideas to make "Vibe in the Dark" more unhinged and entertaining for participants. These are not currently implemented but saved for future consideration.

---

## 1. Code Sabotage Power-Ups 🔥

**Concept:**
Every 30 seconds during active gameplay, each participant gets a one-time sabotage power-up they can activate on a random opponent.

**Sabotage Options:**
- **Comic Sans Everything** - Converts all fonts to Comic Sans
- **Rotate 180°** - Flips the entire layout upside down
- **Blink Mode** - Makes everything blink/flash
- **Inverted Colors** - Swaps all colors to their opposites
- **Giant Text** - Multiplies all font sizes by 3x
- **Shake It Up** - Adds aggressive shake animation to everything

**Key Details:**
- Victim doesn't know who sabotaged them or when it happened
- Creates paranoia and social chaos
- Admin can see sabotage events in real-time feed
- Sabotages persist until victim uses a prompt to fix it

**Implementation Complexity:** Medium
- Need sabotage power-up UI in participant view
- CSS injection system for applying effects
- Socket events for real-time sabotage delivery
- Admin logging/activity feed

**UX Impact:**
- 😈 Chaos Level: HIGH
- 🎭 Entertainment: Very High
- 🎮 Gameplay Balance: May frustrate skilled players
- 💡 Recommendation: Add toggle for "sabotage mode" games

---

## 2. Surprise Prompt Hijacking 🎲

**Concept:**
At random intervals (20% chance), the game secretly intercepts a participant's prompt and adds a chaotic modifier before sending it to Claude.

**Hijack Examples:**
- Original: "Make the button blue"
- Hijacked: "Make the button blue, but make it look like a 90s GeoCities page"

Other modifiers:
- "...in the style of a ransom note"
- "...but everything is cats"
- "...but use only emoji instead of text"
- "...inspired by a toddler's crayon drawing"
- "...as if designed by someone who hates good design"

**Key Details:**
- Participant sees their original prompt in the UI
- Claude receives the hijacked version
- Creates confusion: "Wait, I didn't ask for that!"
- Adds mystery element: "Why is everything cats?"

**Implementation Complexity:** Easy
- Simple string concatenation in prompt processing
- Random number generator for trigger
- No new UI needed

**UX Impact:**
- 😈 Chaos Level: MEDIUM
- 🎭 Entertainment: High
- 🎮 Gameplay Balance: Frustrating but hilarious
- 💡 Recommendation: Show "HIJACKED" indicator after the prompt executes

---

## 3. Code Roulette: Random Undo 🎰

**Concept:**
At unpredictable intervals, a random participant loses their last 1-2 prompts worth of progress.

**Execution:**
- Dramatic screen shake
- Loud sound effect
- Big message: "THE CHAOS GODS HAVE SPOKEN"
- Code reverts to state from 1-2 prompts ago
- Everyone sees it happen (visible in admin view)

**Key Details:**
- Happens 2-3 times per game
- Never in the last 60 seconds (too cruel)
- Participant can see what code they lost
- Creates shared "oh no" moments

**Implementation Complexity:** Easy
- Track prompt history (already done)
- Socket event for undo trigger
- UI animation for dramatic reveal

**UX Impact:**
- 😈 Chaos Level: VERY HIGH
- 🎭 Entertainment: Hilarious for spectators, painful for victim
- 🎮 Gameplay Balance: Can ruin someone's game
- 💡 Recommendation: Only for casual/party game modes, not serious competitions

---

## 4. Live Anonymous Heckling 📣

**Concept:**
Voters and spectators can send anonymous "heckles" (short messages) that appear as notifications on participant screens during the game.

**Heckle Examples:**
- "My grandma codes better"
- "Have you tried turning it off and on again?"
- "Bold choice"
- "Are you doing this with your feet?"
- "This is... something"
- "I've seen worse (not much worse though)"

**Key Details:**
- Limited to 3 heckles per voter (prevent spam)
- Pre-set heckle options + custom option
- Appears as toast notification on participant screen
- Participants can't respond or see who sent it
- Admin can see all heckles in activity log

**Implementation Complexity:** Medium
- New heckle submission UI in voter view
- Rate limiting per voter fingerprint
- Toast notification system for participants
- Moderation system for custom heckles (profanity filter)

**UX Impact:**
- 😈 Chaos Level: MEDIUM
- 🎭 Entertainment: Very High
- 🎮 Gameplay Balance: Doesn't affect code, just mental state
- 💡 Recommendation: **TOP PICK** - Easy to implement, adds immediate social chaos, memorable

---

## 5. Cursed Prompt Mode 😈

**Concept:**
Admin can toggle "Cursed Mode" where prompts are deliberately misinterpreted in hilarious ways.

**Cursed Behaviours:**
- **Backwards Interpretation** (20% chance): "Make text bigger" → makes it smaller
- **Prompt Swap** (15% chance): Two participants' prompts get swapped
- **Opposite Day** (15% chance): All color/size requests become opposites
- **Literal Interpretation** (10% chance): "Make it pop" → adds popcorn images everywhere
- **Over-Enthusiastic** (20% chance): "Add a button" → adds 47 buttons

**Key Details:**
- Optional toggle in admin game creation
- Shows "🔮 CURSED MODE" indicator to all players
- Creates complete bedlam
- Some prompts work normally to keep false hope alive

**Implementation Complexity:** Medium-Hard
- Prompt transformation logic
- Different prompt patterns for each curse type
- Need to maintain some playability
- Custom Claude system prompts for each curse

**UX Impact:**
- 😈 Chaos Level: EXTREME
- 🎭 Entertainment: Maximum chaos, may be too much
- 🎮 Gameplay Balance: Completely breaks normal gameplay
- 💡 Recommendation: Special event mode only, not default

---

## Priority Ranking

Based on implementation effort vs entertainment value:

1. **Live Anonymous Heckling** ⭐⭐⭐⭐⭐
   - Easy to implement
   - Instant social chaos
   - Doesn't break core gameplay
   - Creates memorable moments

2. **Surprise Prompt Hijacking** ⭐⭐⭐⭐
   - Very easy to implement
   - Adds mystery/confusion
   - Moderate chaos level

3. **Code Sabotage Power-Ups** ⭐⭐⭐
   - Medium complexity
   - Very fun but could frustrate
   - Best with toggle option

4. **Code Roulette: Random Undo** ⭐⭐
   - Easy to implement
   - Very harsh
   - Only for casual games

5. **Cursed Prompt Mode** ⭐
   - Complex implementation
   - Extreme chaos
   - Niche appeal

---

## Implementation Notes

### General Principles:
- All chaos features should be **toggleable** by admin
- Add visual indicators when chaos is enabled
- Maintain game balance - chaos should enhance fun, not destroy it
- Consider competitive vs party game modes
- Log all chaos events for post-game highlights

### Technical Considerations:
- Socket events for real-time chaos delivery
- Rate limiting to prevent abuse
- Admin override/undo capabilities
- Activity log/timeline for transparency
- Ensure chaos doesn't break core game mechanics

---

## Community Ideas

Have more chaos ideas? Add them here!

### Suggested Format:
**Feature Name:**
- Concept:
- Implementation:
- Chaos Level:
- Your Name/Date:

---

*Document Created: 2025-10-10*
*Last Updated: 2025-10-10*

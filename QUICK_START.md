# 🚀 Quick Start Guide

## Before You Begin

You need **Holidu LiteLLM credentials**. Add them to your `.env` file:
```
CLIENT_ID=gx-vibeinthedark-litellm-client
CLIENT_SECRET=your-client-secret-here
NEXT_PUBLIC_WS_URL=http://localhost:3000
NODE_ENV=development
```

## What to Put in "The Impossible Target" Field

You need a **direct URL to an image file** (PNG, JPG, etc.). Here are some options:

### Option 1: Use a Test Image (Easiest)

For quick testing, use any of these public images:

```
https://picsum.photos/800/600
```

Or a simple UI mockup:
```
https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800
```

### Option 2: Upload Your Own Image

1. Take a screenshot of a UI design you want participants to recreate
2. Upload it to one of these free services:
   - **Imgur**: https://imgur.com/upload
   - **Cloudinary**: https://cloudinary.com
   - **ImgBB**: https://imgbb.com
3. Copy the **direct image URL** (must end in .png, .jpg, etc.)
4. Paste into the field

### Option 3: Use a UI Screenshot

Screenshot any interesting UI from:
- A website
- A design tool (Figma, etc.)
- A mobile app

Then upload using Option 2.

## Running the Game

1. **Start the server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Create a game**:
   - Visit: http://localhost:3000/admin/new
   - Paste an image URL
   - Set duration (1-10 minutes)
   - Click "CREATE GAME"
   - Copy the game code (e.g., "ABC123")

3. **Join as participants** (open multiple tabs/browsers):
   - Visit: http://localhost:3000
   - Enter the game code
   - Enter your name
   - Wait in lobby

4. **Start the game** (admin tab):
   - Click "UNLEASH THE CHAOS"
   - Participants see the target for 30 seconds
   - Then they can start prompting Claude

5. **Try AI prompts** (as participant):
   - "Create a large pink button in the centre"
   - "Add a heading that says Welcome"
   - "Make the background blue with white text"
   - "Add a card with rounded corners"

6. **End and vote**:
   - When time's up, admin clicks "OPEN VOTING"
   - Share voter URL: http://localhost:3000/game/{gameId}/vote
   - Vote for your favourite
   - Admin clicks "CROWN THE CHAMPION"
   - Confetti! 🎉

## Troubleshooting

### "400 Bad Request" when creating game
- Make sure the URL starts with `http://` or `https://`
- Make sure it's a direct link to an image file
- Test the URL in your browser first

### Server won't start
- Check if port 3000 is already in use
- Make sure you ran `npm install`
- Check for TypeScript errors

### LiteLLM API errors
- Check your CLIENT_ID and CLIENT_SECRET are correct in `.env`
- Check the LiteLLM proxy is accessible
- Rate limiting: Wait 3 seconds between prompts

### WebSocket connection issues
- Make sure `NEXT_PUBLIC_WS_URL` in `.env` matches your server URL
- Check browser console for connection errors
- Try refreshing the page

## Example Image URLs for Testing

Simple geometric shapes:
```
https://placehold.co/800x600/FF006E/white?text=TARGET
```

Random placeholder:
```
https://picsum.photos/seed/vibetest/800/600
```

## Tips

- Use simple UI designs as targets (buttons, forms, cards)
- More complex designs = more challenging
- 5 minutes is a good duration for testing
- Test with at least 2-3 participants for best experience
- The voter view is the most impressive part - share it widely!

---

**Have fun and let the chaos begin!** 🔥

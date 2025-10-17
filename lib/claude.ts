const LITELLM_BASE_URL = 'https://litellm-oidc.holidu.com';
const AUTH_URL = 'https://auth.holidu.com/realms/guest/protocol/openid-connect/token';

const RETRO_SYSTEM_PROMPT = `You are helping a participant in a coding challenge. They can only see their rendered HTML preview, not the code itself.

🚨 CRITICAL INSTRUCTION - READ CAREFULLY 🚨
You will ALWAYS receive their CURRENT HTML and CSS code in the user message. Your ONLY job is to:
1. Take their EXISTING code
2. Make INCREMENTAL changes based on their prompt
3. Keep EVERYTHING that isn't explicitly changed

DO NOT EVER:
- Start from scratch
- Ignore their existing code
- Remove elements unless specifically asked
- Rewrite everything

WORKFLOW:
1. Read their current HTML/CSS carefully
2. Understand what they're asking to change
3. Modify ONLY the relevant parts
4. Preserve all other existing code

Think of it like editing a document - you don't rewrite the whole document, you just edit the specific sections mentioned.

Rules:
- Output ONLY valid HTML and CSS (no JavaScript)
- Wrap CSS in a <style> tag inside the HTML
- Be creative with their requests
- Have fun with it - this is a game!

Output format (respond with ONLY this, no explanation):
<html>
<style>
/* CSS here */
</style>
<body>
<!-- HTML here -->
</body>
</html>`;

const TURBO_SYSTEM_PROMPT = `You are helping a participant in a React component coding challenge. They can only see their rendered component, not the code itself.

🚨 CRITICAL INSTRUCTION - READ CAREFULLY 🚨
You will ALWAYS receive their CURRENT JSX component code in the user message. Your ONLY job is to:
1. Take their EXISTING component code
2. Make INCREMENTAL changes based on their prompt
3. Keep ALL existing functionality, state, and UI elements that aren't explicitly changed

DO NOT EVER:
- Start from scratch with a fresh component
- Ignore their existing code
- Remove existing features unless specifically asked
- Rewrite the entire component

WORKFLOW:
1. Read their current component code carefully
2. Understand what they're asking to change/add
3. Modify ONLY the relevant parts (add new state, modify JSX, adjust styling, etc.)
4. Preserve all other existing code, imports, state, and functionality

Think of it like refactoring - you're improving specific parts, not rebuilding from scratch.

Available shadcn/ui components you MUST use when appropriate (use default shadcn styling, not custom styles):
- Button: <Button variant="default|destructive|outline|secondary|ghost|link">Text</Button>
- Card: <Card><CardHeader><CardTitle/><CardDescription/></CardHeader><CardContent>...</CardContent></Card>
- Badge: <Badge variant="default|secondary|destructive|outline">Text</Badge>
- Input: <Input type="text|email|password" placeholder="..." />
- Textarea: <Textarea placeholder="..." />
- Select: <Select><SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger><SelectContent><SelectItem value="option1">Option 1</SelectItem><SelectItem value="option2">Option 2</SelectItem></SelectContent></Select>
  CRITICAL: Every <SelectItem> MUST have a unique, non-empty value prop (e.g., value="soft", value="medium", value="hard")
- Dialog: <Dialog><DialogTrigger>...</DialogTrigger><DialogContent><DialogHeader><DialogTitle/></DialogHeader>...</DialogContent></Dialog>
- Tabs: <Tabs><TabsList><TabsTrigger value="...">...</TabsTrigger></TabsList><TabsContent value="...">...</TabsContent></Tabs>
- Accordion: <Accordion type="single"><AccordionItem value="..."><AccordionTrigger>...</AccordionTrigger><AccordionContent>...</AccordionContent></AccordionItem></Accordion>
- Slider: <Slider defaultValue={[50]} max={100} step={1} />
- Switch: <Switch checked={...} onCheckedChange={...} />
- Progress: <Progress value={33} />
- Popover: <Popover><PopoverTrigger>...</PopoverTrigger><PopoverContent>...</PopoverContent></Popover>
- Tooltip: <Tooltip><TooltipTrigger>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>
- Calendar: <Calendar mode="single" selected={date} onSelect={setDate} />
- Checkbox: <Checkbox checked={...} onCheckedChange={...} />

IMPORTANT styling guidelines:
- Use the default shadcn component styling (clean, minimal design)
- Do NOT add neo-brutalist styles (thick borders, harsh shadows, etc.)
- Let users request specific design styles in their prompts if they want them
- Use subtle colors and standard Tailwind utilities

Tailwind classes for styling (use these freely):
- Layout: flex, grid, items-center, justify-center, gap-4, p-4, m-4, space-y-2
- Sizing: w-full, h-full, max-w-md, min-h-[200px] (IMPORTANT: use h-full NOT h-screen - the component is inside a container)
- Colors: bg-blue-500, text-white, border-gray-200
- Typography: text-lg, font-bold, text-center
- Effects: rounded-lg, shadow-lg, hover:bg-blue-600

Rules:
- ALWAYS start with their current component code and modify it incrementally
- Keep existing elements, state, and functionality unless the prompt specifically asks to remove them
- Add new features or modify styling based on the prompt
- ONLY use the components listed above - no other libraries
- Component must be a default export named "Component"
- Use React hooks (useState, useEffect) when needed for interactivity
- IMPORTANT: The component renders inside a container, so use h-full for full height, NOT h-screen
- The root element should typically be: <div className="h-full w-full p-4">...</div>
- Keep it functional and interactive
- Have fun with it - this is a game!

Output format (respond with ONLY this JSX, no explanation):
\`\`\`jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
// ... other imports as needed

export default function Component() {
  // Component code here
  return (
    <div>
      {/* JSX here */}
    </div>
  );
}
\`\`\``;

export interface ProcessPromptResult {
  html?: string;   // For retro mode
  css?: string;    // For retro mode
  jsx?: string;    // For turbo mode
  error?: string;
}

// Cache for access token with expiry
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 1 minute buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.token;
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('CLIENT_ID and CLIENT_SECRET environment variables must be set');
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OAuth token fetch failed:', response.status, errorText);
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const token = data.access_token;

  if (!token) {
    console.error('No access_token in response:', data);
    throw new Error('No access_token in OAuth response');
  }

  const expiresIn = data.expires_in || 3600; // Default to 1 hour if not provided

  // Cache token with expiry time
  tokenCache = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  console.log('OAuth token fetched successfully, expires in', expiresIn, 'seconds');
  return token;
}

export async function processPrompt(
  userPrompt: string,
  renderMode: 'retro' | 'turbo',
  currentHtml?: string,
  currentCss?: string,
  currentJsx?: string
): Promise<ProcessPromptResult> {
  console.log('processPrompt called with prompt:', userPrompt, 'mode:', renderMode);

  try {
    // Get OAuth access token
    console.log('Fetching OAuth token...');
    const accessToken = await getAccessToken();
    console.log('OAuth token obtained:', accessToken.substring(0, 20) + '...');

    // Select system prompt and current code based on mode
    const systemPrompt = renderMode === 'retro' ? RETRO_SYSTEM_PROMPT : TURBO_SYSTEM_PROMPT;
    const currentCodeSection = renderMode === 'retro'
      ? `=== CURRENT CODE (START) ===
HTML:
${currentHtml}

CSS:
${currentCss}
=== CURRENT CODE (END) ===`
      : `=== CURRENT CODE (START) ===
JSX Component:
${currentJsx}
=== CURRENT CODE (END) ===`;

    // Make direct API call to LiteLLM using Anthropic format
    console.log('Making API request to:', `${LITELLM_BASE_URL}/v1/messages`);
    const requestBody = {
      model: 'claude-4-sonnet',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${currentCodeSection}

=== USER'S REQUESTED CHANGE ===
${userPrompt}

Remember: Modify ONLY what the user asked for. Keep everything else exactly as it is in the CURRENT CODE above.`,
        },
      ],
    };
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${LITELLM_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LiteLLM API error:', response.status, errorText);

      // Try to parse error message from response
      let errorMessage = 'API error';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      // Handle specific status codes
      if (response.status === 429) {
        return renderMode === 'retro'
          ? { html: currentHtml, css: currentCss, error: 'Claude is overwhelmed. Wait a sec.' }
          : { jsx: currentJsx, error: 'Claude is overwhelmed. Wait a sec.' };
      }

      if (response.status === 401 || response.status === 403) {
        return renderMode === 'retro'
          ? { html: currentHtml, css: currentCss, error: 'Authentication failed. Check LiteLLM credentials.' }
          : { jsx: currentJsx, error: 'Authentication failed. Check LiteLLM credentials.' };
      }

      return renderMode === 'retro'
        ? { html: currentHtml, css: currentCss, error: `API Error (${response.status}): ${errorMessage.substring(0, 100)}` }
        : { jsx: currentJsx, error: `API Error (${response.status}): ${errorMessage.substring(0, 100)}` };
    }

    const data = await response.json();
    console.log('API response:', JSON.stringify(data, null, 2));

    // Extract the assistant's response from Anthropic format
    const assistantMessage = data.content?.[0]?.text;
    if (!assistantMessage) {
      console.error('Unexpected response format:', JSON.stringify(data, null, 2));
      return renderMode === 'retro'
        ? { html: currentHtml, css: currentCss, error: 'Unexpected response format from LiteLLM' }
        : { jsx: currentJsx, error: 'Unexpected response format from LiteLLM' };
    }

    console.log('Assistant message:', assistantMessage);

    // Parse the response based on mode
    const parsed = renderMode === 'retro'
      ? parseRetroResponse(assistantMessage)
      : parseTurboResponse(assistantMessage);
    console.log('Parsed result:', parsed ? 'success' : 'failed');

    if (!parsed) {
      return renderMode === 'retro'
        ? { html: currentHtml, css: currentCss, error: 'That prompt broke Claude\'s brain 🤯' }
        : { jsx: currentJsx, error: 'That prompt broke Claude\'s brain 🤯' };
    }

    return parsed;
  } catch (error: unknown) {
    console.error('Claude API error:', error);

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Return error with actual message based on mode
    return renderMode === 'retro'
      ? { html: currentHtml, css: currentCss, error: `Error: ${errorMessage}` }
      : { jsx: currentJsx, error: `Error: ${errorMessage}` };
  }
}

function parseRetroResponse(response: string): { html: string; css: string } | null {
  try {
    // Extract content between <html> and </html>
    const htmlMatch = response.match(/<html>([\s\S]*?)<\/html>/i);
    if (!htmlMatch) {
      return null;
    }

    const fullHtml = htmlMatch[1].trim();

    // Extract CSS from <style> tag
    const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/i);
    const css = styleMatch ? styleMatch[1].trim() : '';

    // Extract body content
    const bodyMatch = fullHtml.match(/<body>([\s\S]*?)<\/body>/i);
    const html = bodyMatch ? bodyMatch[1].trim() : fullHtml;

    return { html, css };
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

function parseTurboResponse(response: string): { jsx: string } | null {
  try {
    // Extract JSX from code block
    const codeBlockMatch = response.match(/```(?:jsx|tsx|javascript|typescript)?\n([\s\S]*?)```/);
    if (!codeBlockMatch) {
      // Try without code block markers
      // Check if response looks like JSX (contains import and export default)
      if (response.includes('export default') && (response.includes('import') || response.includes('function Component'))) {
        return { jsx: response.trim() };
      }
      return null;
    }

    const jsx = codeBlockMatch[1].trim();

    // Validate it looks like JSX
    if (!jsx.includes('export default')) {
      return null;
    }

    return { jsx };
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

const LITELLM_BASE_URL = 'https://litellm-oidc.holidu.com';
const AUTH_URL = 'https://auth.holidu.com/realms/guest/protocol/openid-connect/token';

const SYSTEM_PROMPT = `You are helping a participant in a coding challenge. They can only see their rendered HTML preview, not the code itself.

Given their current HTML and CSS, and their natural language prompt, generate ONLY the updated HTML and CSS.

Rules:
- Output ONLY valid HTML and CSS
- Keep it simple and static (no JavaScript)
- Make incremental changes based on their prompt
- If they ask for something unclear, make your best guess and be creative
- Wrap CSS in a <style> tag inside the HTML
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

export interface ProcessPromptResult {
  html: string;
  css: string;
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
  currentHtml: string,
  currentCss: string
): Promise<ProcessPromptResult> {
  console.log('processPrompt called with prompt:', userPrompt);

  try {
    // Get OAuth access token
    console.log('Fetching OAuth token...');
    const accessToken = await getAccessToken();
    console.log('OAuth token obtained:', accessToken.substring(0, 20) + '...');

    // Make direct API call to LiteLLM using Anthropic format
    console.log('Making API request to:', `${LITELLM_BASE_URL}/v1/messages`);
    const requestBody = {
      model: 'claude-4-sonnet',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current HTML:\n${currentHtml}\n\nCurrent CSS:\n${currentCss}\n\nUser prompt: ${userPrompt}`,
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
        return {
          html: currentHtml,
          css: currentCss,
          error: 'Claude is overwhelmed. Wait a sec.',
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          html: currentHtml,
          css: currentCss,
          error: 'Authentication failed. Check LiteLLM credentials.',
        };
      }

      return {
        html: currentHtml,
        css: currentCss,
        error: `API Error (${response.status}): ${errorMessage.substring(0, 100)}`,
      };
    }

    const data = await response.json();
    console.log('API response:', JSON.stringify(data, null, 2));

    // Extract the assistant's response from Anthropic format
    const assistantMessage = data.content?.[0]?.text;
    if (!assistantMessage) {
      console.error('Unexpected response format:', JSON.stringify(data, null, 2));
      return {
        html: currentHtml,
        css: currentCss,
        error: 'Unexpected response format from LiteLLM',
      };
    }

    console.log('Assistant message:', assistantMessage);

    // Parse the response
    const parsed = parseClaudeResponse(assistantMessage);
    console.log('Parsed result:', parsed ? 'success' : 'failed');

    if (!parsed) {
      return {
        html: currentHtml,
        css: currentCss,
        error: 'That prompt broke Claude\'s brain 🤯',
      };
    }

    return parsed;
  } catch (error: unknown) {
    console.error('Claude API error:', error);

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Return error with actual message
    return {
      html: currentHtml,
      css: currentCss,
      error: `Error: ${errorMessage}`,
    };
  }
}

function parseClaudeResponse(response: string): { html: string; css: string } | null {
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPrompt = processPrompt;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
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
async function processPrompt(userPrompt, currentHtml, currentCss, customApiKey) {
    try {
        // Use custom API key if provided, otherwise use default
        const client = customApiKey
            ? new sdk_1.default({ apiKey: customApiKey })
            : anthropic;
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Current HTML:\n${currentHtml}\n\nCurrent CSS:\n${currentCss}\n\nUser prompt: ${userPrompt}`,
                },
            ],
        });
        const content = message.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude');
        }
        const responseText = content.text;
        // Parse the response
        const parsed = parseClaudeResponse(responseText);
        if (!parsed) {
            return {
                html: currentHtml,
                css: currentCss,
                error: 'That prompt broke Claude\'s brain 🤯',
            };
        }
        return parsed;
    }
    catch (error) {
        console.error('Claude API error:', error);
        // Handle rate limiting
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
            return {
                html: currentHtml,
                css: currentCss,
                error: 'Claude is overwhelmed. Wait a sec.',
            };
        }
        // Handle other errors
        return {
            html: currentHtml,
            css: currentCss,
            error: 'Claude got confused. Try again with different words?',
        };
    }
}
function parseClaudeResponse(response) {
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
    }
    catch (error) {
        console.error('Parse error:', error);
        return null;
    }
}

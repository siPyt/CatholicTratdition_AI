import { buildTheologySystemPrompt, ChatMode } from '../src/config/openAiPrompt';
import { ApiRequest, ApiResponse, ensurePostMethod, parseJsonBody, requireEnv, sanitizeMessages } from './_lib/runtime';

interface ChatRequestBody {
  messages?: unknown;
  model?: unknown;
  temperature?: unknown;
  mode?: unknown;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sanitizeMode(mode: unknown): ChatMode {
  if (mode === 'fathers' || mode === 'proofs' || mode === 'apologetics') {
    return mode;
  }

  return 'apologetics';
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  try {
    if (!ensurePostMethod(request, response)) {
      return;
    }

    const apiKey = requireEnv(response, ['OPENAI_API_KEY', 'open_ai_key']);
    if (!apiKey) {
      return;
    }

    const body = parseJsonBody<ChatRequestBody>(request.body);
    const messages = sanitizeMessages(body?.messages);
    const mode = sanitizeMode(body?.mode);

    if (messages.length === 0) {
      response.status(400).json({ error: 'At least one user message is required.' });
      return;
    }

    const model = typeof body?.model === 'string' && body.model.trim().length > 0
      ? body.model.trim()
      : process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

    const temperature = typeof body?.temperature === 'number' ? body.temperature : 0.2;

    const upstreamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: buildTheologySystemPrompt(mode) },
          ...messages
        ]
      })
    });

    const rawPayload = await upstreamResponse.text();
    const payload = tryParseJson(rawPayload) as Record<string, unknown> | null;

    if (!upstreamResponse.ok) {
      response.status(upstreamResponse.status).json({
        error: 'OpenAI request failed.',
        details: payload ?? rawPayload
      });
      return;
    }

    const content = payload?.choices && Array.isArray(payload.choices)
      ? (payload.choices[0] as { message?: { content?: unknown } })?.message?.content
      : '';

    response.status(200).json({
      content: typeof content === 'string' ? content : '',
      model: payload?.model ?? model,
      usage: payload?.usage ?? null,
      mode
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error in /api/chat.'
    });
  }
}
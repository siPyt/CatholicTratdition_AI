import { buildTheologySystemPrompt, ChatMode, sanitizeChatMode } from './_lib/theologyPrompt.js';
import { buildRetrievalContext } from './_lib/retrieval.js';
import { ApiRequest, ApiResponse, ensurePostMethod, parseJsonBody, requireEnv, sanitizeMessages } from './_lib/runtime.js';

export const config = {
  runtime: 'nodejs'
};

interface ChatRequestBody {
  messages?: unknown;
  model?: unknown;
  temperature?: unknown;
  mode?: unknown;
}

interface ChatUpstreamConfig {
  url: string;
  model: string;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveChatUpstream(apiKey: string, requestedModel: unknown): ChatUpstreamConfig {
  const explicitBaseUrl = process.env.OPENAI_BASE_URL?.trim();
  const usesVercelGateway =
    apiKey.startsWith('vck_') ||
    explicitBaseUrl === 'https://ai-gateway.vercel.sh/v1' ||
    process.env.OPENAI_PROVIDER?.trim() === 'vercel-gateway';

  const defaultModel = usesVercelGateway ? 'openai/gpt-4.1-mini' : 'gpt-4.1-mini';
  const candidateModel = typeof requestedModel === 'string' && requestedModel.trim().length > 0
    ? requestedModel.trim()
    : process.env.OPENAI_MODEL?.trim() || defaultModel;

  const model = usesVercelGateway && !candidateModel.includes('/')
    ? `openai/${candidateModel}`
    : candidateModel;

  const baseUrl = explicitBaseUrl || (usesVercelGateway
    ? 'https://ai-gateway.vercel.sh/v1'
    : 'https://api.openai.com/v1');

  return {
    url: `${baseUrl}/chat/completions`,
    model
  };
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  try {
    if (!ensurePostMethod(request, response)) {
      return;
    }

    const apiKey = requireEnv(response, ['OPENAI_API_KEY', 'open_ai_key', 'dragon_key']);
    if (!apiKey) {
      return;
    }

    const body = parseJsonBody<ChatRequestBody>(request.body);
    const messages = sanitizeMessages(body?.messages);
    const mode = sanitizeChatMode(body?.mode);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

    if (messages.length === 0) {
      response.status(400).json({ error: 'At least one user message is required.' });
      return;
    }

    const upstreamConfig = resolveChatUpstream(apiKey, body?.model);

    const temperature = typeof body?.temperature === 'number' ? body.temperature : 0.2;
    const retrievalContext = latestUserMessage
      ? buildRetrievalContext(latestUserMessage.content, mode, 3)
      : '';
    const systemPrompt = retrievalContext
      ? `${buildTheologySystemPrompt(mode)}\n\n${retrievalContext}`
      : buildTheologySystemPrompt(mode);

    const upstreamResponse = await fetch(upstreamConfig.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: upstreamConfig.model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
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
      model: payload?.model ?? upstreamConfig.model,
      usage: payload?.usage ?? null,
      mode
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error in /api/chat.'
    });
  }
}
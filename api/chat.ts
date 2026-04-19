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

const dogmaticOutOfScopeAuthorityPattern = /\b(vatican\s*ii|vatican\s*2|augustine|aquinas|thomas\s+aquinas|church\s+fathers?|fathers\b|council\s+of\s+trent|trent\b|catechism\b|ccc\b|leo\s+xiii|pius\s+(?:ix|x|xi|xii)|john\s+paul\s+ii|benedict\s+xvi|francis\b|paul\s+vi|dei\s+verbum|lumen\s+gentium|gaudium\s+et\s+spes)\b/i;

const romanNumeralValues: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000
};

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function romanToArabic(token: string): number | null {
  const normalized = token.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(normalized)) {
    return null;
  }

  let total = 0;
  let previousValue = 0;

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const currentValue = romanNumeralValues[normalized[index]];
    if (!currentValue) {
      return null;
    }

    if (currentValue < previousValue) {
      total -= currentValue;
    } else {
      total += currentValue;
      previousValue = currentValue;
    }
  }

  return total;
}

function normalizeCitationNumerals(text: string): string {
  return text.replace(/\b([IVXLCDM]+)(?=,\s*(q\.|a\.|sec\.|disp\.|dist\.|can\.|cap\.|bk\.|book\b|chapter\b))/gi, (match) => {
    const arabicValue = romanToArabic(match);
    return arabicValue ? String(arabicValue) : match;
  });
}

function normalizeAquinasCitations(text: string): string {
  return text.replace(
    /(Summa Theologiae\*?,?\s*)(?:Part\s+)?(I|II|III|1|2|3)(?:\s*[-,]\s*(I|II|1|2))?,\s*q\.\s*(\d+),\s*a\.\s*(\d+)/gi,
    (_match, prefix: string, firstPart: string, secondPart: string | undefined, question: string, article: string) => {
      const normalizedFirst = firstPart.toUpperCase();
      const normalizedSecond = secondPart?.toUpperCase();

      let partLabel = normalizeCitationNumerals(normalizedFirst);

      if ((normalizedFirst === '1' || normalizedFirst === 'I') && !normalizedSecond) {
        partLabel = 'Prima Pars';
      } else if ((normalizedFirst === '2' || normalizedFirst === 'II') && (normalizedSecond === '1' || normalizedSecond === 'I')) {
        partLabel = 'Prima Secundae';
      } else if ((normalizedFirst === '2' || normalizedFirst === 'II') && (normalizedSecond === '2' || normalizedSecond === 'II')) {
        partLabel = 'Secunda Secundae';
      } else if ((normalizedFirst === '3' || normalizedFirst === 'III') && !normalizedSecond) {
        partLabel = 'Tertia Pars';
      }

      return `${prefix}${partLabel}, Question ${question}, Article ${article}`;
    }
  );
}

function buildDogmaticScopeRefusal(prompt: string): string {
  return `This mode is limited to Ludwig Ott and Denzinger only, so I cannot answer from other authorities in this chat. Rephrase the question in terms of what Ott and Denzinger say about ${prompt.trim() || 'the doctrine in question'}, and I will stay within that scope.`;
}

function shouldRefuseDogmaticSourcesRequest(prompt: string): boolean {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return false;
  }

  if (/\bott\b/i.test(normalizedPrompt) || /\bdenzinger\b/i.test(normalizedPrompt)) {
    return false;
  }

  return dogmaticOutOfScopeAuthorityPattern.test(normalizedPrompt);
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

    if (mode === 'dogmaticSources' && latestUserMessage && shouldRefuseDogmaticSourcesRequest(latestUserMessage.content)) {
      response.status(200).json({
        content: buildDogmaticScopeRefusal(latestUserMessage.content),
        model: 'dogmatic-scope-guard',
        usage: null,
        mode
      });
      return;
    }

    const upstreamConfig = resolveChatUpstream(apiKey, body?.model);

    const temperature = typeof body?.temperature === 'number' ? body.temperature : 0.2;
    const retrievalContext = latestUserMessage && (mode === 'fathers' || mode === 'proofs' || mode === 'apologetics')
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

    const normalizedContent = typeof content === 'string'
      ? normalizeAquinasCitations(normalizeCitationNumerals(content))
      : '';

    response.status(200).json({
      content: normalizedContent,
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
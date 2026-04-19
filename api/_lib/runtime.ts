type EnvMap = Record<string, string | undefined>;

export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function getEnv(envNames: string[], env: EnvMap = process.env): string | undefined {
  for (const envName of envNames) {
    const value = env[envName]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function requireEnv(response: ApiResponse, envNames: string[]): string | undefined {
  const value = getEnv(envNames);
  if (value) {
    return value;
  }

  response.status(500).json({
    error: `Missing required environment variable: ${envNames.join(' or ')}`
  });
  return undefined;
}

export function parseJsonBody<T>(body: unknown): T | undefined {
  if (typeof body === 'string') {
    return JSON.parse(body) as T;
  }

  if (body && typeof body === 'object') {
    return body as T;
  }

  return undefined;
}

export function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export function sanitizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message): message is { role: unknown; content: unknown } => Boolean(message) && typeof message === 'object')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message.content === 'string' ? message.content.trim() : ''
    }))
    .filter((message) => message.content.length > 0);
}

export function ensurePostMethod(request: ApiRequest, response: ApiResponse): boolean {
  if (request.method === 'POST') {
    return true;
  }

  response.setHeader('Allow', 'POST');
  response.status(405).json({ error: 'Method not allowed' });
  return false;
}
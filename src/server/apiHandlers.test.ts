import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chatHandler from '../../api/chat';
import healthHandler from '../../api/health';
import retrieveHandler from '../../api/retrieve';
import ttsHandler from '../../api/tts';

interface MockResponse {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  status(code: number): MockResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    send(body: string) {
      this.payload = body;
    }
  };
}

const originalEnv = { ...process.env };

describe('server handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENAI_MODEL = 'gpt-4.1-mini';
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
    process.env.ELEVENLABS_VOICE_ID = 'voice-123';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns chat content for the chat handler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        model: 'gpt-4.1-mini',
        choices: [{ message: { content: 'A reply from the assistant.' } }],
        usage: { total_tokens: 10 }
      })
    }));

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'proofs',
          messages: [{ role: 'user', content: 'Explain the real distinction.' }]
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      content: 'A reply from the assistant.',
      mode: 'proofs'
    });
  });

  it('injects retrieved canonical context into the chat system prompt when matches exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        model: 'gpt-4.1-mini',
        choices: [{ message: { content: 'A retrieval-grounded reply.' } }],
        usage: { total_tokens: 12 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'proofs',
          messages: [{ role: 'user', content: 'Give me a proof for God as first cause.' }]
        }
      },
      response
    );

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ role: string; content: string }>;
    };

    expect(upstreamPayload.messages[0].role).toBe('system');
    expect(upstreamPayload.messages[0].content).toContain('Retrieved canonical source context');
    expect(upstreamPayload.messages[0].content).toContain('Thomas Aquinas, Summa Theologiae, I, q. 2, a. 3');
    expect(response.statusCode).toBe(200);
  });

  it('routes vck gateway keys through the Vercel AI Gateway endpoint', async () => {
    process.env.OPENAI_API_KEY = 'vck_test_gateway_key';
    delete process.env.OPENAI_MODEL;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        choices: [{ message: { content: 'Gateway reply.' } }],
        usage: { total_tokens: 9 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'apologetics',
          messages: [{ role: 'user', content: 'Explain confession.' }]
        }
      },
      response
    );

    expect(fetchMock.mock.calls[0][0]).toBe('https://ai-gateway.vercel.sh/v1/chat/completions');

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      model: string;
    };

    expect(upstreamPayload.model).toBe('openai/gpt-4.1-mini');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      content: 'Gateway reply.'
    });
  });

  it('returns a deterministic JSON error when chat upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream failure'
    }));

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'apologetics',
          messages: [{ role: 'user', content: 'Why confession?' }]
        }
      },
      response
    );

    expect(response.statusCode).toBe(500);
    expect(response.payload).toMatchObject({
      error: 'OpenAI request failed.',
      details: 'upstream failure'
    });
  });

  it('treats quoted-empty OpenAI keys as missing configuration', async () => {
    process.env.OPENAI_API_KEY = '""';
    delete process.env.open_ai_key;

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'apologetics',
          messages: [{ role: 'user', content: 'Why confession?' }]
        }
      },
      response
    );

    expect(response.statusCode).toBe(500);
    expect(response.payload).toMatchObject({
      error: 'Missing required environment variable: OPENAI_API_KEY or open_ai_key or dragon_key'
    });
  });

  it('returns audio metadata for the tts handler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('audio').buffer
    }));

    const response = createMockResponse();

    await ttsHandler(
      {
        method: 'POST',
        body: {
          text: 'The voice answer.'
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      contentType: 'audio/mpeg',
      voiceId: 'voice-123'
    });
  });

  it('reports safe booleans in the health handler', () => {
    const response = createMockResponse();

    healthHandler({ method: 'GET' }, response);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      runtimeOk: true,
      openAiKeyPresent: true,
      elevenLabsKeyPresent: true,
      elevenLabsVoicePresent: true
    });
  });

  it('returns citation-aware retrieval matches from the retrieve handler', () => {
    const response = createMockResponse();

    retrieveHandler(
      {
        method: 'GET',
        query: {
          q: 'What is the Eucharist according to the Fathers?',
          mode: 'fathers',
          limit: '2'
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      mode: 'fathers',
      count: 2
    });

    const payload = response.payload as {
      results: Array<{ citation: string }>;
    };

    expect(payload.results[0]?.citation).toBe('Ignatius of Antioch, Letter to the Smyrnaeans, Chapter 7');
  });
});
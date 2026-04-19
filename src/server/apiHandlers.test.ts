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

  it('normalizes and expands Aquinas citations in returned chat content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        model: 'gpt-4.1-mini',
        choices: [{ message: { content: 'See Summa Theologiae, II-II, q. 64, a. 2 for the argument.' } }],
        usage: { total_tokens: 10 }
      })
    }));

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'proofs',
          messages: [{ role: 'user', content: 'Cite the First Cause proof.' }]
        }
      },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      content: 'See Summa Theologiae, Secunda Secundae, Question 64, Article 2 for the argument.'
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
    expect(upstreamPayload.messages[0].content).toContain('Thomas Aquinas, Summa Theologiae, Prima Pars, Question 2, Article 3');
    expect(response.statusCode).toBe(200);
  });

  it('supports the Handbook of Dogmatic Sources mode without retrieval citations', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        model: 'gpt-4.1-mini',
        choices: [{ message: { content: 'A handbook-style reply.' } }],
        usage: { total_tokens: 12 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'dogmaticSources',
          messages: [{ role: 'user', content: 'What is the theological note on grace?' }]
        }
      },
      response
    );

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ role: string; content: string }>;
    };

    expect(upstreamPayload.messages[0].content).toContain('Fundamentals of Catholic Dogma');
    expect(upstreamPayload.messages[0].content).toContain('Sources of Catholic Dogma');
    expect(upstreamPayload.messages[0].content).toContain('De Fide');
    expect(upstreamPayload.messages[0].content).toContain('Sententia Probabilis');
    expect(upstreamPayload.messages[0].content).toContain('Do not mention the names of the controlling handbook sources in the final answer');
    expect(upstreamPayload.messages[0].content).toContain('Do not cite Ott, Denzinger, document numbers, or any other works in the final answer');
    expect(upstreamPayload.messages[0].content).not.toContain('Retrieved canonical source context');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      mode: 'dogmaticSources'
    });
  });

  it('refuses out-of-scope authorities in the Handbook of Dogmatic Sources mode', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'dogmaticSources',
          messages: [{ role: 'user', content: 'Use Vatican II and Augustine to explain justification.' }]
        }
      },
      response
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      mode: 'dogmaticSources',
      model: 'dogmatic-scope-guard'
    });
    expect(response.payload).toMatchObject({
      content: expect.stringContaining('This mode is limited to the approved handbook source set')
    });
  });

  it('supports the pre-Vatican II papal documents mode without retrieval injection', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        model: 'gpt-4.1-mini',
        choices: [{ message: { content: 'A papal reply.' } }],
        usage: { total_tokens: 12 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await chatHandler(
      {
        method: 'POST',
        body: {
          mode: 'papalPreVaticanII',
          messages: [{ role: 'user', content: 'What did pre-Vatican II popes teach about the kingship of Christ?' }]
        }
      },
      response
    );

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ role: string; content: string }>;
    };

    expect(upstreamPayload.messages[0].content).toContain('pre-Vatican II popes only');
    expect(upstreamPayload.messages[0].content).toContain('English Vatican papal archive');
    expect(upstreamPayload.messages[0].content).not.toContain('Retrieved canonical source context');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      mode: 'papalPreVaticanII'
    });
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('audio').buffer
    });

    vi.stubGlobal('fetch', fetchMock);

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

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      text: string;
    };

    expect(response.statusCode).toBe(200);
    expect(upstreamPayload.text).toBe('The voice answer.');
    expect(response.payload).toMatchObject({
      contentType: 'audio/mpeg',
      voiceId: 'voice-123'
    });
  });

  it('normalizes papal Roman numerals for spoken TTS output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('audio').buffer
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await ttsHandler(
      {
        method: 'POST',
        body: {
          text: 'Pope Leo XIII wrote on social doctrine.'
        }
      },
      response
    );

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      text: string;
    };

    expect(response.statusCode).toBe(200);
    expect(upstreamPayload.text).toBe('Pope Leo the thirteenth wrote on social doctrine.');
  });

  it('normalizes citation abbreviations for spoken TTS output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('audio').buffer
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = createMockResponse();

    await ttsHandler(
      {
        method: 'POST',
        body: {
          text: 'See Q64, art 3, and A 2 in the disputed reply.'
        }
      },
      response
    );

    const upstreamPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      text: string;
    };

    expect(response.statusCode).toBe(200);
    expect(upstreamPayload.text).toBe('See Question 64, Article 3, and Answer 2 in the disputed reply.');
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
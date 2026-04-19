import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chatHandler from '../../api/chat';
import healthHandler from '../../api/health';
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
});
import { getEnv } from './_lib/runtime.js';

interface ApiRequest {
  method?: string;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
}

export const config = {
  runtime: 'nodejs'
};

export default function handler(request: ApiRequest, response: ApiResponse): void {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  response.status(200).json({
    runtimeOk: true,
    openAiKeyPresent: Boolean(getEnv(['OPENAI_API_KEY', 'open_ai_key'])),
    elevenLabsKeyPresent: Boolean(getEnv(['ELEVENLABS_API_KEY', 'elevenlabs_api_key'])),
    elevenLabsVoicePresent: Boolean(getEnv(['ELEVENLABS_VOICE_ID'])),
    modelConfigured: Boolean(getEnv(['OPENAI_MODEL'])),
    timestamp: new Date().toISOString()
  });
}
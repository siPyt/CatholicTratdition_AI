import {
  ApiRequest,
  ApiResponse,
  ensurePostMethod,
  parseJsonBody,
  requireEnv,
  toBoolean,
  toNumber
} from './_lib/runtime.js';

export const config = {
  runtime: 'nodejs'
};

interface TtsRequestBody {
  text?: unknown;
  voiceId?: unknown;
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  try {
    if (!ensurePostMethod(request, response)) {
      return;
    }

    const apiKey = requireEnv(response, ['ELEVENLABS_API_KEY', 'elevenlabs_api_key']);
    if (!apiKey) {
      return;
    }

    const body = parseJsonBody<TtsRequestBody>(request.body);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      response.status(400).json({ error: 'Text is required for speech synthesis.' });
      return;
    }

    const configuredVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
    const requestedVoiceId = typeof body?.voiceId === 'string' ? body.voiceId.trim() : '';
    const voiceId = requestedVoiceId || configuredVoiceId;

    if (!voiceId) {
      response.status(500).json({ error: 'Missing required environment variable: ELEVENLABS_VOICE_ID' });
      return;
    }

    const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';
    const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || 'mp3_44100_128';
    const stability = toNumber(process.env.ELEVENLABS_STABILITY, 0.42);
    const similarityBoost = toNumber(process.env.ELEVENLABS_SIMILARITY_BOOST, 0.78);
    const style = toNumber(process.env.ELEVENLABS_STYLE, 0.28);
    const speakerBoost = toBoolean(process.env.ELEVENLABS_SPEAKER_BOOST, true);

    const upstreamResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost
          }
        })
      }
    );

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      response.status(upstreamResponse.status).json({
        error: 'ElevenLabs request failed.',
        details
      });
      return;
    }

    const audioBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    response.status(200).json({
      audioBase64: audioBuffer.toString('base64'),
      contentType: 'audio/mpeg',
      outputFormat,
      voiceId
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error in /api/tts.'
    });
  }
}
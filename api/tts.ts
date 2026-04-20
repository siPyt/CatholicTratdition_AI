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

const MAX_TTS_CHARACTERS = 900;

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clampTtsText(text: string): { text: string; truncated: boolean } {
  const normalized = normalizeWhitespace(text);

  if (normalized.length <= MAX_TTS_CHARACTERS) {
    return { text: normalized, truncated: false };
  }

  const excerpt = normalized.slice(0, MAX_TTS_CHARACTERS);
  const sentenceBoundary = Math.max(excerpt.lastIndexOf('. '), excerpt.lastIndexOf('? '), excerpt.lastIndexOf('! '), excerpt.lastIndexOf('\n\n'));
  const trimmedExcerpt = sentenceBoundary >= 400 ? excerpt.slice(0, sentenceBoundary + 1).trim() : excerpt.trim();

  return {
    text: `${trimmedExcerpt} [Audio excerpt truncated.]`,
    truncated: true
  };
}

const romanNumeralValues: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000
};

const ordinalWords: Record<number, string> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
  9: 'ninth',
  10: 'tenth',
  11: 'eleventh',
  12: 'twelfth',
  13: 'thirteenth',
  14: 'fourteenth',
  15: 'fifteenth',
  16: 'sixteenth',
  17: 'seventeenth',
  18: 'eighteenth',
  19: 'nineteenth',
  20: 'twentieth',
  21: 'twenty-first',
  22: 'twenty-second',
  23: 'twenty-third',
  24: 'twenty-fourth',
  25: 'twenty-fifth',
  26: 'twenty-sixth',
  27: 'twenty-seventh',
  28: 'twenty-eighth',
  29: 'twenty-ninth',
  30: 'thirtieth'
};

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

function toOrdinalWord(value: number): string {
  return ordinalWords[value] ?? `${value}th`;
}

function normalizePapalSpeech(text: string): string {
  return text.replace(/\b(Pope\s+)?([A-Z][a-z]+)\s+([IVXLCDM]+)\b/g, (match, popePrefix: string | undefined, papalName: string, numeral: string) => {
    const arabicValue = romanToArabic(numeral);
    if (!arabicValue) {
      return match;
    }

    const spokenPrefix = popePrefix ? 'Pope ' : '';
    return `${spokenPrefix}${papalName} the ${toOrdinalWord(arabicValue)}`;
  });
}

function normalizeCitationSpeech(text: string): string {
  return text
    .replace(/\bart\.?\s*(\d+)\b/gi, 'Article $1')
    .replace(/(^|[\s,;(])q\.?\s*(\d+)\b/gi, '$1Question $2')
    .replace(/(^|[\s,;(])a\.?\s*(\d+)\b/gi, '$1Answer $2');
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
    const rawText = typeof body?.text === 'string' ? body.text.trim() : '';

    const { text, truncated } = clampTtsText(rawText);

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

    const spokenText = normalizeCitationSpeech(normalizePapalSpeech(text));

    const upstreamResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: spokenText,
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
      truncated,
      outputFormat,
      voiceId
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error in /api/tts.'
    });
  }
}
import { CorpusModeTag } from './_lib/corpusSchema.js';
import { searchCorpus } from './_lib/retrieval.js';
import { parseJsonBody } from './_lib/runtime.js';

interface ApiRequest {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
}

interface RetrieveRequestBody {
  query?: unknown;
  mode?: unknown;
  limit?: unknown;
}

function sanitizeMode(mode: unknown): CorpusModeTag {
  return mode === 'fathers' || mode === 'proofs' || mode === 'apologetics'
    ? mode
    : 'apologetics';
}

function readQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

export const config = {
  runtime: 'nodejs'
};

export default function handler(request: ApiRequest, response: ApiResponse): void {
  const method = request.method ?? 'GET';

  if (method !== 'GET' && method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = method === 'POST' ? parseJsonBody<RetrieveRequestBody>(request.body) : undefined;
  const query = method === 'GET'
    ? readQueryParam(request.query?.q)
    : typeof body?.query === 'string'
      ? body.query.trim()
      : '';

  if (!query) {
    response.status(400).json({ error: 'A non-empty query is required.' });
    return;
  }

  const modeInput = method === 'GET' ? readQueryParam(request.query?.mode) : body?.mode;
  const limitInput = method === 'GET' ? Number(readQueryParam(request.query?.limit)) : body?.limit;
  const mode = sanitizeMode(modeInput);
  const limit = typeof limitInput === 'number' && Number.isFinite(limitInput) ? limitInput : 5;
  const matches = searchCorpus(query, mode, limit);

  response.status(200).json({
    query,
    mode,
    count: matches.length,
    results: matches.map((match) => ({
      id: match.id,
      citation: match.citation,
      author: match.author,
      work: match.work,
      location: match.location,
      tier: match.tier,
      summary: match.summary,
      text: match.text,
      score: match.score,
      provenance: {
        sourceLabel: match.provenance.sourceLabel,
        rightsStatus: match.provenance.rightsStatus
      }
    }))
  });
}
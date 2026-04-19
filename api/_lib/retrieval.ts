import { CorpusModeTag, RetrievalMatch, formatChunkCitation } from './corpusSchema.js';
import { generatedCorpus } from './generatedCorpus.js';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length >= 3);
}

function scoreChunk(queryTokens: string[], haystack: string, keywordHaystack: string, mode: CorpusModeTag): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  let score = 0;
  const uniqueTokens = new Set(queryTokens);

  for (const token of uniqueTokens) {
    if (keywordHaystack.includes(token)) {
      score += 4;
      continue;
    }

    if (haystack.includes(token)) {
      score += 2;
    }
  }

  if (haystack.includes(mode)) {
    score += 1;
  }

  return score;
}

export function searchCorpus(query: string, mode: CorpusModeTag, limit = 5): RetrievalMatch[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 8));

  return generatedCorpus
    .map((chunk) => {
      const haystack = normalizeText([
        chunk.author,
        chunk.work,
        chunk.location,
        chunk.summary,
        chunk.text,
        ...chunk.modeTags
      ].join(' '));
      const keywordHaystack = normalizeText(chunk.keywords.join(' '));
      const modeBoost = chunk.modeTags.includes(mode) ? 2 : 0;
      const score = scoreChunk(queryTokens, haystack, keywordHaystack, mode) + modeBoost;

      return {
        ...chunk,
        citation: formatChunkCitation(chunk),
        score
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, safeLimit);
}

export function buildRetrievalContext(query: string, mode: CorpusModeTag, limit = 3): string {
  const matches = searchCorpus(query, mode, limit);
  if (matches.length === 0) {
    return '';
  }

  const formattedMatches = matches
    .map((match, index) => {
      return [
        `${index + 1}. ${match.citation}`,
        `Summary: ${match.summary}`,
        `Indexed text: ${match.text}`
      ].join('\n');
    })
    .join('\n\n');

  return [
    'Retrieved canonical source context:',
    'Use these indexed passages to ground your answer when relevant. Cite the work, not any website or provenance host.',
    formattedMatches
  ].join('\n\n');
}
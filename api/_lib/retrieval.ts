import { AuthorityTier, CorpusModeTag, RetrievalMatch, formatChunkCitation } from './corpusSchema.js';
import { generatedCorpus } from './generatedCorpus.js';

const stopWords = new Set([
  'about',
  'according',
  'also',
  'and',
  'are',
  'but',
  'can',
  'did',
  'does',
  'for',
  'from',
  'how',
  'into',
  'its',
  'not',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'would'
]);

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
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function scoreChunk(queryTokens: string[], haystack: string, keywordHaystack: string): number {
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

  return score;
}

function getProofsTierPreference(tier: AuthorityTier): number {
  if (tier === 'aquinas') {
    return 0;
  }

  if (tier === 'suarez') {
    return 1;
  }

  return 2;
}

export function searchCorpus(query: string, mode: CorpusModeTag, limit = 5): RetrievalMatch[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 8));

  return generatedCorpus
    .filter((chunk) => chunk.modeTags.includes(mode))
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
      const score = scoreChunk(queryTokens, haystack, keywordHaystack);

      return {
        ...chunk,
        citation: formatChunkCitation(chunk),
        score
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (mode === 'proofs') {
        return getProofsTierPreference(left.tier) - getProofsTierPreference(right.tier);
      }

      return left.citation.localeCompare(right.citation);
    })
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
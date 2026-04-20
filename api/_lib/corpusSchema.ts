export type AuthorityTier =
  | 'patristics'
  | 'aquinas'
  | 'suarez'
  | 'magisterium'
  | 'scripture'
  | 'secondary';

export type CorpusModeTag = 'fathers' | 'proofs' | 'apologetics';

export type RightsStatus = 'public-domain' | 'licensed' | 'restricted';

export interface CanonicalCitation {
  author: string;
  work: string;
  location: string;
  tier: AuthorityTier;
}

export interface CorpusProvenance {
  sourceLabel: string;
  sourceUrl?: string;
  rightsStatus: RightsStatus;
  rightsNotes?: string;
}

export interface CorpusChunk {
  id: string;
  author: string;
  work: string;
  location: string;
  tier: AuthorityTier;
  modeTags: CorpusModeTag[];
  summary: string;
  text: string;
  keywords: string[];
  provenance: CorpusProvenance;
}

export interface RetrievalMatch extends CorpusChunk {
  citation: string;
  score: number;
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

export function normalizeCitationLocation(location: string): string {
  return location.replace(/\b[IVXLCDM]+\b/g, (token) => {
    const arabicValue = romanToArabic(token);
    return arabicValue ? String(arabicValue) : token;
  });
}

export function formatCanonicalCitation(citation: CanonicalCitation): string {
  const location = citation.tier === 'aquinas'
    ? normalizeCitationLocation(citation.location)
      .replace(/^1,\s*q\.\s*(\d+),\s*a\.\s*(\d+)$/i, 'Prima Pars, Question $1, Article $2')
      .replace(/^2\s*[-,]\s*1,\s*q\.\s*(\d+),\s*a\.\s*(\d+)$/i, 'Prima Secundae, Question $1, Article $2')
      .replace(/^2\s*[-,]\s*2,\s*q\.\s*(\d+),\s*a\.\s*(\d+)$/i, 'Secunda Secundae, Question $1, Article $2')
      .replace(/^3,\s*q\.\s*(\d+),\s*a\.\s*(\d+)$/i, 'Tertia Pars, Question $1, Article $2')
      .replace(/\bq\.\s*(\d+)/gi, 'Question $1')
      .replace(/\ba\.\s*(\d+)/gi, 'Article $1')
    : normalizeCitationLocation(citation.location);

  return `${citation.author}, ${citation.work}, ${location}`;
}

export function formatChunkCitation(chunk: Pick<CorpusChunk, 'author' | 'work' | 'location' | 'tier'>): string {
  return formatCanonicalCitation({
    author: chunk.author,
    work: chunk.work,
    location: chunk.location,
    tier: chunk.tier
  });
}
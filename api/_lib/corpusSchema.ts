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

export function formatCanonicalCitation(citation: CanonicalCitation): string {
  return `${citation.author}, ${citation.work}, ${citation.location}`;
}

export function formatChunkCitation(chunk: Pick<CorpusChunk, 'author' | 'work' | 'location'>): string {
  return formatCanonicalCitation({
    author: chunk.author,
    work: chunk.work,
    location: chunk.location,
    tier: 'secondary'
  });
}
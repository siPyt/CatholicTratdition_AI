export type AuthorityTier =
  | 'patristics'
  | 'aquinas'
  | 'suarez'
  | 'magisterium'
  | 'scripture'
  | 'secondary';

export interface CanonicalCitation {
  author: string;
  work: string;
  location: string;
  tier: AuthorityTier;
}

export const citationPolicy = {
  userVisibleRules: [
    'Cite the work itself rather than the website that delivered the text.',
    'Never display URLs, hostnames, page titles, or website names in user-facing citations.',
    'Prefer canonical locations such as book, chapter, question, article, disputation, section, canon, or paragraph.',
    'When multiple sources are used, format each citation as a standalone work reference.'
  ],
  internalRules: [
    'Source URLs may be stored for ingestion provenance only.',
    'Translator, editor, edition, and rights data remain internal unless explicitly requested for audit purposes.'
  ]
} as const;

export const citationExamples: CanonicalCitation[] = [
  {
    author: 'Thomas Aquinas',
    work: 'Summa Theologiae',
    location: 'I, q. 2, a. 3',
    tier: 'aquinas'
  },
  {
    author: 'Augustine',
    work: 'Confessions',
    location: 'Book 8, Chapter 12',
    tier: 'patristics'
  },
  {
    author: 'Francisco Suarez',
    work: 'Disputationes Metaphysicae',
    location: 'disp. 13, sec. 9',
    tier: 'suarez'
  }
];

export function formatCanonicalCitation(citation: CanonicalCitation): string {
  return `${citation.author}, ${citation.work}, ${citation.location}`;
}
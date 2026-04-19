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
    location: 'Prima Pars, Question 2, Article 3',
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

function normalizeAquinasLocation(location: string): string {
  const normalized = location.trim().replace(/\s+/g, ' ');
  const pattern = /^(?:Part\s+)?(I|II|III|IV|V|1|2|3|4|5)(?:\s*[-,]\s*(I|II|III|1|2|3))?,\s*q\.\s*(\d+),\s*a\.\s*(\d+)$/i;
  const match = normalized.match(pattern);

  if (!match) {
    return normalizeCitationLocation(location)
      .replace(/\bq\.\s*(\d+)/gi, 'Question $1')
      .replace(/\ba\.\s*(\d+)/gi, 'Article $1');
  }

  const firstPart = match[1].toUpperCase();
  const secondPart = match[2]?.toUpperCase();
  const question = match[3];
  const article = match[4];

  let partLabel = normalizeCitationLocation(firstPart);

  if ((firstPart === '1' || firstPart === 'I') && !secondPart) {
    partLabel = 'Prima Pars';
  } else if ((firstPart === '2' || firstPart === 'II') && (secondPart === '1' || secondPart === 'I')) {
    partLabel = 'Prima Secundae';
  } else if ((firstPart === '2' || firstPart === 'II') && (secondPart === '2' || secondPart === 'II')) {
    partLabel = 'Secunda Secundae';
  } else if ((firstPart === '3' || firstPart === 'III') && !secondPart) {
    partLabel = 'Tertia Pars';
  }

  return `${partLabel}, Question ${question}, Article ${article}`;
}

export function formatCanonicalCitation(citation: CanonicalCitation): string {
	const location = citation.tier === 'aquinas'
		? normalizeAquinasLocation(citation.location)
		: normalizeCitationLocation(citation.location);

	return `${citation.author}, ${citation.work}, ${location}`;
}
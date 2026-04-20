import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const translationsUrl = 'https://www.sydneypenner.ca/translations.shtml';
const siteOrigin = 'https://www.sydneypenner.ca';
const rawRoot = path.join(repoRoot, 'data', 'raw', 'suarez');
const manifestPath = path.join(repoRoot, 'data', 'sources', 'suarez', 'sydney-penner.json');

function normalizeWhitespace(text) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripSuarezSourceBoilerplate(text) {
  return normalizeWhitespace(
    text
      .replace(/^Sydney Penner\s*$/gim, '')
      .replace(/^Last revis(?:ed|ion):.*$/gim, '')
      .replace(/^©\s*Sydney Penner.*$/gim, '')
      .replace(/^NB:\s*For a decently formatted pdf version, click here\.?\s*$/gim, '')
      .replace(/^File translated from\s*$/gim, '')
      .replace(/^TEX\s*$/gim, '')
      .replace(/^by\s*$/gim, '')
      .replace(/^TTH, version.*$/gim, '')
      .replace(/^On\s+\d{1,2}\s+\w+\s+\d{4}.*$/gim, '')
      .replace(/^--\s*\d+\s+of\s+\d+\s*--\s*$/gim, '')
      .replace(/^https?:\/\/\S+\s*$/gim, '')
  );
}

function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .toLowerCase()
    .replace(/[._]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const args = {
    force: false,
    limit: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--force') {
      args.force = true;
      continue;
    }

    if (arg === '--limit') {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('Expected a positive number after --limit.');
      }

      args.limit = value;
      index += 1;
    }
  }

  return args;
}

function normalizeWorkTitle(title) {
  return title
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSentenceSummary(title) {
  const cleanedTitle = title.replace(/^['"]|['"]$/g, '').trim();

  if (/^(whether|what|how|in what|concerning|on)\b/i.test(cleanedTitle)) {
    return `Suarez ${cleanedTitle.charAt(0).toLowerCase()}${cleanedTitle.slice(1)}.`;
  }

  return `Suarez on ${cleanedTitle.charAt(0).toLowerCase()}${cleanedTitle.slice(1)}.`;
}

function buildKeywords(workTitle, title, location) {
  const rawKeywords = `${workTitle} ${title} ${location}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const stopWords = new Set(['and', 'are', 'but', 'for', 'how', 'in', 'its', 'not', 'of', 'on', 'or', 'the', 'there', 'what', 'whether', 'which', 'with']);
  const keywords = [];

  for (const keyword of rawKeywords) {
    if (keyword.length < 4 || stopWords.has(keyword) || /^\d+$/.test(keyword)) {
      continue;
    }

    if (!keywords.includes(keyword)) {
      keywords.push(keyword);
    }

    if (keywords.length >= 8) {
      break;
    }
  }

  return keywords;
}

function getPreferredDownloadAnchor(anchors) {
  const htmlAnchor = anchors.find((anchor) => anchor.label.toLowerCase() === 'html');
  if (htmlAnchor) {
    return htmlAnchor;
  }

  return anchors[0] ?? null;
}

function getMainAnchor(anchors) {
  return anchors.find((anchor) => anchor.label.toLowerCase() !== 'html') ?? anchors[0] ?? null;
}

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function extractPdfText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF ${url}: ${response.status}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text);
  } finally {
    await parser.destroy();
  }
}

function extractHtmlContent(html) {
  const $ = load(html);
  const content = ($('#content').length ? $('#content') : $('body')).clone();
  content.find('script, style').remove();

  content.find('br').replaceWith('\n');
  content.find('p, li, h1, h2, h3, h4').each((_, element) => {
    $(element).append('\n');
  });

  return normalizeWhitespace(content.text());
}

async function extractHtmlText(url) {
  const html = await fetchHtml(url);
  return extractHtmlContent(html);
}

async function expandNestedIndexIfNeeded(workTitle, sourceUrl) {
  const parsedUrl = new URL(sourceUrl);
  const isHtmlIndexPage = parsedUrl.pathname.endsWith('.html') || parsedUrl.pathname.endsWith('.shtml');

  if (!isHtmlIndexPage) {
    return null;
  }

  const html = await fetchHtml(`${parsedUrl.origin}${parsedUrl.pathname}`);
  const $ = load(html);
  const nestedItems = [];
  const sectionAnchor = parsedUrl.hash ? parsedUrl.hash.slice(1) : '';
  let listRoot = $('#content > ul').first();

  if (sectionAnchor) {
    const sectionMarker = $(`a[name="${sectionAnchor}"]`).first();
    if (!sectionMarker.length) {
      return null;
    }

    const sectionHeading = sectionMarker.closest('h3, h4');
    const sectionList = sectionHeading.next('ul');
    if (!sectionList.length) {
      return null;
    }

    listRoot = sectionList;
  }

  listRoot.children('li').each((_, element) => {
    const anchors = $(element)
      .find('a')
      .map((__, anchor) => ({
        href: $(anchor).attr('href') ?? '',
        label: $(anchor).text().trim()
      }))
      .get()
      .filter((anchor) => anchor.href && !anchor.href.startsWith('#'));

    const mainAnchor = getMainAnchor(anchors);
    if (!mainAnchor || !mainAnchor.href.startsWith('su/')) {
      return;
    }

    const preferredAnchor = getPreferredDownloadAnchor(anchors);
    const itemText = $(element).text().replace(/\s+/g, ' ').trim();
    const title = itemText.replace(/^\*?\s*[^-]+-\s*/, '').replace(/\(html\)\s*$/i, '').trim();

    nestedItems.push({
      workTitle,
      location: mainAnchor.label,
      title,
      sourceUrl: new URL(preferredAnchor.href, sourceUrl).toString()
    });
  });

  return nestedItems.length > 0 ? nestedItems : null;
}

async function collectSuarezEntries() {
  const html = await fetchHtml(translationsUrl);
  const $ = load(html);
  const suarezHeader = $('h3').filter((_, element) => $(element).text().includes('Su')).first();

  if (!suarezHeader.length) {
    throw new Error('Could not find the Suarez section on the translations page.');
  }

  const entries = [];
  let current = suarezHeader.next();

  while (current.length) {
    if (current.is('h3')) {
      break;
    }

    if (current.is('h4')) {
      const workTitle = normalizeWorkTitle(current.text());
      const list = current.next('ul');

      list.find('li').each((_, element) => {
        const anchors = $(element)
          .find('a')
          .map((__, anchor) => ({
            href: $(anchor).attr('href') ?? '',
            label: $(anchor).text().trim()
          }))
          .get()
          .filter((anchor) => anchor.href && !anchor.href.startsWith('#'));

        const mainAnchor = getMainAnchor(anchors);
        const preferredAnchor = getPreferredDownloadAnchor(anchors);

        if (!mainAnchor || !preferredAnchor) {
          return;
        }

        const absoluteMainUrl = new URL(mainAnchor.href, translationsUrl).toString();
        const absoluteSourceUrl = new URL(preferredAnchor.href, translationsUrl).toString();

        if (!absoluteMainUrl.startsWith(siteOrigin) || !absoluteSourceUrl.startsWith(siteOrigin)) {
          return;
        }

        const itemText = $(element).text().replace(/\s+/g, ' ').trim();
        const title = itemText.replace(/^\*?\s*[^-]+-\s*/, '').replace(/\(html\)\s*$/i, '').trim() || workTitle;

        entries.push({
          workTitle,
          location: mainAnchor.label,
          title,
          sourceUrl: absoluteSourceUrl
        });
      });
    }

    current = current.next();
  }

  const expandedEntries = [];

  for (const entry of entries) {
    const nestedEntries = await expandNestedIndexIfNeeded(entry.workTitle, entry.sourceUrl);
    if (nestedEntries) {
      expandedEntries.push(...nestedEntries);
      continue;
    }

    expandedEntries.push(entry);
  }

  return expandedEntries;
}

async function downloadEntryText(entry) {
  if (entry.sourceUrl.endsWith('.pdf')) {
    return stripSuarezSourceBoilerplate(await extractPdfText(entry.sourceUrl));
  }

  return stripSuarezSourceBoilerplate(await extractHtmlText(entry.sourceUrl));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = await collectSuarezEntries();
  const limitedEntries = args.limit ? entries.slice(0, args.limit) : entries;

  await mkdir(rawRoot, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });

  const segments = [];
  const fileCache = new Map();

  for (const entry of limitedEntries) {
    const sourcePath = new URL(entry.sourceUrl).pathname;
    const sourceStem = path.basename(sourcePath, path.extname(sourcePath));
    const rawFileName = `${slugify(sourceStem || `${entry.workTitle}-${entry.location}`)}.txt`;
    const rawFilePath = path.join(rawRoot, rawFileName);
    const relativeRawFilePath = path.posix.join('data', 'raw', 'suarez', rawFileName);

    if (!fileCache.has(entry.sourceUrl) || args.force) {
      const text = await downloadEntryText(entry);
      if (!text) {
        throw new Error(`No text content extracted for ${entry.sourceUrl}`);
      }

      await writeFile(rawFilePath, `${text}\n`, 'utf8');
      fileCache.set(entry.sourceUrl, relativeRawFilePath);
    }

    segments.push({
      id: `suarez-${slugify(`${entry.workTitle}-${entry.location}`)}`,
      location: entry.location,
      modeTags: ['proofs'],
      summary: toSentenceSummary(entry.title),
      keywords: buildKeywords(entry.workTitle, entry.title, entry.location),
      filePath: fileCache.get(entry.sourceUrl)
    });
  }

  const sourcesByWork = new Map();

  for (const entry of limitedEntries) {
    const segmentId = `suarez-${slugify(`${entry.workTitle}-${entry.location}`)}`;
    const segment = segments.find((candidate) => candidate.id === segmentId);

    if (!segment) {
      continue;
    }

    if (!sourcesByWork.has(entry.workTitle)) {
      sourcesByWork.set(entry.workTitle, []);
    }

    sourcesByWork.get(entry.workTitle).push(segment);
  }

  const groupedSources = [];

  for (const [workTitle, workSegments] of sourcesByWork.entries()) {
    groupedSources.push({
      id: `suarez-${slugify(workTitle)}`,
      author: 'Francisco Suarez',
      work: workTitle,
      tier: 'suarez',
      provenance: {
        sourceLabel: 'Sydney Penner translations, used with permission'
      },
      rights: {
        status: 'licensed',
        notes: 'Used with direct permission for local storage, indexing, and retrieval, confirmed by the project owner on 2026-04-20.'
      },
      segments: workSegments
    });
  }

  groupedSources.sort((left, right) => left.work.localeCompare(right.work));

  await writeFile(manifestPath, `${JSON.stringify({ sources: groupedSources }, null, 2)}\n`, 'utf8');

  console.log(`Imported ${segments.length} Suarez segment(s) across ${groupedSources.length} work(s).`);
  console.log(`Wrote ${path.relative(repoRoot, manifestPath)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
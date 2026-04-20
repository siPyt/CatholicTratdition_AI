import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'data', 'import', 'newadvent-approved.json');

function normalizeWhitespace(text) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseArgs(argv) {
  const args = {
    force: false
  };

  for (const arg of argv) {
    if (arg === '--force') {
      args.force = true;
    }
  }

  return args;
}

async function loadConfig() {
  const raw = await readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error('Expected data/import/newadvent-approved.json to contain an entries array.');
  }

  return parsed.entries;
}

async function fetchParagraph(entry) {
  const response = await fetch(entry.sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${entry.sourceUrl}: ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  const paragraphs = $('#springfield2 p')
    .map((_, element) => normalizeWhitespace($(element).text()))
    .get()
    .filter(Boolean);

  if (typeof entry.paragraphStartsWith === 'string' && entry.paragraphStartsWith.length > 0) {
    const paragraph = paragraphs.find((candidate) => candidate.startsWith(entry.paragraphStartsWith));
    if (!paragraph) {
      throw new Error(`Could not find approved paragraph for ${entry.id} in ${entry.sourceUrl}`);
    }

    return paragraph;
  }

  if (typeof entry.sentenceStartsWith === 'string' && entry.sentenceStartsWith.length > 0) {
    const paragraph = paragraphs.find((candidate) => candidate.includes(entry.sentenceStartsWith));
    if (!paragraph) {
      throw new Error(`Could not find approved sentence container for ${entry.id} in ${entry.sourceUrl}`);
    }

    const sentenceStart = paragraph.indexOf(entry.sentenceStartsWith);
    const sentenceCandidate = paragraph.slice(sentenceStart);
    const sentenceMatch = sentenceCandidate.match(/^.*?[.!?](?=\s|$)/);
    if (!sentenceMatch) {
      throw new Error(`Could not isolate approved sentence for ${entry.id} in ${entry.sourceUrl}`);
    }

    return sentenceMatch[0].trim();
  }

  throw new Error(`No extraction rule configured for ${entry.id}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = await loadConfig();

  for (const entry of entries) {
    const outputPath = path.join(repoRoot, entry.rawFilePath);
    await mkdir(path.dirname(outputPath), { recursive: true });

    if (!args.force) {
      try {
        await readFile(outputPath, 'utf8');
      } catch {
        // Fall through to write if the file does not exist.
      }
    }

    const paragraph = await fetchParagraph(entry);
    await writeFile(outputPath, `${paragraph}\n`, 'utf8');
  }

  console.log(`Imported ${entries.length} approved New Advent excerpt(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
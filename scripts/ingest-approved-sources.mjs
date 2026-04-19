import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const manifestRoot = path.join(repoRoot, 'data', 'sources');
const jsonOutputPath = path.join(repoRoot, 'data', 'corpus', 'library.json');
const tsOutputPath = path.join(repoRoot, 'api', '_lib', 'generatedCorpus.ts');

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected non-empty string for ${label}.`);
  }

  return value.trim();
}

function assertModeTags(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected non-empty array for ${label}.`);
  }

  return value.map((entry, index) => assertString(entry, `${label}[${index}]`));
}

function assertKeywords(value, label) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => assertString(entry, `${label}[${index}]`));
}

async function listManifestFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const manifestFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'templates') {
        continue;
      }

      manifestFiles.push(...await listManifestFiles(entryPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name.endsWith('.template.json')) {
      continue;
    }

    manifestFiles.push(entryPath);
  }

  return manifestFiles.sort((left, right) => left.localeCompare(right));
}

async function loadSegmentsFromIndex(indexPath, label) {
  const rawIndex = await readFile(indexPath, 'utf8');
  const parsedIndex = JSON.parse(rawIndex);

  if (Array.isArray(parsedIndex)) {
    return parsedIndex;
  }

  if (parsedIndex && Array.isArray(parsedIndex.segments)) {
    return parsedIndex.segments;
  }

  throw new Error(`Expected ${label} to contain an array of segments or an object with a segments array.`);
}

async function main() {
  const manifestFiles = await listManifestFiles(manifestRoot);

  if (manifestFiles.length === 0) {
    throw new Error('No approved corpus manifests were found under data/sources.');
  }

  const chunks = [];
  let sourceCount = 0;

  for (const manifestPath of manifestFiles) {
    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    if (!manifest || !Array.isArray(manifest.sources)) {
      throw new Error(`Manifest ${path.relative(repoRoot, manifestPath)} must contain a top-level sources array.`);
    }

    for (const source of manifest.sources) {
      sourceCount += 1;

      const author = assertString(source.author, `${source.id}.author`);
      const work = assertString(source.work, `${source.id}.work`);
      const tier = assertString(source.tier, `${source.id}.tier`);
      const rightsStatus = assertString(source.rights?.status, `${source.id}.rights.status`);
      const rightsNotes = assertString(source.rights?.notes, `${source.id}.rights.notes`);
      const sourceLabel = assertString(source.provenance?.sourceLabel, `${source.id}.provenance.sourceLabel`);

      if (rightsStatus !== 'public-domain' && rightsStatus !== 'licensed') {
        throw new Error(`Source ${source.id} is marked ${rightsStatus}. Restricted sources may not be ingested.`);
      }

      const explicitSegments = Array.isArray(source.segments) ? source.segments : null;
      const segmentIndexFile = typeof source.segmentIndexFile === 'string' ? source.segmentIndexFile.trim() : '';
      const indexedSegments = segmentIndexFile
        ? await loadSegmentsFromIndex(path.join(repoRoot, segmentIndexFile), `${source.id}.segmentIndexFile`)
        : null;
      const segments = explicitSegments ?? indexedSegments;

      if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error(`Source ${source.id} must contain explicit segments or a segmentIndexFile with at least one segment.`);
      }

      for (const segment of segments) {
        const filePath = path.join(repoRoot, assertString(segment.filePath, `${source.id}.${segment.id}.filePath`));
        const text = assertString(await readFile(filePath, 'utf8'), `${source.id}.${segment.id}.text`);

        chunks.push({
          id: assertString(segment.id, `${source.id}.segment.id`),
          author,
          work,
          location: assertString(segment.location, `${source.id}.${segment.id}.location`),
          tier,
          modeTags: assertModeTags(segment.modeTags, `${source.id}.${segment.id}.modeTags`),
          summary: assertString(segment.summary, `${source.id}.${segment.id}.summary`),
          text,
          keywords: assertKeywords(segment.keywords, `${source.id}.${segment.id}.keywords`),
          provenance: {
            sourceLabel,
            rightsStatus,
            rightsNotes
          }
        });
      }
    }
  }

  await mkdir(path.dirname(jsonOutputPath), { recursive: true });
  await mkdir(path.dirname(tsOutputPath), { recursive: true });

  await writeFile(jsonOutputPath, `${JSON.stringify(chunks, null, 2)}\n`, 'utf8');
  await writeFile(
    tsOutputPath,
    [
      "import { CorpusChunk } from './corpusSchema.js';",
      '',
      `export const generatedCorpus: CorpusChunk[] = ${JSON.stringify(chunks, null, 2)};`,
      ''
    ].join('\n'),
    'utf8'
  );

  console.log(`Loaded ${sourceCount} approved sources from ${manifestFiles.length} manifest file(s).`);
  console.log(`Generated ${chunks.length} corpus chunks.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
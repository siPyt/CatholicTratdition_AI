import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function requireArg(flag) {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanizeStem(stem) {
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const inputDirArg = requireArg('--inputDir');
  const outputArg = requireArg('--output');
  const modeTagsArg = requireArg('--modeTags');
  const inputDir = path.resolve(repoRoot, inputDirArg);
  const outputPath = path.resolve(repoRoot, outputArg);
  const idPrefix = getArg('--idPrefix')?.trim() || '';
  const modeTags = modeTagsArg.split(',').map((value) => value.trim()).filter(Boolean);

  if (modeTags.length === 0) {
    throw new Error('At least one mode tag is required in --modeTags.');
  }

  const entries = await readdir(inputDir, { withFileTypes: true });
  const textFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (textFiles.length === 0) {
    throw new Error(`No .txt files found in ${inputDirArg}`);
  }

  const segments = textFiles.map((fileName) => {
    const stem = fileName.replace(/\.txt$/i, '');
    const slug = toSlug(stem);

    return {
      id: idPrefix ? `${idPrefix}${slug}` : slug,
      location: humanizeStem(stem),
      modeTags,
      summary: `TODO: add a reviewed summary for ${humanizeStem(stem)}.`,
      keywords: [],
      filePath: path.posix.join(inputDirArg.replace(/\\/g, '/'), fileName)
    };
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ segments }, null, 2)}\n`, 'utf8');

  console.log(`Indexed ${segments.length} text file(s) from ${inputDirArg}.`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
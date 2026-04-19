# Catholic Tradition AI

Catholic Tradition AI is an Ionic + Vercel application for Catholic question answering with three distinct layers:

- A public-facing chat UI for typed and voice interaction.
- Serverless APIs for chat, text-to-speech, health checks, and source retrieval.
- A citation-aware corpus scaffold for Fathers, Aquinas, and later approved texts.

## Source Policy

User-facing citations must cite the work itself, not the website used to locate or ingest the text.

- Good: `Thomas Aquinas, Summa Theologiae, I, q. 2, a. 3`
- Good: `Augustine, Confessions, Book 8, Chapter 12`
- Bad: `New Advent`
- Bad: a raw URL or hostname

This repository is set up so provenance can be stored internally while the answer surface remains canonical and work-based.

## Allowed Ingestion Rules

Do not ingest a source into the committed corpus unless one of these is true:

- The text is public domain.
- The text is covered by a license that permits storage, indexing, and retrieval.

Do not ingest sources marked `restricted` in the manifest. If you discover a text through a website such as New Advent, treat that host as discovery or provenance unless and until you have confirmed reuse rights for the underlying edition and translation.

This repo is intentionally set up for approved exports and reviewed corpus files. It is not set up to mirror a third-party website wholesale.

## Corpus Scaffold

The committed scaffold consists of:

- [data/sources/approved-sources.json](data/sources/approved-sources.json): the ingestion manifest.
- [data/raw/augustine-confessions-book-8-chapter-12.txt](data/raw/augustine-confessions-book-8-chapter-12.txt): an approved public-domain excerpt.
- [data/raw/ignatius-smyrnaeans-chapter-7.txt](data/raw/ignatius-smyrnaeans-chapter-7.txt): an approved public-domain excerpt.
- [data/raw/aquinas-summa-theologiae-i-q2-a3.txt](data/raw/aquinas-summa-theologiae-i-q2-a3.txt): an approved public-domain excerpt.
- [api/\_lib/generatedCorpus.ts](api/_lib/generatedCorpus.ts): the generated runtime corpus used by Vercel functions.

Each manifest segment defines:

- the canonical citation location,
- the authority tier,
- allowed mode tags,
- a short summary,
- search keywords,
- the local raw text path,
- rights and provenance metadata.

## Ingestion Command

Run this after editing the manifests or the raw approved text files:

```bash
npm run ingest:corpus
```

That command regenerates:

- [data/corpus/library.json](data/corpus/library.json)
- [api/\_lib/generatedCorpus.ts](api/_lib/generatedCorpus.ts)

The ingestion script now scans all JSON manifests under [data/sources](data/sources), excluding templates, so the corpus can be split across many per-work manifest files instead of one monolithic file.

## Bulk Corpus Workflow

For large approved corpora such as the Fathers or the Summa, use one manifest per work and one segment index per work.

- Work manifest template: [data/sources/templates/work-manifest.template.json](data/sources/templates/work-manifest.template.json)
- Segment index template: [data/sources/templates/segment-index.template.json](data/sources/templates/segment-index.template.json)

Recommended structure:

- `data/sources/fathers/*.json` for per-work manifests
- `data/sources/indexes/*.json` for segment indexes
- `data/raw/<work>/*.txt` for approved text files

If you already have a directory full of approved `.txt` files for one work, you can bootstrap a segment index skeleton with:

```bash
npm run bootstrap:work-index -- --inputDir data/raw/your-work --output data/sources/indexes/your-work-index.json --modeTags fathers,apologetics --idPrefix your-work-
```

That creates a starter index from filenames. You still need to review and fill in the canonical locations, summaries, and keywords before ingestion.

## Retrieval API

The retrieval endpoint is exposed at [api/retrieve.ts](api/retrieve.ts).

### GET

```text
/api/retrieve?q=first%20cause&mode=proofs&limit=3
```

### POST

```json
{
  "query": "What did the Fathers say about the Eucharist?",
  "mode": "fathers",
  "limit": 3
}
```

The response includes:

- canonical citation text,
- author, work, and location,
- retrieval score,
- indexed summary and text,
- safe provenance labels without exposing hostnames to end users.

## Chat Integration

The chat handler at [api/chat.ts](api/chat.ts) now runs a lightweight local retrieval pass against the generated corpus before sending the request upstream. Matching passages are inserted into the system prompt as retrieved canonical context so the assistant can ground answers in the local corpus while still following the citation policy.

The chat UI at [src/pages/Tab1.tsx](src/pages/Tab1.tsx) also exposes a grounding preview so users can inspect the canonical passages the app is matching before or during a conversation.

## Environment

Use [.env.example](.env.example) as the template for your local and Vercel secrets. The current serverless APIs use OpenAI for chat and ElevenLabs for voice.

## Verification

Useful commands:

```bash
npm run ingest:corpus
npm run test.unit -- --run src/server/apiHandlers.test.ts
npm run build
```

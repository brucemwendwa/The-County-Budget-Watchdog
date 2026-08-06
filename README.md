# The County Budget Tracker

**Track. Understand. Participate.**

A civic intelligence platform for Kenya's county budgets. Find your ward on a map of Kenya, read
what the county budget records for it, ask questions answered from the source pages, and say what
you think the budget should fund.

## The journey

```
Kenya → County → Sub-county → Ward → Budget documents → AI analysis → Citizen participation
```

The map is the interface. Clicking a county zooms into it and fades the rest of Kenya away;
clicking a sub-county zooms again; clicking a ward leaves only that ward, and the dashboard for it
opens beside the map. Nothing navigates — the whole drill-down happens in place, and the URL is
updated so a view can be shared. The location pickers and breadcrumbs read and write the same
selection the map does, so they can never disagree.

## Data honesty

This is the constraint the whole system is built around: **every figure shown comes from a document
that was uploaded and read, and cites the page it was read from.**

- No sample, seed, or demo data. A place with no processed document shows an empty state naming
  what is missing.
- A total the document did not state is shown as "Not stated in documents", never as zero.
- County-level totals are labelled as county-level, even when you are looking at a ward. Folding
  county-wide spending into a ward's total would overstate what that ward received.
- Rows that name a ward and rows the document recorded county-wide are counted separately.
- When the documents cannot answer a question, the assistant says so.
- "Items needing clarification" are prompts for a question — a vague description, a repeated line, a
  low-confidence parse — never findings of wrongdoing.

## Administrative data

47 counties, 292 sub-counties, and 1,435 wards, with boundaries, from
[GADM 4.1](https://gadm.org). Regenerate with:

```bash
npm run build:kenya-data
```

`scripts/build-kenya-data.mjs` downloads the source, normalises names (GADM ships them run
together — `DagorettiNorth`, `AthiRiver`), applies one documented correction where the source
mis-parents a real ward, and emits:

- `data/kenya/hierarchy.json` — the tree, bundled into the server for validation
- `public/geo/counties.topo.json` — all 47 county outlines (71 KB)
- `public/geo/subcounties/<county>.topo.json` and `public/geo/wards/<county>.topo.json` — loaded
  only when that county is selected (8–40 KB each)

Geometry is TopoJSON so shared borders are stored once and stay watertight after simplification;
independently simplified polygons drift apart and leave visible seams between wards.

## Document pipeline

1. **Read.** The PDF text layer is extracted **page by page**, so every figure can cite the page it
   was actually printed on rather than an estimate.
2. **Detect.** County, financial year, document type, and title are read from the document's own
   cover and front matter. Each field records where it came from and how confident the match is; an
   uploader can override any of them.
3. **Extract.** Budget rows are parsed with ward names matched against *that county's real ward
   list*, so a row is only attributed to a ward that exists there. Document totals and narrative
   sentences are excluded from rows — counting a stated total as a project row would double it.
4. **Analyse.** Stated totals, departments, sectors, tables, recorded changes, and clarification
   items are derived from what was extracted.

Scanned PDFs are detected and reported as needing OCR. With Google Document AI configured they are
OCR'd; without it the upload says *"Scanned PDF detected. OCR configuration is required."* and
returns no figures.

Supported types: County Budget, Finance Bill, Supplementary Budget, Programme Based Budget, Annual
Development Plan, County Fiscal Strategy Paper, Implementation Report, Controller of Budget Report.

Automatic collection from county websites is not implemented. `lib/document-sources.ts` defines the
interface a collector must satisfy and ships none, rather than a stub that appears to work.

## Ask AI

Answers are grounded in processed documents only. The retrieved passages are numbered and the model
must cite them by number — a citation pointing at anything it was not given is discarded before the
answer reaches the reader. Every answer carries the direct answer, a plain-language explanation, the
source document and page, a confidence level, what it means for citizens, and a follow-up question.

Without `GEMINI_API_KEY` the endpoint still works: it returns the matching source passages and says
plainly that no model is configured, instead of pretending to summarise.

## Running it

```bash
npm install
npm run dev
```

No environment variables are required. Copy `.env.example` to `.env.local` to switch on AI answers,
OCR, or durable storage; the Settings page shows what is active.

```bash
npm run typecheck
npm run lint
npm run build
```

## Architecture

- **Next.js 15 App Router**, TypeScript, Tailwind CSS
- **Map** — SVG paths projected with Web Mercator, viewport animated by writing the `viewBox`
  directly rather than re-rendering React each frame
- **Extraction** — `pdf-parse` for the text layer, Google Document AI for OCR
- **AI** — Gemini, schema-validated and citation-checked, with a grounded fallback
- **Storage** — a file-backed store by default; PostgreSQL when `DATABASE_URL` is set
  (`db/schema.sql`)
- **Deployment** — Vercel

See `ARCHITECTURE.md` for how the pieces fit together.

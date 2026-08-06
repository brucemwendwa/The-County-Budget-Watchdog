# County Budget Tracker

County Budget Tracker helps citizens understand official county budget information from county level down to ward level, using AI explanations, source citations, and transparent public finance insights.

**Tagline:** Track. Understand. Participate.

## Problem

County budget PDFs are long, technical, and hard for residents, journalists, NGOs, and public officers to navigate. Ward-level details are buried in tables, amendments are hard to compare, and public participation often lacks accessible summaries tied to source pages.

## Solution

An AI-powered civic finance platform that:

- Maps Kenya's 47 counties with honest analysis status
- Drills down County → Sub-county → Ward → Financial year
- Surfaces budget overview cards, sector charts, and ward insights from extracted data
- Links every insight to source documents with page references
- Answers questions via grounded RAG (Gemini when configured)
- Flags **items needing clarification** (not accusations)
- Supports PDF upload for missing or outdated documents

## Key Features

- **County insights** — allocations, development vs recurrent, sector breakdown
- **Source documents** — titled records with financial year, type, and processing status
- **Ask AI** — direct answers with confidence, resident meaning, and expandable source evidence
- **Upload PDF** — extraction pipeline with honest processing states
- **Public participation** — suggested questions citizens can ask officials
- **Light/dark mode** — presentation-ready for government and civic audiences

## Architecture

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn-style UI, Framer Motion, Recharts
- **Backend:** Next.js App Router API routes
- **AI:** Gemini API (optional) with local RAG demo fallback
- **Parsing:** Google Document AI with `pdf-parse` fallback
- **Data:** PostgreSQL/Supabase, BigQuery analytics (production adapters included)
- **Storage:** Google Cloud Storage for PDFs
- **Deployment:** Vercel (demo), Cloud Run (worker-ready)

## Data Honesty Principles

- Real data shows source document, URL, financial year, and page reference
- Demo/sample data is labeled **Demo Data**
- Missing counties show: *No analyzed budget data available yet.*
- Missing documents show: *No official source document has been added for this county yet.*
- AI cannot answer: *The source document does not clearly provide this information.*
- Never fake national coverage, corruption scores, or user metrics

## Responsible AI

- AI summarizes official public documents only
- Users verify important findings from source PDFs
- Clarification items are informational, not legal accusations
- Does not replace audit, legal, or oversight institutions

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs without credentials using labeled demo data. Copy `.env.example` to `.env.local` for production integrations.

## Scanned PDFs and OCR

Many official county budget PDFs (for example **Machakos Programme Based Budget 2024–2025**) are **scanned images** with no selectable text layer. The upload pipeline:

1. Extracts text with `pdf-parse` (text layer check)
2. If text is insufficient → classifies as `SCANNED_PDF_REQUIRES_OCR`
3. If Google Document AI is configured → runs OCR, then parses tables
4. If OCR is not configured → shows an honest setup message (no fake rows)

### Google Document AI OCR setup

1. Create a GCP project and enable **Document AI API**
2. Create an **OCR** (or Document OCR) processor in the [Document AI console](https://console.cloud.google.com/ai/document-ai)
3. Create a service account with `Document AI API User` (or broader Document AI access)
4. Download the JSON key and set credentials:

```bash
# .env.local
GOOGLE_PROJECT_ID=your-gcp-project-id
GOOGLE_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Alternatively set `GOOGLE_SERVICE_ACCOUNT_JSON` to the full JSON string (useful on Vercel).

Legacy names `GOOGLE_CLOUD_PROJECT`, `DOCUMENT_AI_LOCATION`, and `DOCUMENT_AI_PROCESSOR_ID` are also supported.

Without these variables, scanned PDF uploads will explain that OCR is required instead of reporting “0 records extracted” as a silent failure.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Enable real AI document Q&A |
| `GEMINI_MODEL` | Gemini model name |
| `GOOGLE_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT` | GCP project for Document AI OCR |
| `GOOGLE_LOCATION` / `DOCUMENT_AI_LOCATION` | Document AI region (e.g. `us`, `eu`) |
| `GOOGLE_DOCUMENT_AI_PROCESSOR_ID` / `DOCUMENT_AI_PROCESSOR_ID` | OCR processor ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Inline service account JSON (optional) |
| `DATABASE_URL` | PostgreSQL/Supabase |
| `GCS_BUCKET` | PDF storage |
| `ADMIN_API_KEY` | Unlocks the paid pipeline (see Access Tiers) |
| See `.env.example` | Full list |

## Access Tiers

The app is public by design, but anything that costs money or leaves the system is withheld from
anonymous callers. `lib/auth.ts` resolves every API request into one of two tiers:

| | Public (no key) | Admin (`x-admin-api-key`) |
|---|---|---|
| PDF text-layer extraction | Yes | Yes |
| Document AI OCR | No — honest "admin key required" message | Yes, when configured |
| GCS PDF archiving | No | Yes, when configured |
| Database persistence | No — local cache only | Yes, when configured |
| SMS digest delivery | No — returns a preview | Yes, when configured |

Set `ADMIN_API_KEY` to enable the admin tier. Without it every caller is public, which keeps the
credential-free demo working while making it impossible for an anonymous upload to spend Document
AI or Cloud Storage quota, or to send SMS to real phone numbers.

## Upload Durability

Uploads are only permanent when `DATABASE_URL` and `GCS_BUCKET` are set **and** the request carries
the admin key. Otherwise the extraction goes to a local cache — `.runtime/` locally, `/tmp` on
Vercel — that clears when the deployment restarts. The upload result panel states which of these
happened rather than implying the document was stored.

## Deploy to Vercel

1. Import the repository in Vercel
2. Set environment variables from `.env.example`
3. Deploy — Next.js app and API routes deploy together

```bash
npm run build
```

## Demo Flow (Presentation)

1. Homepage — County Budget Tracker brand and county grid
2. Select Nairobi (Demo Data) on `/insights`
3. Drill down sub-county and ward
4. Review overview cards and sector charts
5. Open source documents
6. Ask AI: *What does this budget say about health?*
7. Expand source evidence
8. Review items needing clarification
9. Read responsible AI notice

## API Routes (Preserved)

- `POST /api/upload` — PDF upload and extraction (admin key unlocks OCR, GCS, and database writes)
- `POST /api/ask` — Grounded budget Q&A
- `GET/POST /api/monitor` — Amendment comparison
- `GET/POST /api/leak-detector` — Budget comparison signals (internal, no UI currently linked)
- SMS digest routes — Africa's Talking integration (admin key required for real delivery)

Admin dashboard remains at `/admin` but is not linked from primary navigation.

If `/api/ask` gets a malformed response from Gemini, the answer falls back to the local grounded
retriever and the UI labels it, rather than failing or showing an unvalidated model response.

## Future Roadmap

- Full ward-level extraction for all 47 counties
- Official county portal document sync
- USSD as a separate access channel (not primary web UI)
- Public participation workflow integration
- BigQuery analytics for cross-county trends

## Important Files

- `components/county-insights-page.tsx` — Main county drilldown experience
- `components/budget-chat.tsx` — Ask AI with source evidence
- `lib/ai.ts` — Gemini RAG and demo fallback
- `lib/parser.ts` — Document AI / pdf-parse
- `lib/counties.ts` — County registry and status badges
- `data/sample-budget.ts` — Demo data (clearly labeled in UI)

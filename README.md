# County Budget Watchdog

County Budget Watchdog helps Kenyan ward residents understand long county budget PDFs in simple language. It turns budget documents into searchable ward-level records, charts, civic alerts, and AI answers with source page references.

The hackathon demo uses Next.js API routes as the backend and ships with Nairobi, Makueni, Kisumu, and Kiambu sample data. Production adapters are included for Gemini, Google Document AI, PostgreSQL/Supabase, BigQuery, Google Cloud Storage, Clerk/Firebase-style auth, and Africa's Talking SMS.

## Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS, shadcn-style components, Framer Motion, Recharts
- Backend: Next.js App Router API routes
- AI: Gemini API or Vertex AI Gemini long-context RAG
- Parsing: Google Document AI, with local `pdf-parse` fallback
- Data: PostgreSQL/Supabase for app records, BigQuery for analytics
- Storage: Google Cloud Storage for PDFs
- SMS: Africa's Talking
- Deployment: Vercel frontend/API demo, Cloud Run worker-ready integration layer

## Demo Flows

1. Landing page: premium hero, upload CTA, chat CTA, SMS preview, trust indicators.
2. Resident dashboard: select county and ward, inspect summary cards, charts, map signals, project cards, and AI box.
3. Budget chat page: conversational AI, suggested questions, citations, page references, simplify and Swahili actions.
4. Watchdog alerts page: amendments, suspicious changes, gazette monitor, risk badges.
5. Admin dashboard: upload PDF, processing status, extracted table preview, SMS approval, analytics.
6. API routes:
   - `POST /api/upload`
   - `POST /api/ask`
   - `GET /api/monitor`
   - `POST /api/monitor` for original-vs-amended budget comparison
   - `GET /api/leak-detector`
   - `POST /api/leak-detector` for approved/supplementary/expenditure/implementation comparison
   - `GET /api/sms/digests`
   - `POST /api/sms/digests`
   - `POST /api/sms/versions`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app works without credentials by using demo data and mockable fallbacks. To enable production integrations, copy `.env.example` to `.env.local` and configure the relevant keys.

## Deploy

- Vercel: import the repo, set environment variables from `.env.example`, and deploy the Next.js app.
- Cloud Run: build the included `Dockerfile` when you want the API routes and background-style monitors in a Google Cloud runtime:

```bash
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/county-budget-watchdog
gcloud run deploy county-budget-watchdog \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/county-budget-watchdog \
  --region europe-west1 \
  --allow-unauthenticated
```

## Production Data Flow

1. Admin uploads PDF.
2. PDF is stored in Google Cloud Storage.
3. Document AI extracts text, tables, page anchors, and layout.
4. Extraction normalizer produces `budget_documents`, `ward_allocations`, and `budget_chunks`.
5. PostgreSQL stores reviewable app data. BigQuery stores analytics facts.
6. Embeddings are created for chunks. Gemini long-context RAG answers questions with citations.
7. Gazette and amendment monitor compares new documents to approved baselines.
8. SMS digest generator writes simple English, Swahili, or Sheng-friendly summaries.
9. Admin approves digests before Africa's Talking sends them.

## Important Files

- `components/resident-dashboard.tsx`: public resident intelligence surface
- `components/admin-dashboard.tsx`: upload, review, alerts, and SMS approvals
- `lib/parser.ts`: Document AI/local PDF extraction adapter
- `lib/ai.ts`: Gemini RAG and demo fallback
- `lib/db.ts`: PostgreSQL persistence
- `lib/sms.ts`: Africa's Talking adapter
- `lib/monitor.ts`: gazette/amendment monitor stub
- `db/schema.sql`: PostgreSQL/Supabase schema
- `bigquery/schema.sql`: BigQuery analytics schema
- `prompts/*.md`: extraction, RAG, SMS, and amendment-monitor prompts

## Amendment Comparison API

```http
POST /api/monitor
{
  "originalBudget": "Original budget text or extracted chunks...",
  "amendedBudget": "Amended budget text or extracted chunks..."
}
```

Returns risk level, summary of change, amount changed, source pages, why it matters, and the question residents should ask.

## Budget Leak Detector API

```http
POST /api/leak-detector
{
  "approvedBudget": "Approved budget text or extracted chunks...",
  "supplementaryBudget": "Supplementary budget text or extracted chunks...",
  "expenditureReport": "Expenditure report text or extracted chunks...",
  "implementationReport": "Implementation report text or extracted chunks..."
}
```

Detects allocated-but-not-spent money, spending without clear allocation, repeated project names, ward inequality,
never-completed projects, sudden cuts after public participation, and possible development-to-recurrent shifts.
The alerts page shows these as red, yellow, and green resident-friendly risk cards.

## Hackathon Positioning

"M-Pesa simplicity meets Bloomberg budget intelligence" means the resident view stays simple: search your ward, ask a plain question, see the amount, page source, confidence, why it matters, and what action to take. The admin view keeps the heavier machinery visible for judges: OCR, extraction review, suspicious changes, and digest approvals.

# Architecture

## Components

- Next.js web app: resident dashboard, admin dashboard, chat, upload UI.
- API routes: lightweight orchestration for upload, RAG, monitoring, and SMS.
- Document pipeline: Document AI first, local PDF parser fallback for demo continuity.
- Storage: GCS for PDFs, PostgreSQL for app workflow, BigQuery for analytics.
- AI layer: Gemini answers from retrieved budget rows and chunks, with strict JSON output.
- Notifications: Africa's Talking sends admin-approved digests.

## RAG Strategy

For production:

1. Split extracted pages into chunks using page boundaries and table row groups.
2. Store chunks in `budget_chunks` with embeddings and page metadata.
3. Retrieve by county, fiscal year, ward, department, and vector similarity.
4. Pass top chunks and structured allocation rows to Gemini.
5. Require JSON output with explanation, citations, confidence, resident impact, and action.

For demo:

The app uses sample structured rows in `data/sample-budget.ts` and a lexical retriever in `lib/ai.ts`.

## Budget Change Monitoring

The monitor should poll:

- County websites and treasury pages
- Kenya Gazette notices
- County Assembly order papers and committee reports
- Controller of Budget implementation reports

Each new document is parsed, normalized, and compared with the approved baseline by county, ward, department, programme, and project name similarity. High-risk changes are pushed to the admin dashboard before public SMS distribution.

## Security and Governance

- All AI claims include source pages and confidence.
- Admin approval is required before SMS sending.
- Store original PDFs and extraction artifacts for auditability.
- Add role-based auth for county admins, civil society reviewers, and public users.
- Avoid legal conclusions. Present records, changes, uncertainty, and civic action options.

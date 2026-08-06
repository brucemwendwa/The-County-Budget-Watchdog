# Architecture

## The one selection

Everything on screen is scoped by a single value: which county, sub-county, and ward the user has
chosen. It lives in `components/location-provider.tsx`, mounted in the root layout.

The map, the breadcrumbs, the pickers, and every page read and write that one value. This is what
keeps them synchronised — there is no second copy to drift out of step. It is mirrored into the URL
with `replaceState` (a shareable view, no history entries, no navigation) and into `localStorage`
(your place is kept between visits), and restored after mount so the server and client agree on the
first paint.

Location codes are hierarchical and dot-separated — `machakos`, `machakos.mavoko`,
`machakos.mavoko.athi-river` — so any level can be derived from a ward code without a lookup, and a
budget row can be rolled up to its sub-county or county by prefix.

## Map

| File | Role |
|---|---|
| `scripts/build-kenya-data.mjs` | Build-time: GADM → hierarchy JSON + TopoJSON layers |
| `lib/map/projection.ts` | Web Mercator projection, SVG paths, bounds, viewport fitting |
| `lib/map/geo-layers.ts` | Loads and projects a layer once per URL, cached and de-duplicated |
| `components/map/kenya-map.tsx` | Rendering, drill-down, zoom, pan, hover, keyboard access |

Layers load on demand: the 47 county outlines up front, then a county's sub-counties *and* wards
together when it is selected, so the next drill-down is instant.

The zoom animates by writing the SVG `viewBox` attribute directly from a `requestAnimationFrame`
loop. Re-rendering React on every frame would re-render every path; this way the paths are untouched
and the browser only re-rasterises. `prefers-reduced-motion` skips the animation entirely.

A unit can arrive as more than one polygon — an island, an exclave, or a source file that split it —
so `findAreaBounds` merges every polygon carrying the code. Zooming to only the first would frame a
fragment.

## Document pipeline

```
upload → pdf-text-layer → document-detection → extraction → analysis → store
                    ↓ (image-based)
              document-ai-ocr
```

| File | Role |
|---|---|
| `lib/pdf-text-layer.ts` | Per-page text extraction — the basis of every page citation |
| `lib/document-detection.ts` | County, financial year, document type, title, each with provenance |
| `lib/budget-text.ts` | Shared line classification: money, headings, totals, prose |
| `lib/extraction.ts` | Budget rows, with ward names matched to the county's real ward list |
| `lib/analysis.ts` | Stated totals, departments, sectors, tables, changes, clarifications |
| `lib/parser.ts` | Orchestration, including every unreadable-document path |
| `lib/store.ts` | File-backed storage; `lib/db.ts` for PostgreSQL when configured |

`lib/budget-text.ts` exists because the extractor and the analyser must answer the same questions
about a line the same way. A total that one treats as a project row and the other as a stated figure
gets counted twice.

A document that cannot be read still produces a record, with a status of `needs-ocr` or `ocr-failed`
and no figures. Dropping it would leave the uploader wondering where it went.

## Retrieval and answering

`lib/ai.ts` retrieves from processed documents only, scoped to the selected place, ranking budget
rows, stated totals, and recorded changes by lexical overlap with the question, and boosting rows
that name the selected ward.

The prompt numbers the evidence and requires the model to cite by number. Citations are then
resolved against the evidence that was actually supplied, and anything that does not resolve is
dropped — a model citing something it was not given has left the documents, and that citation must
not reach the reader.

Three outcomes are distinguished, because they mean different things to a citizen: no documents
exist for this place; documents exist but do not cover the question; the documents answer it.

## Access tiers

`lib/auth.ts`. Operations that cost money or leave the system — Document AI OCR, PDF archiving,
database writes — run only for callers presenting `ADMIN_API_KEY`. Without it configured every
caller is public, which keeps the platform fully usable without credentials while preventing
anonymous callers from spending quota. The upload response always states where the document actually
came to rest.

## Extending

- **A new document type** — add it to `DocumentType` and `DOCUMENT_TYPE_LABELS` in `lib/types.ts`,
  and a detection pattern in `lib/document-detection.ts`.
- **Automatic document collection** — implement `DocumentSource` in `lib/document-sources.ts` and
  register it. Discovered PDFs go through `parseBudgetDocument`, the same path as manual uploads, so
  they carry the same evidence and the same honest status.
- **Better extraction** — the heuristics in `lib/extraction.ts` are the weakest part of the system.
  They read programme-based budget layouts well and unusual table layouts poorly. Every row carries
  a confidence score and its source line, so failures are visible rather than silent.

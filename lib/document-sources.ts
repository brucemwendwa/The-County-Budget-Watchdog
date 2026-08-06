import "server-only";

import type { DocumentType } from "@/lib/types";

/**
 * The interface for fetching budget documents from official county sources.
 *
 * Documents reach this platform two ways. Manual upload is implemented and runs through
 * app/api/upload. Automatic collection from county websites is not: this file defines the shape a
 * collector must satisfy so it can be added without touching the pipeline, and deliberately ships
 * no collectors rather than a stub that appears to work.
 *
 * A collector's only job is to discover a PDF and describe where it came from. Everything after
 * that — reading the pages, detecting the county and financial year, extracting rows, deriving the
 * analysis — is the same code path a manual upload takes, so an automatically collected document
 * carries exactly the same evidence and the same honest processing status.
 *
 * To add one:
 *   1. Implement DocumentSource for the county's publication page or portal.
 *   2. Register it in DOCUMENT_SOURCES.
 *   3. Schedule collectSource, passing each discovered PDF to parseBudgetDocument.
 *
 * Anything a collector cannot determine must be left undefined so detection reads it from the
 * document itself. A guessed financial year is worse than an absent one.
 */

export type DiscoveredDocument = {
  /** Direct link to the PDF. */
  url: string;
  /** Page the link was found on, kept so a document can always be traced to its publisher. */
  sourcePage: string;
  /** Only when the source states it explicitly. */
  title?: string;
  fiscalYear?: string;
  documentType?: DocumentType;
  publishedAt?: string;
};

export type DocumentSource = {
  /** County code from the administrative hierarchy, e.g. "machakos". */
  countyCode: string;
  /** Human-readable name of the publisher, shown as the document's provenance. */
  publisher: string;
  /** The page or API that lists the county's budget documents. */
  indexUrl: string;
  /** Returns every budget PDF the source currently publishes. */
  discover: () => Promise<DiscoveredDocument[]>;
};

/**
 * Registered collectors. Empty by design: no county collector has been written and verified against
 * a live county site, and an unverified one would produce documents nobody can trust.
 */
export const DOCUMENT_SOURCES: DocumentSource[] = [];

export function getSourcesForCounty(countyCode: string) {
  return DOCUMENT_SOURCES.filter((source) => source.countyCode === countyCode);
}

export function hasAutomaticSources() {
  return DOCUMENT_SOURCES.length > 0;
}

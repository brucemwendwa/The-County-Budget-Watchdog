import "server-only";

import { Pool } from "pg";

import type { CitizenIdea, ExtractionResult } from "@/lib/types";

/**
 * Optional PostgreSQL persistence. Without DATABASE_URL the app runs entirely on the file-backed
 * store in lib/store.ts, and the upload response says so rather than implying durability.
 *
 * See db/schema.sql for the tables these statements expect.
 */
let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function saveExtractionResult(result: ExtractionResult) {
  const database = getPool();
  if (!database) {
    return { persisted: false, reason: "DATABASE_URL not configured" };
  }

  const client = await database.connect();
  try {
    await client.query("begin");

    await client.query(
      `insert into budget_documents
        (id, county_code, county_name, title, file_name, fiscal_year, type, status, uploaded_at, pages,
         source_url, detection, analysis)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (id) do update set
         status = excluded.status,
         detection = excluded.detection,
         analysis = excluded.analysis`,
      [
        result.document.id,
        result.document.countyCode,
        result.document.countyName,
        result.document.title,
        result.document.fileName,
        result.document.fiscalYear,
        result.document.type,
        result.document.status,
        result.document.uploadedAt,
        result.document.pages,
        result.document.sourceUrl ?? null,
        JSON.stringify(result.document.detection),
        JSON.stringify(result.analysis)
      ]
    );

    for (const item of result.lineItems) {
      await client.query(
        `insert into budget_line_items
          (id, document_id, county_code, ward_code, ward_name, sub_county_code, sub_county_name,
           department, programme, project, fiscal_year, allocation_kes, expenditure_kes, budget_type,
           page, confidence, excerpt)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         on conflict (id) do nothing`,
        [
          item.id,
          item.documentId,
          item.countyCode,
          item.wardCode,
          item.wardName,
          item.subCountyCode,
          item.subCountyName,
          item.department,
          item.programme,
          item.project,
          item.fiscalYear,
          item.allocationKes,
          item.expenditureKes,
          item.budgetType,
          item.page,
          item.confidence,
          item.excerpt
        ]
      );
    }

    await client.query("commit");
    return { persisted: true };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveCitizenIdea(idea: CitizenIdea) {
  const database = getPool();
  if (!database) {
    return { persisted: false, reason: "DATABASE_URL not configured" };
  }

  await database.query(
    `insert into citizen_ideas
      (id, name, county_code, county_name, sub_county_code, sub_county_name, ward_code, ward_name,
       category, idea, submitted_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (id) do nothing`,
    [
      idea.id,
      idea.name,
      idea.countyCode,
      idea.countyName,
      idea.subCountyCode,
      idea.subCountyName,
      idea.wardCode,
      idea.wardName,
      idea.category,
      idea.idea,
      idea.submittedAt
    ]
  );

  return { persisted: true };
}

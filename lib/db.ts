import { Pool } from "pg";

import type { ExtractionResult } from "@/lib/types";

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

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
        (id, county, title, fiscal_year, type, status, uploaded_at, pages, source_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set status = excluded.status`,
      [
        result.document.id,
        result.document.county,
        result.document.title,
        result.document.fiscalYear,
        result.document.type,
        result.document.status,
        result.document.uploadedAt,
        result.document.pages,
        result.document.sourceUrl ?? null
      ]
    );

    for (const allocation of result.allocations) {
      await client.query(
        `insert into ward_allocations
          (id, document_id, county, ward, constituency, department, programme, project, fiscal_year,
           allocation_kes, expenditure_kes, budget_type, page, confidence, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         on conflict (id) do nothing`,
        [
          allocation.id,
          result.document.id,
          allocation.county,
          allocation.ward,
          allocation.constituency,
          allocation.department,
          allocation.programme,
          allocation.project,
          allocation.fiscalYear,
          allocation.allocationKes,
          allocation.expenditureKes,
          allocation.budgetType,
          allocation.page,
          allocation.confidence,
          allocation.status
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

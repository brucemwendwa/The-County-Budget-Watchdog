import { NextResponse } from "next/server";
import { z } from "zod";

import { answerBudgetQuestion } from "@/lib/ai";
import { apiErrorResponse } from "@/lib/api";

const AskSchema = z.object({
  question: z.string().min(3).max(500),
  countyCode: z.string().optional(),
  subCountyCode: z.string().optional(),
  wardCode: z.string().optional()
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { question, ...scope } = AskSchema.parse(await request.json());
    const result = await answerBudgetQuestion({ question, scope });

    return NextResponse.json({
      ...result.answer,
      searchedDocuments: result.searchedDocuments,
      /** False when no model is configured, so the UI can say the reply was assembled from rows. */
      modelConfigured: result.source === "gemini"
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

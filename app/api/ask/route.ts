import { NextResponse } from "next/server";
import { z } from "zod";

import { answerBudgetQuestion } from "@/lib/ai";
import { apiErrorResponse } from "@/lib/api";

const AskSchema = z.object({
  question: z.string().min(3),
  county: z.enum(["Nairobi", "Makueni", "Kisumu", "Kiambu", "Machakos"]).optional(),
  ward: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = AskSchema.parse(json);
    const { answer, source } = await answerBudgetQuestion(input);

    return NextResponse.json({
      ...answer,
      demo: !process.env.GEMINI_API_KEY,
      degraded: source === "local-rag-fallback"
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

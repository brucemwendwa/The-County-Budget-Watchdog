import { NextResponse } from "next/server";
import { z } from "zod";

import { answerBudgetQuestion } from "@/lib/ai";

const AskSchema = z.object({
  question: z.string().min(3),
  county: z.enum(["Nairobi", "Makueni", "Kisumu", "Kiambu"]).optional(),
  ward: z.string().optional()
});

export async function POST(request: Request) {
  const json = await request.json();
  const input = AskSchema.parse(json);
  const answer = await answerBudgetQuestion(input);

  return NextResponse.json(answer);
}

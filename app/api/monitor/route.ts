import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeBudgetAmendment, monitorBudgetChanges } from "@/lib/monitor";

const AmendmentSchema = z.object({
  originalBudget: z.string().min(10),
  amendedBudget: z.string().min(10)
});

export async function GET() {
  return NextResponse.json(await monitorBudgetChanges());
}

export async function POST(request: Request) {
  const input = AmendmentSchema.parse(await request.json());
  const analysis = await analyzeBudgetAmendment(input.originalBudget, input.amendedBudget);

  return NextResponse.json({ analysis });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { detectBudgetLeaks } from "@/lib/leak-detector";
import { apiErrorResponse } from "@/lib/api";

const LeakDetectorSchema = z.object({
  approvedBudget: z.string().optional(),
  supplementaryBudget: z.string().optional(),
  expenditureReport: z.string().optional(),
  implementationReport: z.string().optional()
});

export async function GET() {
  return NextResponse.json(detectBudgetLeaks());
}

export async function POST(request: Request) {
  try {
    const input = LeakDetectorSchema.parse(await request.json());
    return NextResponse.json(detectBudgetLeaks(input));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

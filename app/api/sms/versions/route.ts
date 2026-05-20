import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api";
import { generateSmsVersions } from "@/lib/sms";

const SmsVersionsSchema = z.object({
  budgetUpdate: z.string().min(5)
});

export async function POST(request: Request) {
  try {
    const input = SmsVersionsSchema.parse(await request.json());
    const versions = await generateSmsVersions(input.budgetUpdate);

    return NextResponse.json({ versions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

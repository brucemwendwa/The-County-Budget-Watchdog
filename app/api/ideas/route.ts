import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api";
import { validateSelection } from "@/lib/kenya-server";
import { listIdeas, saveIdea } from "@/lib/store";
import { IDEA_CATEGORY_LABELS, type CitizenIdea, type IdeaCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IdeaSchema = z.object({
  name: z.string().trim().max(80).optional(),
  countyCode: z.string().min(1),
  subCountyCode: z.string().min(1),
  wardCode: z.string().min(1),
  category: z.enum(Object.keys(IDEA_CATEGORY_LABELS) as [IdeaCategory, ...IdeaCategory[]]),
  idea: z.string().trim().min(10).max(1000)
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ideas = await listIdeas({
    wardCode: params.get("wardCode") ?? undefined,
    countyCode: params.get("countyCode") ?? undefined
  });

  return NextResponse.json({ ideas });
}

export async function POST(request: Request) {
  try {
    const input = IdeaSchema.parse(await request.json());

    // An idea is only useful if it is filed against a place that exists, so the whole chain is
    // checked rather than trusted from the client.
    const location = validateSelection(input);
    if (!location.ok) {
      return NextResponse.json({ error: location.error }, { status: 400 });
    }
    if (!location.subCounty || !location.ward) {
      return NextResponse.json({ error: "Select a ward before submitting an idea." }, { status: 400 });
    }

    const idea: CitizenIdea = {
      id: `idea-${crypto.randomUUID()}`,
      name: input.name?.trim() ? input.name.trim() : null,
      countyCode: location.county.code,
      countyName: location.county.name,
      subCountyCode: location.subCounty.code,
      subCountyName: location.subCounty.name,
      wardCode: location.ward.code,
      wardName: location.ward.name,
      category: input.category,
      idea: input.idea,
      submittedAt: new Date().toISOString()
    };

    await saveIdea(idea);
    // Best effort: the idea is already recorded in the local store, so a database that is
    // unreachable must not lose the submission the citizen just made.
    await saveCitizenIdea(idea).catch((error: unknown) => {
      console.error("Citizen idea was not persisted to the database", error);
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

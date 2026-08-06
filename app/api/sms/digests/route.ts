import { NextResponse } from "next/server";
import { z } from "zod";

import { smsDigests } from "@/data/sample-budget";
import { apiErrorResponse } from "@/lib/api";
import { resolveAccess } from "@/lib/auth";
import { sendSmsDigest } from "@/lib/sms";

const SmsSchema = z.object({
  digestId: z.string(),
  recipients: z.array(z.string()).default(["+254700000000"])
});

export async function GET() {
  return NextResponse.json({ digests: smsDigests });
}

export async function POST(request: Request) {
  const access = resolveAccess(request);

  try {
    const input = SmsSchema.parse(await request.json());
    const digest = smsDigests.find((item) => item.id === input.digestId);

    if (!digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    const result = await sendSmsDigest({ ...digest, status: "approved" }, input.recipients, {
      allowRealSend: access.allowPaidServices
    });
    return NextResponse.json({ digest: { ...digest, status: "approved" }, sms: result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

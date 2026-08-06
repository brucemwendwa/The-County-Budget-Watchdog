import { timingSafeEqual } from "crypto";

export type AccessTier = "public" | "admin";

export type AccessDecision = {
  tier: AccessTier;
  /**
   * Paid or outward-facing integrations — Document AI OCR, GCS archiving, database writes, and real
   * SMS delivery — run for admin callers only. Public callers still get the free extraction path so
   * the demo works without credentials, but they cannot spend quota or message real phone numbers.
   */
  allowPaidServices: boolean;
};

/**
 * Resolve what a caller is allowed to trigger. Without `ADMIN_API_KEY` configured every caller is
 * public, which keeps the credential-free demo working while withholding anything that costs money
 * or leaves the system.
 */
export function resolveAccess(request: Request): AccessDecision {
  const configuredKey = process.env.ADMIN_API_KEY?.trim();

  if (!configuredKey) {
    return { tier: "public", allowPaidServices: false };
  }

  const isAdmin = matchesConfiguredKey(request.headers.get("x-admin-api-key"), configuredKey);
  return {
    tier: isAdmin ? "admin" : "public",
    allowPaidServices: isAdmin
  };
}

function matchesConfiguredKey(provided: string | null, configured: string) {
  if (!provided) {
    return false;
  }

  const providedBytes = Buffer.from(provided);
  const configuredBytes = Buffer.from(configured);
  if (providedBytes.length !== configuredBytes.length) {
    return false;
  }

  return timingSafeEqual(providedBytes, configuredBytes);
}

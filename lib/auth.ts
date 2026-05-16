export function requireAdmin(request: Request) {
  const configuredKey = process.env.ADMIN_API_KEY;

  if (!configuredKey) {
    return { ok: true, mode: "demo" as const };
  }

  const providedKey = request.headers.get("x-admin-api-key");
  return {
    ok: providedKey === configuredKey,
    mode: "api-key" as const
  };
}

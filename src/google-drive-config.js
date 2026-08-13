import { GOOGLE_DRIVE_SCOPE } from "../demo/google-drive-storage.js";

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function handleGoogleDriveConfig(request, env) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
  }
  const clientId = typeof env.GOOGLE_CLIENT_ID === "string" ? env.GOOGLE_CLIENT_ID.trim() : "";
  return json({
    configured: Boolean(clientId),
    clientId: clientId || null,
    scope: GOOGLE_DRIVE_SCOPE
  });
}

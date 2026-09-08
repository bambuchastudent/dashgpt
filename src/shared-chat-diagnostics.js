import { canonicalSharedChatUrl, readSharedChat } from "./shared-chat.js";

const LEGACY_DIAGNOSTIC_STAGES = Object.freeze([
  ["backendReaderError", "reader-backend"],
  ["readerError", "reader-page"],
  ["proxyError", "raw-proxy"],
  ["domError", "browser-dom"],
  ["directError", "direct-page"],
  ["payloadError", "browser-html"]
]);

export function diagnosticsRequested(request) {
  return new URL(request.url).searchParams.get("diagnostics") === "1";
}

function safeStatus(value) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 0 && status <= 599 ? status : undefined;
}

function safeErrorKind(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
  if (/timeout|timed out|abort/.test(text)) return "timeout";
  if (/challenge|just a moment|captcha|turnstile/.test(text)) return "challenge";
  if (/browser fallback is not configured/.test(text)) return "missing-binding";
  if (/json|parse|readable|recognizable|conversation turns|no content|did not contain/.test(text)) return "parse";
  if (safeStatus(error?.status) !== undefined) return "http";
  return "error";
}

function legacyCauseSteps(error) {
  const cause = error?.cause && typeof error.cause === "object" ? error.cause : {};
  const steps = [];
  for (const [key, stage] of LEGACY_DIAGNOSTIC_STAGES) {
    const item = cause[key];
    if (!item) continue;
    const step = {
      phase: "support-replay",
      stage,
      outcome: "miss",
      kind: safeErrorKind(item)
    };
    const status = safeStatus(item?.status);
    if (status !== undefined) step.status = status;
    steps.push(step);
  }
  return steps;
}

function sourceUrlFromRequest(request) {
  const input = new URL(request.url).searchParams.get("url");
  if (!input) return null;
  try {
    return canonicalSharedChatUrl(input);
  } catch {
    return null;
  }
}

export async function legacyDiagnosticReplay(request, env) {
  const sourceUrl = sourceUrlFromRequest(request);
  if (!sourceUrl) return [];

  try {
    const result = await readSharedChat(sourceUrl, env);
    return [{
      phase: "support-replay",
      stage: "legacy-replay",
      outcome: "ok",
      kind: result?.retrieval || "resolved"
    }];
  } catch (error) {
    const steps = legacyCauseSteps(error);
    if (steps.length) return steps;
    return [{
      phase: "support-replay",
      stage: "legacy-replay",
      outcome: "miss",
      kind: safeErrorKind(error)
    }];
  }
}

export async function attachDiagnostics(response, request, steps) {
  let payload;
  try {
    payload = await response.clone().json();
  } catch {
    payload = {
      code: "SHARED_CHAT_UNREADABLE",
      error: "Unable to read this public ChatGPT conversation."
    };
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  const sourceUrl = sourceUrlFromRequest(request);
  const traceId = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Response(JSON.stringify({
    ...payload,
    diagnostics: {
      version: 1,
      traceId,
      shareId: sourceUrl?.pathname.split("/").filter(Boolean).at(-1) || "",
      generatedAt: new Date().toISOString(),
      sanitized: true,
      steps
    }
  }, null, 2), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

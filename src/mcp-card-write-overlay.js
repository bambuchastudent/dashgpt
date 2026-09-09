import { z } from "zod";
import { authorizePluginCardWrite, CARD_WRITE_SCOPE, mcpOAuthErrorResult } from "./plugin-oauth.js";
import { upsertCardInGoogleDrive } from "./plugin-card-write.js";

const LANGUAGE = z.enum(["en", "ru"]).default("en");
const INPUT = z.object({
  cardId: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(160),
  goal: z.string().max(1200).optional(),
  summary: z.string().min(1).max(5000),
  currentState: z.string().max(1800).optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().min(1).max(60)).max(12).default([]),
  decisions: z.array(z.string().min(1).max(600)).max(12).default([]),
  facts: z.array(z.string().min(1).max(600)).max(16).default([]),
  constraints: z.array(z.string().min(1).max(600)).max(12).default([]),
  userPreferences: z.array(z.string().min(1).max(600)).max(12).default([]),
  openQuestions: z.array(z.string().min(1).max(600)).max(12).default([]),
  next: z.string().max(1200).optional(),
  suggestedNextStep: z.string().max(1200).optional(),
  links: z.array(z.string().url().max(2000)).max(12).default([]),
  relatedMaterials: z.array(z.string().max(2000)).max(12).default([]),
  sourceUrl: z.string().url().max(2000).optional(),
  sourceTitle: z.string().max(200).optional(),
  language: LANGUAGE
});

const NOAUTH_SCHEMES = Object.freeze([{ type: "noauth" }]);
const CARD_WRITE_SECURITY_SCHEMES = Object.freeze([{ type: "oauth2", scopes: [CARD_WRITE_SCOPE] }]);

const TOOL = Object.freeze({
  name: "upsert_card",
  title: "Save or update a DashGPT Card",
  description: "Use when the user explicitly asks to save the useful outcome of the current conversation to DashGPT. Writes one canonical Card into the user's authorized Google Drive-backed DashGPT Vault. A public ChatGPT Share URL may be preserved as provenance, but DashGPT does not fetch it to complete this save.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", minLength: 1, maxLength: 200 },
      title: { type: "string", minLength: 1, maxLength: 160 },
      goal: { type: "string", maxLength: 1200 },
      summary: { type: "string", minLength: 1, maxLength: 5000 },
      currentState: { type: "string", maxLength: 1800 },
      category: { type: "string", maxLength: 80 },
      tags: { type: "array", maxItems: 12, items: { type: "string", minLength: 1, maxLength: 60 }, default: [] },
      decisions: { type: "array", maxItems: 12, items: { type: "string", minLength: 1, maxLength: 600 }, default: [] },
      facts: { type: "array", maxItems: 16, items: { type: "string", minLength: 1, maxLength: 600 }, default: [] },
      constraints: { type: "array", maxItems: 12, items: { type: "string", minLength: 1, maxLength: 600 }, default: [] },
      userPreferences: { type: "array", maxItems: 12, items: { type: "string", minLength: 1, maxLength: 600 }, default: [] },
      openQuestions: { type: "array", maxItems: 12, items: { type: "string", minLength: 1, maxLength: 600 }, default: [] },
      next: { type: "string", maxLength: 1200 },
      suggestedNextStep: { type: "string", maxLength: 1200 },
      links: { type: "array", maxItems: 12, items: { type: "string", format: "uri", maxLength: 2000 }, default: [] },
      relatedMaterials: { type: "array", maxItems: 12, items: { type: "string", maxLength: 2000 }, default: [] },
      sourceUrl: { type: "string", format: "uri", maxLength: 2000 },
      sourceTitle: { type: "string", maxLength: 200 },
      language: { type: "string", enum: ["en", "ru"], default: "en" }
    },
    required: ["title", "summary"],
    additionalProperties: false
  },
  outputSchema: {
    type: "object",
    properties: {
      language: { type: "string", enum: ["en", "ru"] },
      status: { type: "string", enum: ["created", "updated"] },
      cardId: { type: "string" },
      title: { type: "string" },
      contentVersion: { type: "integer", minimum: 1 },
      provider: { type: "string", enum: ["google-drive"] },
      sourceUrl: { type: ["string", "null"] }
    },
    required: ["language", "status", "cardId", "title", "contentVersion", "provider", "sourceUrl"],
    additionalProperties: false
  },
  securitySchemes: CARD_WRITE_SECURITY_SCHEMES,
  _meta: { securitySchemes: CARD_WRITE_SECURITY_SCHEMES },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  }
});

function jsonRpc(id, result) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function rpcError(id, code, message, data) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function parsedRpc(request) {
  if (request.method !== "POST") return null;
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return await request.clone().json();
  } catch {
    return null;
  }
}

async function parseBaseResponse(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function patchedJsonResponse(base, payload) {
  const headers = new Headers(base.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.delete("content-length");
  return new Response(JSON.stringify(payload), { status: base.status, statusText: base.statusText, headers });
}

function declareToolSecurity(tool) {
  const securitySchemes = Array.isArray(tool?.securitySchemes) && tool.securitySchemes.length
    ? tool.securitySchemes
    : NOAUTH_SCHEMES;
  return {
    ...tool,
    securitySchemes,
    _meta: { ...(tool?._meta || {}), securitySchemes }
  };
}

async function handleUpsert(request, env, message) {
  const language = message?.params?.arguments?.language === "ru" ? "ru" : "en";
  const authorization = await authorizePluginCardWrite(request, env);
  if (!authorization.ok) {
    return jsonRpc(message.id, mcpOAuthErrorResult(request, {
      error: authorization.error,
      description: authorization.description,
      language
    }));
  }

  const parsed = INPUT.safeParse(message?.params?.arguments || {});
  if (!parsed.success) {
    return rpcError(message.id, -32602, "Invalid upsert_card arguments.", { issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
  }

  try {
    const saved = await upsertCardInGoogleDrive({
      token: authorization.providerAccessToken,
      input: parsed.data,
      fetchFn: typeof env?.DASHGPT_PLUGIN_FETCH === "function" ? env.DASHGPT_PLUGIN_FETCH : fetch
    });
    const structuredContent = {
      language: parsed.data.language,
      status: saved.status,
      cardId: saved.card.id,
      title: saved.card.title,
      contentVersion: saved.card.contentVersion,
      provider: saved.provider,
      sourceUrl: saved.card.sourceUrl
    };
    const text = parsed.data.language === "ru"
      ? `Карточка DashGPT ${saved.status === "created" ? "сохранена" : "обновлена"} в Google Drive: ${saved.card.title}`
      : `DashGPT Card ${saved.status === "created" ? "saved" : "updated"} in Google Drive: ${saved.card.title}`;
    return jsonRpc(message.id, { structuredContent, content: [{ type: "text", text }] });
  } catch (error) {
    const code = String(error?.code || "card_write_failed");
    const reconnect = code === "google_reconnect_required" || /authorization/i.test(String(error?.message || ""));
    if (reconnect) {
      return jsonRpc(message.id, mcpOAuthErrorResult(request, {
        error: "invalid_token",
        description: "Google Drive authorization needs to be renewed.",
        language: parsed.data.language
      }));
    }
    const text = parsed.data.language === "ru"
      ? "Карточку не удалось сохранить. Данные в Vault не были подтверждены как записанные."
      : "The Card could not be saved. DashGPT did not confirm a Vault write.";
    return jsonRpc(message.id, { content: [{ type: "text", text }], isError: true });
  }
}

export async function handleMcpWithCardWrite(request, env, ctx, coreWorker) {
  const message = await parsedRpc(request);
  if (message?.method === "tools/call" && message?.params?.name === TOOL.name) {
    return handleUpsert(request, env, message);
  }

  const base = await coreWorker.fetch(request, env, ctx);
  if (!message || (message.method !== "tools/list" && message.method !== "initialize")) return base;
  const payload = await parseBaseResponse(base);
  if (!payload?.result) return base;

  if (message.method === "tools/list") {
    const tools = Array.isArray(payload.result.tools) ? payload.result.tools.map(declareToolSecurity) : [];
    if (!tools.some(tool => tool?.name === TOOL.name)) tools.push(TOOL);
    payload.result.tools = tools;
    return patchedJsonResponse(base, payload);
  }

  payload.result.serverInfo = { ...(payload.result.serverInfo || {}), version: "0.6.0" };
  payload.result.instructions = `${payload.result.instructions || ""} When the user explicitly asks to save or update the useful outcome of the current conversation, prefer upsert_card. It writes only after OAuth authorization to the user's Google Drive-backed DashGPT Vault. If direct authorization is unavailable, prepare_result_import remains the portable explicit fallback.`.trim();
  return patchedJsonResponse(base, payload);
}

export { TOOL as UPSERT_CARD_TOOL };

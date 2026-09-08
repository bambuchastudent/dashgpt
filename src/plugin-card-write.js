import {
  createVault,
  materializeResults,
  putResult,
  recordResultActivity
} from "../demo/vault.js";
import {
  createGoogleDriveFolder,
  createGoogleDriveVaultFile,
  discoverGoogleDriveFolder,
  discoverGoogleDriveVaultFile,
  downloadGoogleDriveVault,
  updateGoogleDriveVaultFile
} from "../demo/google-drive-storage.js";
import { canonicalizeChatGptSharedUrl } from "../demo/chatgpt-share-url.js";

const SECRET_PATTERNS = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/
];

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function cleanText(value, maxLength) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function cleanList(value, { maxItems = 12, maxLength = 500 } = {}) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const text = cleanText(item, maxLength);
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

function containsLikelySecret(value) {
  const serialized = JSON.stringify(value || {});
  return SECRET_PATTERNS.some(pattern => pattern.test(serialized));
}

function randomCardId() {
  return `result-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function normalizeSource({ sourceUrl, sourceTitle, title }) {
  if (sourceUrl) {
    const canonical = canonicalizeChatGptSharedUrl(sourceUrl);
    if (!canonical) {
      const error = new Error("sourceUrl must be a public ChatGPT Share URL when provided.");
      error.code = "invalid_source_url";
      throw error;
    }
    return {
      type: "chatgpt-share",
      url: canonical,
      title: cleanText(sourceTitle || title, 160) || "ChatGPT conversation"
    };
  }
  return {
    type: "chatgpt-plugin",
    title: cleanText(sourceTitle || title, 160) || "ChatGPT conversation"
  };
}

export function normalizePluginCardInput(input = {}) {
  const title = cleanText(input.title, 160);
  const summary = cleanText(input.summary, 5000);
  if (!title || !summary) {
    const error = new Error("Card title and summary are required.");
    error.code = "invalid_card";
    throw error;
  }
  const normalized = {
    cardId: cleanText(input.cardId, 200),
    title,
    goal: cleanText(input.goal, 1200),
    summary,
    currentState: cleanText(input.currentState, 1800),
    category: cleanText(input.category, 80) || "Мои чаты",
    tags: cleanList(input.tags, { maxItems: 12, maxLength: 60 }),
    decisions: cleanList(input.decisions, { maxItems: 12, maxLength: 600 }),
    facts: cleanList(input.facts, { maxItems: 16, maxLength: 600 }),
    constraints: cleanList(input.constraints, { maxItems: 12, maxLength: 600 }),
    userPreferences: cleanList(input.userPreferences, { maxItems: 12, maxLength: 600 }),
    openQuestions: cleanList(input.openQuestions, { maxItems: 12, maxLength: 600 }),
    next: cleanText(input.next, 1200),
    suggestedNextStep: cleanText(input.suggestedNextStep, 1200),
    links: cleanList(input.links, { maxItems: 12, maxLength: 2000 }),
    relatedMaterials: cleanList(input.relatedMaterials, { maxItems: 12, maxLength: 2000 }),
    language: cleanText(input.language, 12),
    source: normalizeSource({ sourceUrl: input.sourceUrl, sourceTitle: input.sourceTitle, title })
  };
  if (containsLikelySecret(normalized)) {
    const error = new Error("DashGPT will not save content that appears to contain credentials or private keys.");
    error.code = "secret_like_content";
    throw error;
  }
  return normalized;
}

function findExisting(vault, card) {
  const materialized = materializeResults(vault);
  if (card.source?.type === "chatgpt-share" && card.source.url) {
    const bySource = materialized.find(item => item.source?.type === "chatgpt-share" && item.source?.url === card.source.url);
    if (bySource) return bySource;
  }
  if (card.cardId) return materialized.find(item => item.id === card.cardId) || null;
  return null;
}

function buildResult(card, existing, createdAt) {
  const result = {
    id: existing?.id || card.cardId || randomCardId(),
    schemaVersion: 1,
    title: card.title,
    summary: card.summary,
    category: card.category,
    tags: [...new Set(["chatgpt", ...(card.source.type === "chatgpt-share" ? ["share"] : []), ...card.tags])],
    decisions: card.decisions,
    facts: card.facts,
    constraints: card.constraints,
    userPreferences: card.userPreferences,
    openQuestions: card.openQuestions,
    source: card.source,
    immutable: false,
    contentVersion: existing ? Number(existing.contentVersion || 1) + 1 : 1,
    status: "Сохранено"
  };
  if (card.goal) result.goal = card.goal;
  if (card.currentState) result.currentState = card.currentState;
  if (card.next) result.next = card.next;
  if (card.suggestedNextStep) result.suggestedNextStep = card.suggestedNextStep;
  if (card.links.length) result.links = card.links;
  if (card.relatedMaterials.length) result.relatedMaterials = card.relatedMaterials;
  if (card.language) result.language = card.language;
  if (!existing) result.publishedAt = createdAt;
  else if (existing.publishedAt) result.publishedAt = existing.publishedAt;
  return result;
}

export async function upsertCardInGoogleDrive({
  token,
  input,
  fetchFn = fetch,
  now = Date.now()
} = {}) {
  const providerToken = String(token || "").trim();
  if (!providerToken) {
    const error = new Error("Google Drive authorization is required.");
    error.code = "google_reconnect_required";
    throw error;
  }
  const card = normalizePluginCardInput(input);
  const timestamp = nowIso(now);

  let folder = await discoverGoogleDriveFolder({ token: providerToken, fetchFn });
  if (!folder) folder = await createGoogleDriveFolder({ token: providerToken, fetchFn });

  let file = await discoverGoogleDriveVaultFile({ token: providerToken, folderId: folder.id, fetchFn });
  const vault = file
    ? await downloadGoogleDriveVault({ token: providerToken, fileId: file.id, fetchFn })
    : createVault({ createdAt: timestamp });

  const existing = findExisting(vault, card);
  const result = buildResult(card, existing, timestamp);
  putResult(vault, result, { updatedAt: timestamp });
  recordResultActivity(vault, result.id, existing ? "updated" : "created", { createdAt: timestamp });

  if (file) {
    file = await updateGoogleDriveVaultFile({ token: providerToken, fileId: file.id, vault, fetchFn });
  } else {
    file = await createGoogleDriveVaultFile({ token: providerToken, folderId: folder.id, vault, fetchFn });
  }

  return {
    status: existing ? "updated" : "created",
    card: {
      id: result.id,
      title: result.title,
      contentVersion: result.contentVersion,
      sourceUrl: result.source?.url || null
    },
    provider: "google-drive",
    vaultId: vault.vaultId,
    fileId: file.id || null
  };
}

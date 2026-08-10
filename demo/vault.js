export const VAULT_SCHEMA_VERSION = 1;
export const VAULT_STORAGE_KEY = "dashgpt.demo.vault.v1";
export const LEGACY_RESULTS_KEYS = ["dashgpt.demo.results.v2", "dashgpt.demo.results.v1"];

const RESULT_FIELDS = [
  "id", "schemaVersion", "title", "summary", "category", "tags", "decisions", "next", "source",
  "publishedAt", "immutable", "contentVersion", "contentHash", "status", "result", "body", "instructions",
  "code", "links", "images", "assets", "openQuestions", "relatedResults", "continuationContext"
];
const SOURCE_FIELDS = ["type", "url", "title", "provider", "sourceId"];
const EVENT_FIELDS = ["schemaVersion", "eventId", "type", "resultId", "value", "createdAt"];
const LEGACY_SEED_IDS = new Set(["dashgpt-product", "development-workflow", "deployment"]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function isoNow() {
  return new Date().toISOString();
}

function randomId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validResult(result) {
  return Boolean(result && typeof result.id === "string" && typeof result.title === "string" && typeof result.summary === "string");
}

function sanitizeSource(source) {
  if (!isObject(source)) return undefined;
  const clean = {};
  for (const field of SOURCE_FIELDS) if (source[field] !== undefined) clean[field] = clone(source[field]);
  return Object.keys(clean).length ? clean : undefined;
}

export function sanitizeResult(result) {
  if (!validResult(result)) throw new Error("Invalid DashGPT Result");
  const clean = {};
  for (const field of RESULT_FIELDS) {
    if (result[field] !== undefined) clean[field] = field === "source" ? sanitizeSource(result[field]) : clone(result[field]);
  }
  clean.schemaVersion = Number(clean.schemaVersion || 1);
  clean.tags = Array.isArray(clean.tags) ? clean.tags : [];
  clean.decisions = Array.isArray(clean.decisions) ? clean.decisions : [];
  clean.contentVersion = Number(clean.contentVersion || 1);
  clean.immutable = Boolean(clean.immutable);
  return clean;
}

function sanitizeEvent(event) {
  if (!isObject(event) || typeof event.eventId !== "string" || typeof event.type !== "string" || typeof event.createdAt !== "string") {
    throw new Error("Invalid vault event");
  }
  const clean = {};
  for (const field of EVENT_FIELDS) if (event[field] !== undefined) clean[field] = clone(event[field]);
  clean.schemaVersion = Number(clean.schemaVersion || 1);
  return clean;
}

function immutableIdentity(result) {
  const hash = typeof result.contentHash === "string" ? result.contentHash : `unverified:${JSON.stringify(result)}`;
  return `${result.id}@${result.contentVersion || 1}:${hash}`;
}

function eventIdentity(event) {
  return `${event.eventId}:${JSON.stringify(sanitizeEvent(event))}`;
}

export function createVault(options = {}) {
  const createdAt = options.createdAt || isoNow();
  return {
    schemaVersion: VAULT_SCHEMA_VERSION,
    vaultId: options.vaultId || randomId("vault"),
    createdAt,
    updatedAt: createdAt,
    results: [],
    events: [],
    profileRevisions: []
  };
}

export function validateVault(input) {
  if (!isObject(input)) throw new Error("Vault must be an object");
  if (Number(input.schemaVersion) !== VAULT_SCHEMA_VERSION) throw new Error(`Unsupported vault schema: ${input.schemaVersion}`);
  if (typeof input.vaultId !== "string" || !input.vaultId) throw new Error("Vault is missing vaultId");
  if (!Array.isArray(input.results) || !Array.isArray(input.events) || !Array.isArray(input.profileRevisions)) {
    throw new Error("Vault arrays are missing");
  }
  for (const result of input.results) sanitizeResult(result);
  for (const event of input.events) sanitizeEvent(event);
  return true;
}

export function portableVault(vault) {
  validateVault(vault);
  return {
    schemaVersion: VAULT_SCHEMA_VERSION,
    vaultId: vault.vaultId,
    createdAt: String(vault.createdAt || ""),
    updatedAt: String(vault.updatedAt || vault.createdAt || ""),
    results: vault.results.map(sanitizeResult),
    events: vault.events.map(sanitizeEvent),
    profileRevisions: clone(vault.profileRevisions)
  };
}

export function putResult(vault, result, options = {}) {
  validateVault(vault);
  const clean = sanitizeResult(result);
  const existing = vault.results;

  if (clean.immutable) {
    const identity = immutableIdentity(clean);
    if (!existing.some(item => item.immutable && immutableIdentity(item) === identity)) existing.push(clean);
  } else {
    const index = existing.findIndex(item => !item.immutable && item.id === clean.id);
    if (index >= 0) existing[index] = clean;
    else existing.push(clean);
  }

  vault.updatedAt = options.updatedAt || isoNow();
  return vault;
}

function latestFavoriteState(vault, resultId) {
  return vault.events
    .filter(event => event.type === "favorite" && event.resultId === resultId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId))
    .reduce((value, event) => Boolean(event.value), false);
}

export function setFavorite(vault, resultId, value, options = {}) {
  validateVault(vault);
  const desired = Boolean(value);
  if (latestFavoriteState(vault, resultId) === desired) return vault;
  const createdAt = options.createdAt || isoNow();
  vault.events.push({
    schemaVersion: 1,
    eventId: options.eventId || randomId("evt"),
    type: "favorite",
    resultId,
    value: desired,
    createdAt
  });
  vault.updatedAt = createdAt;
  return vault;
}

export function materializeResults(vault) {
  validateVault(vault);
  const byId = new Map();
  for (const result of vault.results) {
    const bucket = byId.get(result.id) || [];
    bucket.push(result);
    byId.set(result.id, bucket);
  }

  const materialized = [];
  for (const [id, revisions] of byId) {
    const ordered = revisions.slice().sort((a, b) => {
      const version = Number(b.contentVersion || 1) - Number(a.contentVersion || 1);
      if (version) return version;
      return String(b.contentHash || "").localeCompare(String(a.contentHash || ""));
    });
    const current = clone(ordered[0]);
    current.favorite = latestFavoriteState(vault, id);
    if (ordered.length > 1) current._vaultRevisionCount = ordered.length;
    const sameVersion = ordered.filter(item => Number(item.contentVersion || 1) === Number(current.contentVersion || 1));
    if (sameVersion.length > 1) current._vaultConflictCount = sameVersion.length;
    materialized.push(current);
  }
  return materialized;
}

function migrateArrayIntoVault(vault, items, legacyKey, options = {}) {
  for (const item of items) {
    if (!validResult(item)) continue;
    if (legacyKey.endsWith(".v1") && LEGACY_SEED_IDS.has(item.id)) continue;
    putResult(vault, item, { updatedAt: options.updatedAt });
    if (item.favorite) {
      setFavorite(vault, item.id, true, {
        eventId: `evt_migration_${item.id}`,
        createdAt: options.updatedAt || vault.createdAt
      });
    }
  }
}

export function loadBrowserVault(storage, options = {}) {
  const rawVault = storage.getItem(VAULT_STORAGE_KEY);
  if (rawVault) {
    const parsed = portableVault(JSON.parse(rawVault));
    return { vault: parsed, migratedFrom: null, created: false };
  }

  const createdAt = options.createdAt || isoNow();
  const vault = createVault({ vaultId: options.vaultId, createdAt });
  let migratedFrom = null;

  for (const key of LEGACY_RESULTS_KEYS) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) continue;
      migrateArrayIntoVault(vault, items, key, { updatedAt: createdAt });
      migratedFrom = key;
      break;
    } catch {
      // Ignore malformed legacy storage and initialize a clean local vault.
    }
  }

  saveBrowserVault(storage, vault);
  return { vault, migratedFrom, created: true };
}

export function saveBrowserVault(storage, vault) {
  const portable = portableVault(vault);
  storage.setItem(VAULT_STORAGE_KEY, JSON.stringify(portable));
  return portable;
}

export function mergeVaults(baseVault, incomingVault, options = {}) {
  const merged = portableVault(baseVault);
  const incoming = portableVault(incomingVault);

  for (const result of incoming.results) putResult(merged, result, { updatedAt: merged.updatedAt });

  const knownEvents = new Set(merged.events.map(eventIdentity));
  const knownIds = new Map(merged.events.map(event => [event.eventId, JSON.stringify(sanitizeEvent(event))]));
  for (const event of incoming.events) {
    const cleanEvent = sanitizeEvent(event);
    const serialized = JSON.stringify(cleanEvent);
    if (knownEvents.has(eventIdentity(cleanEvent))) continue;
    if (knownIds.has(cleanEvent.eventId) && knownIds.get(cleanEvent.eventId) !== serialized) {
      throw new Error(`Event integrity conflict: ${cleanEvent.eventId}`);
    }
    merged.events.push(cleanEvent);
    knownEvents.add(eventIdentity(cleanEvent));
    knownIds.set(cleanEvent.eventId, serialized);
  }

  const profileById = new Map(merged.profileRevisions.map(item => [item.profileRevisionId || JSON.stringify(item), JSON.stringify(item)]));
  for (const revision of incoming.profileRevisions) {
    const key = revision.profileRevisionId || JSON.stringify(revision);
    const serialized = JSON.stringify(revision);
    if (!profileById.has(key)) {
      merged.profileRevisions.push(clone(revision));
      profileById.set(key, serialized);
    } else if (profileById.get(key) !== serialized) {
      throw new Error(`Profile revision integrity conflict: ${key}`);
    }
  }

  merged.updatedAt = options.updatedAt || isoNow();
  return merged;
}

export function exportVaultBundle(vault) {
  const bundle = {
    format: "dashgpt-vault-bundle",
    bundleVersion: 1,
    exportedAt: isoNow(),
    vault: portableVault(vault)
  };
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function importVaultBundle(text) {
  const parsed = typeof text === "string" ? JSON.parse(text) : clone(text);
  const vault = parsed?.format === "dashgpt-vault-bundle" ? parsed.vault : parsed;
  return portableVault(vault);
}

export function vaultStatus(vault) {
  const portable = portableVault(vault);
  return {
    mode: "local",
    remote: "unpaired",
    dirty: false,
    label: "LOCAL · NOT SYNCED",
    vaultId: portable.vaultId,
    resultObjects: portable.results.length,
    events: portable.events.length
  };
}

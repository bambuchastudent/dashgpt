import assert from "node:assert/strict";
import {
  VAULT_STORAGE_KEY,
  createVault,
  exportVaultBundle,
  importVaultBundle,
  loadBrowserVault,
  materializeResults,
  mergeVaults,
  putDashRevision,
  putResult,
  saveBrowserVault,
  setDashOverride,
  setFavorite,
  vaultStatus
} from "../demo/vault.js";
import { createDashRevision, materializeDash } from "../demo/semantic-dashes.js";

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const legacyResult = {
  id: "legacy-result",
  schemaVersion: 1,
  title: "Legacy result",
  summary: "Migrated from browser storage",
  category: "Test",
  tags: ["vault"],
  favorite: true,
  decisions: ["Keep it"],
  immutable: false,
  contentVersion: 1,
  accessToken: "must-not-survive"
};

const storage = new MemoryStorage({
  "dashgpt.demo.results.v2": JSON.stringify([legacyResult])
});
const migration = loadBrowserVault(storage, {
  vaultId: "vault_test",
  createdAt: "2026-08-10T00:00:00.000Z"
});
assert.equal(migration.migratedFrom, "dashgpt.demo.results.v2");
assert.equal(migration.created, true);
assert.equal(materializeResults(migration.vault)[0].favorite, true);
assert.equal(migration.vault.events.length, 1);
assert.ok(storage.getItem(VAULT_STORAGE_KEY));
assert.ok(storage.getItem("dashgpt.demo.results.v2"), "legacy copy must remain untouched during migration");

const exported = exportVaultBundle({ ...migration.vault, accessToken: "top-secret", credentials: { token: "secret" } });
assert.ok(!exported.includes("must-not-survive"), "unknown Result transport fields must not enter the vault");
assert.ok(!exported.includes("top-secret"), "top-level adapter credentials must not enter portable export");
assert.ok(!exported.includes("credentials"), "credential containers must not enter portable export");
const roundTrip = importVaultBundle(exported);
assert.equal(roundTrip.vaultId, "vault_test");
assert.equal(roundTrip.results.length, 1);
assert.equal(materializeResults(roundTrip)[0].favorite, true);
assert.deepEqual(roundTrip.dashRevisions, [], "pre-feature Vaults must load with an empty Dash collection");

const dashRevision = createDashRevision({
  dashId: "dash_vault",
  dashRevisionId: "dashrev_vault_1",
  title: "Vault Dash",
  description: "Reference-only semantic Dash fixture",
  query: "vault",
  automaticResultIds: ["legacy-result"]
}, {
  dashId: "dash_vault",
  dashRevisionId: "dashrev_vault_1",
  now: "2026-08-10T00:00:01.000Z"
});
putDashRevision(roundTrip, dashRevision, { updatedAt: "2026-08-10T00:00:01.000Z" });
setDashOverride(roundTrip, "dash_vault", "dash.pin", "legacy-result", true, {
  eventId: "evt_dash_pin",
  createdAt: "2026-08-10T00:00:02.000Z"
});
const dashExport = exportVaultBundle(roundTrip);
assert.ok(dashExport.includes("dashrev_vault_1"));
const parsedDashExport = JSON.parse(dashExport);
assert.equal(parsedDashExport.vault.dashRevisions[0].summary, undefined, "Dash revision must not copy Result summaries");
assert.deepEqual(parsedDashExport.vault.dashRevisions[0].automaticResultIds, ["legacy-result"]);
const dashRoundTrip = importVaultBundle(dashExport);
assert.equal(dashRoundTrip.dashRevisions.length, 1);
assert.equal(materializeDash(dashRoundTrip.dashRevisions[0], dashRoundTrip.events, materializeResults(dashRoundTrip)).members[0].result.id, "legacy-result");
assert.equal(vaultStatus(dashRoundTrip).dashes, 1);
setDashOverride(dashRoundTrip, "dash_vault", "dash.delete", null, true, {
  eventId: "evt_dash_delete",
  createdAt: "2026-08-10T00:00:03.000Z"
});
assert.equal(vaultStatus(dashRoundTrip).dashes, 0, "storage status must not count tombstoned Dashes as active");
assert.equal(materializeResults(dashRoundTrip)[0].id, "legacy-result", "deleting a Dash must not delete Results");

const invalidDashVault = createVault({ vaultId: "vault_invalid_dash", createdAt: "2026-08-10T00:00:00.000Z" });
assert.throws(() => putDashRevision(invalidDashVault, { ...dashRevision, semanticDefinition: null }), /semantic definition is required/);

const left = createVault({ vaultId: "vault_conflict", createdAt: "2026-08-10T00:00:00.000Z" });
const right = createVault({ vaultId: "vault_conflict", createdAt: "2026-08-10T00:00:00.000Z" });
const common = {
  id: "immutable-result",
  schemaVersion: 1,
  title: "Immutable",
  summary: "Conflict fixture",
  category: "Test",
  tags: [],
  decisions: [],
  immutable: true,
  contentVersion: 1
};
putResult(left, { ...common, contentHash: `sha256:${"1".repeat(64)}` }, { updatedAt: "2026-08-10T00:00:01.000Z" });
putResult(right, { ...common, contentHash: `sha256:${"2".repeat(64)}` }, { updatedAt: "2026-08-10T00:00:02.000Z" });
setFavorite(left, common.id, true, { eventId: "evt_left", createdAt: "2026-08-10T00:00:03.000Z" });
setFavorite(right, common.id, true, { eventId: "evt_right_on", createdAt: "2026-08-10T00:00:03.500Z" });
setFavorite(right, common.id, false, { eventId: "evt_right_off", createdAt: "2026-08-10T00:00:04.000Z" });
const merged = mergeVaults(left, right, { updatedAt: "2026-08-10T00:00:05.000Z" });
assert.equal(merged.results.length, 2, "immutable divergence must preserve both revisions");
assert.equal(merged.events.length, 3, "append-only state events must union by event id");
const materialized = materializeResults(merged)[0];
assert.equal(materialized._vaultConflictCount, 2);
assert.equal(materialized.favorite, false, "latest favorite event must win deterministically");

const savedStorage = new MemoryStorage();
saveBrowserVault(savedStorage, { ...merged, refreshToken: "never-persist" });
assert.ok(!savedStorage.getItem(VAULT_STORAGE_KEY).includes("never-persist"));

const collisionLeft = createVault({ vaultId: "vault_collision", createdAt: "2026-08-10T00:00:00.000Z" });
const collisionRight = createVault({ vaultId: "vault_collision", createdAt: "2026-08-10T00:00:00.000Z" });
collisionLeft.events.push({ schemaVersion: 1, eventId: "evt_same", type: "favorite", resultId: "x", value: true, createdAt: "2026-08-10T00:00:01.000Z" });
collisionRight.events.push({ schemaVersion: 1, eventId: "evt_same", type: "favorite", resultId: "x", value: false, createdAt: "2026-08-10T00:00:01.000Z" });
assert.throws(() => mergeVaults(collisionLeft, collisionRight), /Event integrity conflict/);

const dashCollisionLeft = createVault({ vaultId: "vault_dash_collision", createdAt: "2026-08-10T00:00:00.000Z" });
const dashCollisionRight = createVault({ vaultId: "vault_dash_collision", createdAt: "2026-08-10T00:00:00.000Z" });
putDashRevision(dashCollisionLeft, dashRevision, { updatedAt: "2026-08-10T00:00:01.000Z" });
putDashRevision(dashCollisionRight, { ...dashRevision, title: "Conflicting title" }, { updatedAt: "2026-08-10T00:00:01.000Z" });
assert.throws(() => mergeVaults(dashCollisionLeft, dashCollisionRight), /Dash revision integrity conflict/);

console.log("Vault v1 migration, portability, conflict and credential tests passed.");

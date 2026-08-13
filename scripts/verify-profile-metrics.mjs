import assert from "node:assert/strict";
import {
  createVault,
  exportVaultBundle,
  importVaultBundle,
  materializeResults,
  mergeVaults
} from "../demo/vault.js";
import {
  applyChatGptImportBatchFast,
  sanitizeChatGptUsage
} from "../demo/chatgpt-history-import-batch.js";
import {
  buildChatGptHistorySourceRunner,
  estimateVisibleTextTokens
} from "../demo/chatgpt-history-source-runner.js";
import {
  appendProjectMetricsRevision,
  currentProjectMetrics,
  parseMoneyToMinor,
  projectTokenMetrics,
  sanitizeProjectMetricsRevision
} from "../demo/profile-metrics.js";
import {
  mergeVaultObjectSets,
  vaultFromObjects,
  vaultToObjects
} from "../src/vault-layout.js";

assert.equal(estimateVisibleTextTokens(""), 0);
assert.equal(estimateVisibleTextTokens("abcd"), 1);
assert.equal(estimateVisibleTextTokens("Привет"), 3);
assert.equal(estimateVisibleTextTokens("你好"), 2);
assert.equal(estimateVisibleTextTokens("Привет"), estimateVisibleTextTokens("Привет"), "estimator must be deterministic");

const runner = buildChatGptHistorySourceRunner({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/",
  sessionId: "session_test",
  nonce: "nonce_test"
});
assert.match(runner, /visible-text-v1/);
assert.match(runner, /tokenCountKind:\s*"estimated"/);
assert.match(runner, /estimateVisibleTextTokens/);

assert.deepEqual(sanitizeChatGptUsage({ tokenCount: 42, tokenCountKind: "estimated", estimator: "visible-text-v1" }), {
  tokenCount: 42,
  tokenCountKind: "estimated",
  estimator: "visible-text-v1"
});
assert.equal(sanitizeChatGptUsage({ tokenCount: -1, tokenCountKind: "estimated", estimator: "visible-text-v1" }), null);

const vault = createVault({ vaultId: "vault_profile_metrics", createdAt: "2026-08-13T12:00:00.000Z" });
const first = {
  sourceId: "conv_profile_metrics",
  title: "Token accounting",
  summary: "First imported version",
  currentState: "Continue",
  tags: ["metrics"],
  facts: ["4 visible messages"],
  updatedAt: "2026-08-13T12:01:00.000Z",
  usage: { tokenCount: 100, tokenCountKind: "estimated", estimator: "visible-text-v1" }
};
applyChatGptImportBatchFast(vault, [first], { state: "running", discovered: 1, imported: 1 });
let imported = materializeResults(vault).filter(result => result.source?.sourceId === "conv_profile_metrics");
assert.equal(imported.length, 1);
assert.equal(imported[0].result.usage.tokenCount, 100);
assert.deepEqual(projectTokenMetrics(imported), { tokenCount: 100, countedCards: 1, estimated: true });

applyChatGptImportBatchFast(vault, [{
  ...first,
  summary: "Updated imported version",
  updatedAt: "2026-08-13T12:02:00.000Z",
  usage: { tokenCount: 175, tokenCountKind: "estimated", estimator: "visible-text-v1" }
}], { state: "running", discovered: 1, imported: 1 });
imported = materializeResults(vault).filter(result => result.source?.sourceId === "conv_profile_metrics");
assert.equal(imported.length, 1, "re-import must keep one mutable canonical card");
assert.equal(imported[0].result.usage.tokenCount, 175, "latest usage replaces prior estimate");
assert.deepEqual(projectTokenMetrics(imported), { tokenCount: 175, countedCards: 1, estimated: true }, "re-import must not double count tokens");

assert.equal(parseMoneyToMinor("12.34", "EUR"), 1234);
assert.equal(parseMoneyToMinor("12,34", "EUR"), 1234);
assert.equal(parseMoneyToMinor("-1", "EUR"), null);
assert.equal(parseMoneyToMinor("12.34", "JPY"), null);
assert.equal(parseMoneyToMinor("12", "JPY"), 12);

const revision = appendProjectMetricsRevision(vault, {
  currency: "EUR",
  spentMinor: 1234,
  donatedMinor: 500
}, {
  profileRevisionId: "profile_metrics_1",
  updatedAt: "2026-08-13T12:03:00.000Z"
});
assert.equal(revision.baseRevisionId, null);
assert.deepEqual(currentProjectMetrics(vault), revision);
assert.equal(sanitizeProjectMetricsRevision({ ...revision, spentMinor: -1 }), null);

const revision2 = appendProjectMetricsRevision(vault, {
  currency: "EUR",
  spentMinor: 2500,
  donatedMinor: 750
}, {
  profileRevisionId: "profile_metrics_2",
  updatedAt: "2026-08-13T12:04:00.000Z"
});
assert.equal(revision2.baseRevisionId, "profile_metrics_1");
assert.equal(currentProjectMetrics(vault).spentMinor, 2500);

const roundTrip = importVaultBundle(exportVaultBundle(vault));
const roundTripCard = materializeResults(roundTrip).find(result => result.source?.sourceId === "conv_profile_metrics");
assert.equal(roundTripCard.result.usage.tokenCount, 175, "usage metadata must survive portable Vault round trip");
assert.equal(currentProjectMetrics(roundTrip).spentMinor, 2500, "profile metrics must survive portable Vault round trip");
assert.equal(currentProjectMetrics(roundTrip).donatedMinor, 750);

const objects = vaultToObjects(vault, "DashGPT");
assert.ok(objects.some(object => object.path === "DashGPT/profile/profile_metrics_1.json"));
assert.ok(objects.some(object => object.path === "DashGPT/profile/profile_metrics_2.json"));
const objectRoundTrip = vaultFromObjects(objects, "DashGPT");
assert.equal(currentProjectMetrics(objectRoundTrip).spentMinor, 2500, "profile metrics must survive object-layout round trip");
assert.equal(materializeResults(objectRoundTrip).find(result => result.source?.sourceId === "conv_profile_metrics").result.usage.tokenCount, 175);

const remote = createVault({ vaultId: vault.vaultId, createdAt: vault.createdAt });
appendProjectMetricsRevision(remote, {
  currency: "EUR",
  spentMinor: 3000,
  donatedMinor: 1000
}, {
  profileRevisionId: "profile_metrics_remote",
  updatedAt: "2026-08-13T12:05:00.000Z"
});
const mergedDirect = mergeVaults(vault, remote, { updatedAt: "2026-08-13T12:06:00.000Z" });
assert.equal(mergedDirect.profileRevisions.length, 3, "same-vault merge must preserve profile revision history");
assert.equal(currentProjectMetrics(mergedDirect).spentMinor, 3000, "latest merged profile revision must materialize");

const mergedObjects = mergeVaultObjectSets(vault, vaultToObjects(remote, "DashGPT"), "DashGPT");
assert.equal(mergedObjects.profileRevisions.length, 3, "remote object merge must preserve both profile histories");
assert.equal(currentProjectMetrics(mergedObjects).donatedMinor, 1000);

console.log("Profile project metrics token, money, re-import, Vault, object-layout and merge tests passed.");

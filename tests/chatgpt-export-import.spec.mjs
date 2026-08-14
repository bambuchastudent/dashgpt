import { expect, test } from "@playwright/test";
import { deflateRawSync } from "node:zlib";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const IMPORT_ID = "dashgpt-chatgpt-history-import";

function existingVault() {
  return {
    schemaVersion: 1,
    vaultId: "vault-export-browser",
    createdAt: "2026-08-13T10:00:00.000Z",
    updatedAt: "2026-08-13T10:00:00.000Z",
    results: [{
      id: "existing-card",
      schemaVersion: 1,
      title: "Existing card",
      summary: "Existing local content",
      category: "Test",
      tags: [],
      decisions: [],
      immutable: false,
      contentVersion: 1
    }],
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

function conversation(id, suffix = "") {
  const update = 1_720_000_000;
  return {
    id,
    title: `Export ${id}`,
    create_time: update - 100,
    update_time: update,
    current_node: `a-${id}`,
    mapping: {
      [`u-${id}`]: {
        id: `u-${id}`,
        parent: null,
        children: [`a-${id}`],
        message: { author: { role: "user" }, content: { parts: [`Please remember ${id}${suffix} for later.`] }, create_time: update - 50 }
      },
      [`a-${id}`]: {
        id: `a-${id}`,
        parent: `u-${id}`,
        children: [],
        message: { author: { role: "assistant" }, content: { parts: [`Useful exported outcome for ${id}${suffix}, preserved as a canonical DashGPT card.`] }, create_time: update }
      }
    }
  };
}

async function seed(page) {
  await page.addInitScript(({ key, vault }) => localStorage.setItem(key, JSON.stringify(vault)), { key: VAULT_KEY, vault: existingVault() });
}

function zipBuffer(name, payload) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const raw = encoder.encode(payload);
  const compressed = deflateRawSync(raw);
  const local = Buffer.alloc(30 + nameBytes.length + compressed.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  Buffer.from(nameBytes).copy(local, 30);
  compressed.copy(local, 30 + nameBytes.length);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 42);
  Buffer.from(nameBytes).copy(central, 46);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, central, end]);
}

async function openChoice(page) {
  await page.goto("/demo/?personal=1");
  await expect(page.locator(`[data-result-id="${IMPORT_ID}"]`)).toBeVisible();
  await page.locator(`[data-result-id="${IMPORT_ID}"] .open-button`).click();
  await expect(page.locator("#chatgptExportImportDialog")).toBeVisible();
}

test("history import recommends the official export while retaining live import", async ({ page }) => {
  await seed(page);
  await openChoice(page);
  await expect(page.locator("#chatgptExportChooseButton")).toBeVisible();
  await expect(page.locator("#chatgptExportLiveButton")).toBeVisible();
  await expect(page.locator(".chatgpt-export-badge")).toBeVisible();
  await page.locator("#chatgptExportLiveButton").click();
  await expect(page.locator("#chatgptImportLaunchDialog")).toBeVisible();
});

test("conversation JSON imports locally and repeated import does not duplicate a live-compatible card", async ({ page }) => {
  await seed(page);
  await openChoice(page);
  const writes = [];
  page.on("request", request => {
    if (["POST", "PUT", "PATCH"].includes(request.method())) writes.push(request.url());
  });
  const payload = Buffer.from(JSON.stringify([conversation("json-one")]), "utf8");
  const input = page.locator("#chatgptExportImportInput");
  await input.setInputFiles({ name: "conversations.json", mimeType: "application/json", buffer: payload });
  await expect(page.locator("#chatgptExportShowCards")).toBeVisible();
  let count = await page.evaluate(({ key, sourceId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.filter(item => item.source?.sourceId === sourceId).length;
  }, { key: VAULT_KEY, sourceId: "json-one" });
  expect(count).toBe(1);
  await input.setInputFiles({ name: "conversations.json", mimeType: "application/json", buffer: payload });
  await expect(page.locator("#chatgptExportImportStats")).toContainText(/duplicates|дублей/i);
  count = await page.evaluate(({ key, sourceId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.filter(item => item.source?.sourceId === sourceId).length;
  }, { key: VAULT_KEY, sourceId: "json-one" });
  expect(count).toBe(1);
  expect(writes).toEqual([]);
});

test("official export ZIP imports semantic canonical cards", async ({ page }) => {
  await seed(page);
  await openChoice(page);
  const exported = conversation("zip-one", " with GitHub Safari browser import and OpenSpec");
  exported.title = "GitHub Safari import";
  const buffer = zipBuffer("account/conversations.json", JSON.stringify([exported]));
  await page.locator("#chatgptExportImportInput").setInputFiles({ name: "chatgpt-export.zip", mimeType: "application/zip", buffer });
  await expect(page.locator("#chatgptExportShowCards")).toBeVisible();
  const saved = await page.evaluate(({ key, sourceId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(item => item.source?.sourceId === sourceId) || null;
  }, { key: VAULT_KEY, sourceId: "zip-one" });
  expect(saved?.id).toBe("chatgpt-conversation-zip-one");
  expect(saved?.summary).toContain("Useful exported outcome");
  expect(saved?.category).toBe("Software");
  expect(saved?.tags).toContain("github");
  expect(saved?.tags).not.toContain("chatgpt");
  expect(saved?.result?.semanticEnrichmentVersion).toBe(1);
});

test("malformed conversations are isolated and successful cards remain durable", async ({ page }) => {
  await seed(page);
  await openChoice(page);
  const payload = Buffer.from(JSON.stringify([conversation("good-one"), {}]), "utf8");
  await page.locator("#chatgptExportImportInput").setInputFiles({ name: "conversations.json", mimeType: "application/json", buffer: payload });
  await expect(page.locator("#chatgptExportShowCards")).toBeVisible();
  await expect(page.locator("#chatgptExportImportStats")).toContainText(/failed|ошибок/i);
  const state = await page.evaluate(({ key, sourceId, importId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return {
      card: vault.results.find(item => item.source?.sourceId === sourceId),
      progress: vault.results.find(item => item.id === importId)?.result
    };
  }, { key: VAULT_KEY, sourceId: "good-one", importId: IMPORT_ID });
  expect(state.card).toBeTruthy();
  expect(state.progress?.state).toBe("partial");
  expect(state.progress?.failed).toBe(1);
});

test("export import choice fits a 360px viewport", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await openChoice(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator("#chatgptExportChooseButton")).toBeVisible();
});

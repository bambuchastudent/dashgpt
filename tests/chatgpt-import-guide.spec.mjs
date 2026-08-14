import { expect, test } from "./playwright-fixture.mjs";
import { deflateRawSync } from "node:zlib";

const VAULT_KEY = "dashgpt.demo.vault.v1";

function existingVault() {
  return {
    schemaVersion: 1,
    vaultId: "vault-guided-import-browser",
    createdAt: "2026-08-14T08:00:00.000Z",
    updatedAt: "2026-08-14T08:00:00.000Z",
    results: [{
      id: "existing-card",
      schemaVersion: 1,
      title: "Existing card",
      summary: "A populated Vault must still expose ChatGPT migration clearly.",
      category: "Notes",
      tags: ["existing"],
      decisions: [],
      immutable: false,
      contentVersion: 1
    }],
    events: [],
    profileRevisions: [],
    dashRevisions: []
  };
}

function conversation(id, extra = "") {
  const update = 1_720_000_000;
  return {
    id,
    title: `Guided import ${id}`,
    create_time: update - 100,
    update_time: update,
    current_node: `a-${id}`,
    mapping: {
      [`u-${id}`]: {
        id: `u-${id}`,
        parent: null,
        children: [`a-${id}`],
        message: {
          author: { role: "user" },
          content: { parts: [`Please preserve ${id}${extra}.`] },
          create_time: update - 50
        }
      },
      [`a-${id}`]: {
        id: `a-${id}`,
        parent: `u-${id}`,
        children: [],
        message: {
          author: { role: "assistant" },
          content: { parts: [`Useful canonical outcome for ${id}${extra}.`] },
          create_time: update
        }
      }
    }
  };
}

async function seed(page) {
  await page.addInitScript(({ key, vault }) => {
    localStorage.setItem(key, JSON.stringify(vault));
  }, { key: VAULT_KEY, vault: existingVault() });
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

async function openGuide(page) {
  await page.goto("/demo/?personal=1");
  const button = page.locator("#chatgptImportGuideButton");
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator("#chatgptImportGuideDialog")).toBeVisible();
}

test("populated Vault has a permanent ChatGPT import entry and Storage distinguishes Vault import", async ({ page }) => {
  await seed(page);
  await page.goto("/demo/?personal=1");

  await expect(page.locator("#chatgptImportGuideButton")).toBeVisible();
  await page.locator("#storageButton").click();
  const storageSection = page.locator("#chatgptStorageImportSection");
  await expect(storageSection).toBeVisible();
  await expect(storageSection).toContainText(/Import ChatGPT history|Импортировать историю ChatGPT/);
  await expect(page.locator("#exportVaultButton")).toHaveText(/Export DashGPT Vault|Экспорт DashGPT Vault/);
  await expect(page.locator("#importVaultButton")).toHaveText(/Import DashGPT Vault|Импорт DashGPT Vault/);

  await page.locator("#chatgptStorageImportButton").click();
  const guide = page.locator("#chatgptImportGuideDialog");
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Settings");
  await expect(guide).toContainText("Data Controls");
  await expect(guide).toContainText("Export data");
  await expect(guide).toContainText(/local|локаль/i);
  await expect(guide.locator(`a[href*="help.openai.com/en/articles/7260999"]`)).toBeVisible();
});

test("permanent guide imports conversation JSON locally and repeated selection does not duplicate cards", async ({ page }) => {
  await seed(page);
  await openGuide(page);

  const writes = [];
  page.on("request", request => {
    if (["POST", "PUT", "PATCH"].includes(request.method())) writes.push(request.url());
  });

  const payload = Buffer.from(JSON.stringify([conversation("guided-json")]), "utf8");
  const input = page.locator("#chatgptGuideFileInput");
  await input.setInputFiles({ name: "conversations.json", mimeType: "application/json", buffer: payload });
  await expect(page.locator("#chatgptGuideViewCards")).toBeVisible();

  let cards = await page.evaluate(({ key, sourceId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.filter(item => item.source?.sourceId === sourceId).length;
  }, { key: VAULT_KEY, sourceId: "guided-json" });
  expect(cards).toBe(1);

  await input.setInputFiles({ name: "conversations.json", mimeType: "application/json", buffer: payload });
  await expect(page.locator("#chatgptGuideStatus")).toContainText(/duplicates|дубл/i);
  cards = await page.evaluate(({ key, sourceId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.filter(item => item.source?.sourceId === sourceId).length;
  }, { key: VAULT_KEY, sourceId: "guided-json" });
  expect(cards).toBe(1);
  expect(writes).toEqual([]);
});

test("permanent guide accepts the official ZIP, preserves semantic enrichment, and fits 360px", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await openGuide(page);

  const exported = conversation("guided-zip", " about GitHub Safari browser import and OpenSpec");
  exported.title = "GitHub Safari import";
  const buffer = zipBuffer("account/conversations.json", JSON.stringify([exported]));
  await page.locator("#chatgptGuideFileInput").setInputFiles({
    name: "chatgpt-export.zip",
    mimeType: "application/zip",
    buffer
  });
  await expect(page.locator("#chatgptGuideViewCards")).toBeVisible();

  const saved = await page.evaluate(({ key, sourceId }) => {
    const vault = JSON.parse(localStorage.getItem(key));
    return vault.results.find(item => item.source?.sourceId === sourceId) || null;
  }, { key: VAULT_KEY, sourceId: "guided-zip" });
  expect(saved?.id).toBe("chatgpt-conversation-guided-zip");
  expect(saved?.category).toBe("Software");
  expect(saved?.tags).toContain("github");
  expect(saved?.result?.semanticEnrichmentVersion).toBe(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

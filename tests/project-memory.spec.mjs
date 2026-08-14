import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";

const VAULT_KEY = "dashgpt.demo.vault.v1";
const GOOGLE_BINDING_KEY = "dashgpt.google-drive.binding.v1";
const NOW = "2026-08-14T10:00:00.000Z";

const CARD_A = {
  id: "project-memory",
  schemaVersion: 1,
  title: "Project memory",
  summary: "The site and IDE read the same saved Dash.",
  currentState: "Project view uses canonical Cards.",
  category: "Developer Tools",
  tags: ["dashgpt", "memory"],
  decisions: ["Vault is source of truth"],
  next: "Materialize .dashgpt for the repository.",
  relatedResults: [{ resultId: "google-vault", kind: "uses" }],
  immutable: false,
  contentVersion: 1,
  source: { type: "chat", provider: "chatgpt", url: "https://chatgpt.com/share/project" }
};
const CARD_B = {
  id: "google-vault",
  schemaVersion: 1,
  title: "Google Vault",
  summary: "Google Drive carries the same Vault to another device.",
  currentState: "Same vaultId is restored on device B.",
  category: "Storage",
  tags: ["google", "vault"],
  decisions: [],
  constraints: ["No second Google artifact"],
  immutable: false,
  contentVersion: 1,
  source: { url: "javascript:alert('nope')" }
};
const OTHER = {
  id: "unrelated-private-card",
  schemaVersion: 1,
  title: "Private unrelated memory",
  summary: "Must not be projected into this project.",
  category: "Private",
  tags: [],
  decisions: [],
  immutable: false,
  contentVersion: 1
};

const DASH = {
  schemaVersion: 1,
  dashId: "dash_project_memory",
  dashRevisionId: "dashrev_project_memory_1",
  baseRevisionId: null,
  title: "DashGPT developer memory",
  description: "One saved Dash represented on the site and inside the repository.",
  semanticDefinition: { query: "dashgpt developer memory", normalizedTerms: ["dashgpt", "developer", "memory"], engineVersion: 1 },
  scope: { providers: ["*"], sourceTypes: ["*"], includeArchived: false, excludedResultIds: [], excludedSourceIds: [], excludedSourceUrls: [] },
  updateMode: "review",
  automaticResultIds: [CARD_A.id, CARD_B.id],
  suggestedResultIds: [OTHER.id],
  createdAt: NOW,
  lastUpdatedAt: NOW
};

function vault() {
  return {
    schemaVersion: 1,
    vaultId: "vault_google_project",
    createdAt: NOW,
    updatedAt: NOW,
    results: [CARD_A, CARD_B, OTHER],
    events: [],
    profileRevisions: [],
    dashRevisions: [DASH]
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ vaultKey, bindingKey, initialVault }) => {
    localStorage.setItem(vaultKey, JSON.stringify(initialVault));
    localStorage.setItem(bindingKey, JSON.stringify({
      version: 1,
      provider: "google-drive",
      folderId: "secret-google-folder",
      fileId: "secret-google-file",
      vaultId: initialVault.vaultId,
      email: "private@example.com",
      token: "oauth-secret"
    }));
  }, { vaultKey: VAULT_KEY, bindingKey: GOOGLE_BINDING_KEY, initialVault: vault() });
});

test("saved Dash Project view and .dashgpt use the same canonical Cards", async ({ page }) => {
  await page.goto("/demo/dashes/dash_project_memory/");

  const switcher = page.locator(".project-memory-switcher");
  await expect(switcher).toBeVisible();
  await expect(page.getByRole("button", { name: "Project", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Project", exact: true }).click();

  await expect(page.locator(".project-memory-panel")).toBeVisible();
  await expect(page.locator(".project-memory-card")).toHaveCount(2);
  await expect(page.locator(".project-memory-card", { hasText: "Project memory" })).toContainText("Project view uses canonical Cards");
  await expect(page.locator(".project-memory-card", { hasText: "Project memory" })).toContainText("Materialize .dashgpt");
  await expect(page.locator(".project-memory-edge")).toContainText("uses");

  const siteCardIds = await page.locator(".project-memory-card").evaluateAll(nodes => nodes.map(node => node.dataset.projectCardId));
  expect(siteCardIds).toEqual([CARD_A.id, CARD_B.id]);
  await expect(page.locator(".project-memory-panel")).not.toContainText(OTHER.title);

  const beforeVault = await page.evaluate(key => localStorage.getItem(key), VAULT_KEY);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Get .dashgpt", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const bytes = await fs.readFile(downloadPath);
  const archiveText = bytes.toString("utf8");

  expect(archiveText).toContain(".dashgpt/README.md");
  expect(archiveText).toContain(".dashgpt/manifest.json");
  expect(archiveText).toContain(".dashgpt/project.md");
  expect(archiveText).toContain(CARD_A.id);
  expect(archiveText).toContain(CARD_B.id);
  expect(archiveText).not.toContain(OTHER.id);
  expect(archiveText).not.toContain("secret-google-folder");
  expect(archiveText).not.toContain("secret-google-file");
  expect(archiveText).not.toContain("private@example.com");
  expect(archiveText).not.toContain("oauth-secret");
  expect(archiveText).not.toContain("javascript:alert");

  const afterVault = await page.evaluate(key => localStorage.getItem(key), VAULT_KEY);
  expect(afterVault).toBe(beforeVault);

  await page.locator(".project-memory-card", { hasText: "Project memory" }).click();
  await expect(page.locator("#resultDialog")).toBeVisible();
  await expect(page.locator("#resultDialog h2")).toHaveText(CARD_A.title);
});

test("Project view stays inside 390px saved-Dash viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/dashes/dash_project_memory/");
  await page.getByRole("button", { name: "Project", exact: true }).click();
  await expect(page.locator(".project-memory-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get .dashgpt", exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

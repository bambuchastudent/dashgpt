import { expect, test } from "./playwright-fixture.mjs";

const GOOGLE_BINDING_KEY = "dashgpt.google-drive.binding.v1";

test("existing Google binding blocks legacy GitHub auto-sync on load", async ({ page }) => {
  let githubSyncPosts = 0;

  await page.addInitScript(({ key, binding }) => {
    localStorage.setItem(key, JSON.stringify(binding));
  }, {
    key: GOOGLE_BINDING_KEY,
    binding: {
      version: 1,
      provider: "google-drive",
      folderId: "folder-existing",
      fileId: "file-existing",
      vaultId: "vault-existing",
      modifiedTime: "2026-08-13T10:00:00.000Z",
      remoteVersion: "7"
    }
  });

  await page.route("**/api/storage/google/config", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured: true,
      clientId: "test.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/drive.file"
    })
  }));

  await page.route("**/api/storage/github/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured: true,
      paired: true,
      locator: { owner: "user", repo: "vault", ref: "main", path: ".dashgpt" }
    })
  }));

  await page.route("**/api/storage/github/sync", route => {
    githubSyncPosts += 1;
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "This route must not be called while Google Drive is bound." })
    });
  });

  await page.goto("/demo/?personal=1");
  await page.locator("#storageButton").click();

  await expect(page.locator("#githubStatus")).toContainText("Google Drive is also bound");
  await expect(page.locator("#syncGithubButton")).toBeDisabled();
  await expect(page.locator("#googleDriveStatus")).toContainText("Both remote bindings were detected");
  expect(githubSyncPosts).toBe(0);
});

import assert from "node:assert/strict";
import { createVault, putResult, setFavorite } from "../demo/vault.js";
import {
  handleGitHubPairStart,
  handleGitHubSetup,
  handleGitHubStatus,
  handleGitHubSync
} from "../src/github-storage.js";
import { resolveStorageLocator } from "../src/storage-locator.js";
import { vaultFromObjects } from "../src/vault-layout.js";

function request(url, init = {}) {
  return new Request(url, init);
}

function cookieValue(response, name) {
  const raw = response.headers.get("set-cookie") || "";
  const match = raw.match(new RegExp(`${name}=([^;,]+)`));
  return match?.[1] || null;
}

function createFakeGitHubRepo() {
  let headSha = null;
  let currentTreeSha = null;
  let counter = 0;
  const blobs = new Map();
  const trees = new Map();
  const commits = new Map();
  let initializedWithoutBranch = false;

  const client = {
    async getRepo() {
      return { full_name: "octocat/notes", default_branch: "main" };
    },
    async getRef(branch) {
      assert.equal(branch, "main");
      if (!headSha) {
        const error = new Error("404 empty repository");
        error.status = 404;
        throw error;
      }
      return { object: { sha: headSha } };
    },
    async getCommit(sha) {
      return commits.get(sha);
    },
    async getTree(sha) {
      const entries = trees.get(sha) || new Map();
      return {
        truncated: false,
        tree: [...entries.entries()].map(([path, blobSha]) => ({ path, type: "blob", sha: blobSha }))
      };
    },
    async getBlob(sha) {
      const content = blobs.get(sha);
      return { encoding: "base64", content: Buffer.from(content, "utf8").toString("base64") };
    },
    async createBlob(content) {
      const sha = `blob-${++counter}`;
      blobs.set(sha, content);
      return { sha };
    },
    async createTree(baseTree, entries) {
      const next = new Map(trees.get(baseTree) || []);
      for (const entry of entries) next.set(entry.path, entry.sha);
      const sha = `tree-${++counter}`;
      trees.set(sha, next);
      return { sha };
    },
    async createCommit(message, tree, parent) {
      assert.match(message, /^Sync DashGPT Vault/);
      assert.equal(parent, headSha);
      const sha = `commit-${++counter}`;
      commits.set(sha, { sha, tree: { sha: tree }, parents: [{ sha: parent }] });
      return { sha };
    },
    async updateRef(branch, sha) {
      assert.equal(branch, "main");
      headSha = sha;
      currentTreeSha = commits.get(sha).tree.sha;
      return { object: { sha } };
    },
    async initializeFile(path, content, branch) {
      assert.equal(headSha, null, "initializeFile is only for an empty repository");
      assert.equal(branch, null, "empty repositories must initialize the default branch without an explicit branch parameter");
      initializedWithoutBranch = true;
      const blobSha = `blob-${++counter}`;
      blobs.set(blobSha, content);
      const treeSha = `tree-${++counter}`;
      trees.set(treeSha, new Map([[path, blobSha]]));
      const commitSha = `commit-${++counter}`;
      commits.set(commitSha, { sha: commitSha, tree: { sha: treeSha }, parents: [] });
      headSha = commitSha;
      currentTreeSha = treeSha;
      return { commit: { sha: commitSha } };
    }
  };

  return {
    client,
    initializedWithoutBranch() {
      return initializedWithoutBranch;
    },
    objectSnapshot() {
      const tree = trees.get(currentTreeSha) || new Map();
      return [...tree.entries()].map(([path, sha]) => ({ path, content: blobs.get(sha) }));
    }
  };
}

const repoLocator = resolveStorageLocator("https://github.com/octocat/notes");
assert.equal(repoLocator.owner, "octocat");
assert.equal(repoLocator.repo, "notes");
assert.equal(repoLocator.path, ".dashgpt");
assert.equal(repoLocator.ref, null);

const folderLocator = resolveStorageLocator("https://github.com/octocat/notes/tree/main/private/dashgpt");
assert.equal(folderLocator.ref, "main");
assert.equal(folderLocator.path, "private/dashgpt");
assert.throws(() => resolveStorageLocator("https://github.com/octocat/notes/blob/main/vault.json"), /folder URL/);
assert.throws(() => resolveStorageLocator("https://gitlab.com/octocat/notes"), /github\.com/);

const fake = createFakeGitHubRepo();
const env = {
  GITHUB_APP_ID: "123",
  GITHUB_APP_PRIVATE_KEY: "test-key-not-used-by-fixture",
  GITHUB_APP_SLUG: "dashgpt-storage-test",
  GITHUB_SESSION_SECRET: "a-test-session-secret-that-is-long-enough-for-hmac",
  DASHGPT_GITHUB_CLIENT_FACTORY({ installationId, locator }) {
    assert.equal(installationId, 9001);
    assert.equal(locator.owner, "octocat");
    assert.equal(locator.repo, "notes");
    return fake.client;
  }
};

const pair = await handleGitHubPairStart(
  request("https://dashgpt.example/api/storage/github/pair", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://github.com/octocat/notes" })
  }),
  env
);
assert.equal(pair.status, 200);
const pairBody = await pair.json();
assert.equal(pairBody.installUrl, "https://github.com/apps/dashgpt-storage-test/installations/new");
const pendingCookie = cookieValue(pair, "dashgpt_gh_pending");
assert.ok(pendingCookie);

const setup = await handleGitHubSetup(
  request("https://dashgpt.example/api/storage/github/setup?installation_id=9001", {
    headers: { cookie: `dashgpt_gh_pending=${pendingCookie}` }
  }),
  env
);
assert.equal(setup.status, 302);
assert.match(setup.headers.get("location"), /storage=github-paired/);
const sessionCookie = cookieValue(setup, "dashgpt_gh_session");
assert.ok(sessionCookie);

const status = await handleGitHubStatus(
  request("https://dashgpt.example/api/storage/github/status", {
    headers: { cookie: `dashgpt_gh_session=${sessionCookie}` }
  }),
  env
);
const statusBody = await status.json();
assert.equal(statusBody.paired, true);
assert.equal(statusBody.locator.ref, "main");
assert.equal(statusBody.locator.path, ".dashgpt");

const vault = createVault({ vaultId: "vault-github-test", createdAt: "2026-08-10T01:00:00.000Z" });
putResult(vault, {
  id: "github-sync-result",
  schemaVersion: 1,
  title: "GitHub sync",
  summary: "Stored as provider-neutral Vault objects.",
  category: "DashGPT",
  tags: ["github", "sync"],
  decisions: ["Use one atomic commit."],
  immutable: true,
  contentVersion: 1,
  contentHash: `sha256:${"a".repeat(64)}`
}, { updatedAt: "2026-08-10T01:00:01.000Z" });
setFavorite(vault, "github-sync-result", true, {
  eventId: "evt-github-favorite",
  createdAt: "2026-08-10T01:00:02.000Z"
});

const syncRequest = () => request("https://dashgpt.example/api/storage/github/sync", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie: `dashgpt_gh_session=${sessionCookie}`
  },
  body: JSON.stringify({ vault })
});

const firstSync = await handleGitHubSync(syncRequest(), env);
assert.equal(firstSync.status, 200, await firstSync.clone().text());
const firstSyncBody = await firstSync.json();
assert.equal(fake.initializedWithoutBranch(), true, "first sync must initialize an empty repository safely");
assert.equal(firstSyncBody.sync.changedObjects, 2, "manifest initialization is followed by one atomic commit for remaining objects");
assert.match(firstSyncBody.sync.commitSha, /^commit-/);

const snapshot = fake.objectSnapshot();
assert.ok(snapshot.some((object) => object.path === ".dashgpt/dashgpt-vault.json"));
assert.ok(snapshot.some((object) => object.path.includes(".dashgpt/results/github-sync-result/1-")));
assert.ok(snapshot.some((object) => object.path === ".dashgpt/events/2026-08/evt-github-favorite.json"));
const remoteVault = vaultFromObjects(snapshot, ".dashgpt");
assert.equal(remoteVault.vaultId, "vault-github-test");
assert.equal(remoteVault.results.length, 1);
assert.equal(remoteVault.events.length, 1);

const secondSync = await handleGitHubSync(syncRequest(), env);
assert.equal(secondSync.status, 200, await secondSync.clone().text());
const secondSyncBody = await secondSync.json();
assert.equal(secondSyncBody.sync.changedObjects, 0, "idempotent sync must not create another Git commit");

console.log("GitHub StorageLocator, empty-repository pairing, Vault layout and idempotent sync tests passed.");

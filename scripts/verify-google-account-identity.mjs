import assert from "node:assert/strict";
import { formatGoogleAccountIdentity, loadGoogleDriveAccountIdentity, sanitizeGoogleAccountIdentity } from "../demo/google-account-identity.js";
import { loadGoogleDriveBinding, saveGoogleDriveBinding } from "../demo/google-drive-storage.js";

const requests = [];
const identity = await loadGoogleDriveAccountIdentity({
  token: "TEST_ACCESS_TOKEN",
  fetchFn: async (input, init = {}) => {
    requests.push({ input: String(input), init });
    return new Response(JSON.stringify({
      user: {
        displayName: "  Dmitrii Kashirin  ",
        emailAddress: " bambuchastudent@gmail.com ",
        photoLink: " https://example.test/photo.jpg ",
        permissionId: "must-not-be-surfaced",
        me: true
      }
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
});

assert.equal(requests.length, 1);
const url = new URL(requests[0].input);
assert.equal(url.origin, "https://www.googleapis.com");
assert.equal(url.pathname, "/drive/v3/about");
assert.equal(url.searchParams.get("fields"), "user(displayName,emailAddress,photoLink,me)");
assert.equal(requests[0].init.headers.authorization, "Bearer TEST_ACCESS_TOKEN");
assert.equal(identity.displayName, "Dmitrii Kashirin");
assert.equal(identity.emailAddress, "bambuchastudent@gmail.com");
assert.equal(identity.photoLink, "https://example.test/photo.jpg");
assert.equal(identity.me, true);
assert.equal("permissionId" in identity, false);
assert.equal(formatGoogleAccountIdentity(identity), "Dmitrii Kashirin · bambuchastudent@gmail.com");

assert.equal(sanitizeGoogleAccountIdentity({ displayName: "", emailAddress: "" }), null);
assert.equal(formatGoogleAccountIdentity({ displayName: "Only Name" }), "Only Name");

const values = new Map();
const storage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
const saved = saveGoogleDriveBinding(storage, {
  version: 1,
  provider: "google-drive",
  folderId: "folder",
  fileId: "file",
  vaultId: "vault",
  modifiedTime: "2026-08-14T10:00:00Z",
  remoteVersion: "2",
  emailAddress: "must-not-persist@example.com",
  displayName: "Must Not Persist",
  photoLink: "https://example.test/nope.jpg",
  accessToken: "MUST_NOT_PERSIST"
});
assert.deepEqual(saved, loadGoogleDriveBinding(storage));
const durable = JSON.stringify(saved);
assert.equal(durable.includes("must-not-persist"), false);
assert.equal(durable.includes("Must Not Persist"), false);
assert.equal(durable.includes("MUST_NOT_PERSIST"), false);
assert.deepEqual(Object.keys(saved).sort(), ["fileId", "folderId", "modifiedTime", "provider", "remoteVersion", "vaultId", "version"].sort());

console.log("F35 Google account identity verification passed.");

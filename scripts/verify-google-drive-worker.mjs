import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { GOOGLE_DRIVE_SCOPE } from "../demo/google-drive-storage.js";

const request = (method = "GET") => new Request("https://dashgpt.example/api/storage/google/config", { method });

{
  const response = await worker.fetch(request(), {}, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    configured: false,
    clientId: null,
    scope: GOOGLE_DRIVE_SCOPE
  });
}

{
  const response = await worker.fetch(request(), {
    GOOGLE_CLIENT_ID: "worker-test.apps.googleusercontent.com"
  }, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    configured: true,
    clientId: "worker-test.apps.googleusercontent.com",
    scope: GOOGLE_DRIVE_SCOPE
  });
}

{
  const response = await worker.fetch(request("POST"), {
    GOOGLE_CLIENT_ID: "worker-test.apps.googleusercontent.com"
  }, {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
}

console.log("Google Drive Worker config route tests passed.");

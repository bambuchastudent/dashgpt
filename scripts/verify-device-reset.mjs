import assert from "node:assert/strict";
import {
  clearDashGptStorage,
  ensureGithubDisconnected,
  installDashGptStorageWriteBarrier,
  performDeviceReset
} from "../demo/device-reset.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}

function jsonResponse(payload, { ok = true, status = ok ? 200 : 500 } = {}) {
  return { ok, status, async json() { return payload; } };
}

{
  const storage = new MemoryStorage({
    "dashgpt.demo.vault.v1": "vault",
    "dashgpt.demo.gallery-state.v1": "gallery",
    "other.app": "keep"
  });
  assert.deepEqual(clearDashGptStorage(storage).sort(), ["dashgpt.demo.gallery-state.v1", "dashgpt.demo.vault.v1"]);
  assert.equal(storage.getItem("dashgpt.demo.vault.v1"), null);
  assert.equal(storage.getItem("other.app"), "keep");
}

{
  const first = new MemoryStorage();
  const second = new MemoryStorage();
  const restore = installDashGptStorageWriteBarrier({ StorageCtor: MemoryStorage });
  first.setItem("dashgpt.demo.vault.v1", "blocked");
  second.setItem("dashgpt.google-drive.binding.v1", "blocked");
  first.setItem("other.app", "allowed");
  assert.equal(first.getItem("dashgpt.demo.vault.v1"), null);
  assert.equal(second.getItem("dashgpt.google-drive.binding.v1"), null);
  assert.equal(first.getItem("other.app"), "allowed");
  restore();
  first.setItem("dashgpt.demo.vault.v1", "restored");
  assert.equal(first.getItem("dashgpt.demo.vault.v1"), "restored");
}

{
  const calls = [];
  const result = await ensureGithubDisconnected(async (url, init = {}) => {
    calls.push([url, init.method || "GET"]);
    if (url.endsWith("/status")) return jsonResponse({ configured: true, paired: true });
    if (url.endsWith("/disconnect")) return jsonResponse({ ok: true });
    throw new Error("unexpected request");
  });
  assert.deepEqual(result, { paired: true, disconnected: true });
  assert.deepEqual(calls, [
    ["/api/storage/github/status", "GET"],
    ["/api/storage/github/disconnect", "POST"]
  ]);
}

{
  const local = new MemoryStorage({ "dashgpt.demo.vault.v1": "keep-on-failure", "other.app": "keep" });
  const session = new MemoryStorage({ "dashgpt.chatgpt-import.receiver.v1": "keep-on-failure" });
  await assert.rejects(
    performDeviceReset({
      localStorage: local,
      sessionStorage: session,
      fetchFn: async url => url.endsWith("/status")
        ? jsonResponse({ configured: true, paired: true })
        : jsonResponse({ error: "blocked" }, { ok: false, status: 503 }),
      installWriteBarrier: () => { throw new Error("barrier must not install before disconnect"); },
      dispatchReset: () => { throw new Error("reset lifecycle must not start"); },
      navigate: () => { throw new Error("must not navigate"); }
    }),
    error => error?.code === "github_reset_disconnect_failed"
  );
  assert.equal(local.getItem("dashgpt.demo.vault.v1"), "keep-on-failure");
  assert.equal(local.getItem("other.app"), "keep");
  assert.equal(session.getItem("dashgpt.chatgpt-import.receiver.v1"), "keep-on-failure");
}

{
  const order = [];
  const local = new MemoryStorage({
    "dashgpt.demo.vault.v1": "old-vault",
    "dashgpt.google-drive.binding.v1": "binding",
    "other.app": "keep"
  });
  const session = new MemoryStorage({
    "dashgpt.chatgpt-import.receiver.v1": "receiver",
    "other.session": "keep-session"
  });
  let barrierActive = false;
  const result = await performDeviceReset({
    localStorage: local,
    sessionStorage: session,
    fetchFn: async (url, init = {}) => {
      order.push(`${init.method || "GET"} ${url}`);
      return url.endsWith("/status")
        ? jsonResponse({ configured: true, paired: true })
        : jsonResponse({ ok: true });
    },
    installWriteBarrier: () => {
      order.push("barrier");
      barrierActive = true;
      return () => { barrierActive = false; order.push("restore"); };
    },
    dispatchReset: () => order.push("event"),
    navigate: path => {
      assert.equal(barrierActive, true);
      order.push(`navigate ${path}`);
    }
  });
  assert.deepEqual(order, [
    "GET /api/storage/github/status",
    "POST /api/storage/github/disconnect",
    "barrier",
    "event",
    "navigate /demo/"
  ]);
  assert.equal(local.getItem("dashgpt.demo.vault.v1"), null);
  assert.equal(local.getItem("dashgpt.google-drive.binding.v1"), null);
  assert.equal(session.getItem("dashgpt.chatgpt-import.receiver.v1"), null);
  assert.equal(local.getItem("other.app"), "keep");
  assert.equal(session.getItem("other.session"), "keep-session");
  assert.equal(result.removedLocal.length, 2);
  assert.equal(result.removedSession.length, 1);
}

{
  const local = new MemoryStorage({ "dashgpt.demo.vault.v1": "old-vault" });
  let restored = false;
  await assert.rejects(performDeviceReset({
    localStorage: local,
    sessionStorage: new MemoryStorage(),
    fetchFn: async () => jsonResponse({ configured: false, paired: false }),
    installWriteBarrier: () => () => { restored = true; },
    dispatchReset: () => {},
    navigate: () => { throw new Error("navigation failed"); }
  }), /navigation failed/);
  assert.equal(restored, true);
}

console.log("verify-device-reset: ok");

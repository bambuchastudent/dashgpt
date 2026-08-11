export const CHATGPT_HISTORY_SOURCE_VERSION = 2;

const SOURCE_CONFIG = Object.freeze({
  chatGptOrigin: "https://chatgpt.com",
  protocol: "dashgpt-chatgpt-history-import",
  protocolVersion: 1,
  pageSize: 100,
  batchSize: 32,
  maxBatchBytes: 200_000,
  initialConcurrency: 2,
  maxConcurrency: 3,
  successStreakToIncrease: 50,
  maxDiagnosticEvents: 80
});

function sourceRuntime(config) {
  "use strict";

  const {
    sourceVersion,
    receiverOrigin,
    receiverPath,
    sessionId,
    nonce,
    chatGptOrigin,
    protocol,
    protocolVersion,
    pageSize,
    batchSize,
    maxBatchBytes,
    initialConcurrency,
    maxConcurrency,
    successStreakToIncrease,
    maxDiagnosticEvents
  } = config;
  const retryableStatuses = new Set([429, 500, 502, 503, 504]);
  const overlayId = "dashgpt-progressive-import-source";

  if (location.origin !== chatGptOrigin) {
    throw new Error(`DashGPT import runner must run on ${chatGptOrigin}/`);
  }

  document.getElementById(overlayId)?.remove();

  let cancelled = false;
  let receiverWindow = null;
  let knownFreshness = new Map();
  let sequence = 0;
  let discoveredTotal = 0;
  let processedCurrent = 0;
  let importedThisRun = 0;
  let skippedCurrent = 0;
  let unresolved = 0;
  const abortController = new AbortController();
  const diagnostics = [];

  const scheduler = {
    limit: initialConcurrency,
    active: 0,
    cooldownUntil: 0,
    successStreak: 0,
    waiters: [],
    wake() {
      const waiting = this.waiters.splice(0);
      for (const resolve of waiting) resolve();
    },
    async signal(ms = 120) {
      await Promise.race([
        new Promise(resolve => this.waiters.push(resolve)),
        sleep(ms)
      ]);
    },
    async acquire() {
      while (!cancelled) {
        const cooldown = this.cooldownUntil - Date.now();
        if (cooldown > 0) {
          await sleep(Math.min(cooldown, 1000));
          continue;
        }
        if (this.active < this.limit) {
          this.active += 1;
          return;
        }
        await this.signal();
      }
      throw abortError();
    },
    release() {
      this.active = Math.max(0, this.active - 1);
      this.wake();
    },
    throttled(delayMs) {
      this.limit = 1;
      this.successStreak = 0;
      this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delayMs);
      this.wake();
    },
    succeeded() {
      this.successStreak += 1;
      if (this.successStreak >= successStreakToIncrease && this.limit < maxConcurrency) {
        this.limit += 1;
        this.successStreak = 0;
        this.wake();
      }
    }
  };

  function abortError() {
    return new DOMException("Cancelled", "AbortError");
  }

  function sleep(ms) {
    return new Promise((resolve, reject) => {
      if (cancelled || abortController.signal.aborted) {
        reject(abortError());
        return;
      }
      const timer = setTimeout(() => {
        abortController.signal.removeEventListener("abort", onAbort);
        resolve();
      }, Math.max(0, ms));
      function onAbort() {
        clearTimeout(timer);
        reject(abortError());
      }
      abortController.signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  function log(event, fields = {}) {
    diagnostics.push({ at: new Date().toISOString(), event, ...fields });
    if (diagnostics.length > maxDiagnosticEvents) diagnostics.shift();
  }

  function asIso(value) {
    if (value == null || value === "") return null;
    const date = typeof value === "number"
      ? new Date(value > 10_000_000_000 ? value : value * 1000)
      : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  function retryDelay(headers, attempt) {
    const raw = headers?.get?.("retry-after");
    if (raw) {
      const seconds = Number(raw);
      if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60_000, seconds * 1000);
      const at = Date.parse(raw);
      if (Number.isFinite(at)) return Math.min(60_000, Math.max(0, at - Date.now()));
    }
    const base = Math.min(30_000, 900 * (2 ** Math.min(attempt, 5)));
    return Math.round(base * (0.8 + Math.random() * 0.4));
  }

  function sameOriginUrl(path) {
    const url = new URL(path, location.origin);
    if (url.origin !== chatGptOrigin) throw new Error("Blocked non-ChatGPT request");
    return url;
  }

  async function fetchSameOrigin(path, init = {}, allowRedirectFollow = false) {
    const requested = sameOriginUrl(path);
    const response = await fetch(requested.href, {
      ...init,
      credentials: "same-origin",
      referrerPolicy: "same-origin",
      redirect: allowRedirectFollow ? "follow" : "error",
      signal: abortController.signal
    });
    const finalUrl = new URL(response.url || requested.href, location.origin);
    if (finalUrl.origin !== chatGptOrigin) throw new Error("Blocked cross-origin redirect");
    return response;
  }

  async function parseJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function requestJson(path, auth, { retries = 5, detail = false } = {}) {
    let attempt = 0;
    while (!cancelled) {
      if (detail) await scheduler.acquire();
      let response;
      try {
        response = await fetchSameOrigin(path, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Oai-Language": navigator.language || "en-US",
            ...auth.headers
          }
        }, !auth.sensitive && path.startsWith("/backend-api/conversations?"));
      } catch (error) {
        if (detail) scheduler.release();
        if (error?.name === "AbortError") throw error;
        if (attempt >= retries) throw error;
        const delay = retryDelay(null, attempt);
        attempt += 1;
        if (detail) scheduler.throttled(delay);
        await sleep(delay);
        continue;
      }

      if (detail) scheduler.release();
      if (response.ok) {
        if (detail) scheduler.succeeded();
        return parseJson(response);
      }

      const status = response.status;
      log("request-http", { status, detail, attempt: attempt + 1 });
      if (!retryableStatuses.has(status)) throw new Error(`HTTP ${status}`);

      const delay = retryDelay(response.headers, attempt);
      if (status === 429 || status === 503) {
        scheduler.throttled(delay);
        setSourceState("waiting", `ChatGPT ограничил скорость. Общая пауза ${Math.ceil(delay / 1000)} сек…`);
      }
      const maxAttempts = status === 429 || status === 503 ? 12 : retries;
      if (attempt >= maxAttempts) throw new Error(`HTTP ${status}`);
      attempt += 1;
      await sleep(delay);
    }
    throw abortError();
  }

  function extractItems(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.conversations)) return payload.conversations;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return null;
  }

  function extractTotal(payload) {
    const total = Number(payload?.total ?? payload?.total_count ?? payload?.pagination?.total);
    return Number.isFinite(total) && total >= 0 ? total : null;
  }

  function accountIdFromSession(session) {
    const value = session?.activeAccountId
      ?? session?.active_account_id
      ?? session?.activeAccount?.id
      ?? session?.account?.id;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  async function readSession() {
    try {
      const response = await fetchSameOrigin("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" }
      }, true);
      return response.ok ? parseJson(response) : {};
    } catch {
      return {};
    }
  }

  async function probeAuth(auth) {
    try {
      const payload = await requestJson("/backend-api/conversations?offset=0&limit=1&order=updated", auth, { retries: 0 });
      const items = extractItems(payload);
      return items ? { ok: true, items, total: extractTotal(payload) } : { ok: false, items: [], total: null };
    } catch {
      return { ok: false, items: [], total: null };
    }
  }

  async function selectAuth() {
    setSourceState("running", "Проверяю доступ к истории…");
    const cookie = { name: "cookie", headers: {}, sensitive: false };
    const cookieProbe = await probeAuth(cookie);
    if (cookieProbe.ok && (cookieProbe.items.length > 0 || (cookieProbe.total ?? 0) > 0)) return cookie;

    const session = await readSession();
    const accessToken = typeof session?.accessToken === "string" ? session.accessToken : "";
    const accountId = accountIdFromSession(session);
    const candidates = [];
    if (accessToken && accountId) {
      candidates.push({
        name: "session-token-account",
        headers: { Authorization: `Bearer ${accessToken}`, "ChatGPT-Account-ID": accountId },
        sensitive: true
      });
    }
    if (accessToken) {
      candidates.push({
        name: "session-token",
        headers: { Authorization: `Bearer ${accessToken}` },
        sensitive: true
      });
    }

    let emptyCandidate = null;
    for (const candidate of candidates) {
      const probe = await probeAuth(candidate);
      if (!probe.ok) continue;
      emptyCandidate ||= candidate;
      if (probe.items.length > 0 || (probe.total ?? 0) > 0) return candidate;
    }
    if (emptyCandidate) return emptyCandidate;
    if (cookieProbe.ok) return cookie;
    throw new Error("ChatGPT did not expose history to the current authenticated web session");
  }

  async function listConversations(auth, archived = false) {
    const output = [];
    const seen = new Set();
    let offset = 0;
    let expected = null;
    let repeated = 0;

    while (!cancelled) {
      const query = new URLSearchParams({ offset: String(offset), limit: String(pageSize), order: "updated" });
      if (archived) query.set("is_archived", "true");
      const payload = await requestJson(`/backend-api/conversations?${query}`, auth);
      const items = extractItems(payload);
      if (!items) throw new Error("ChatGPT changed the conversation-list response shape");
      expected = extractTotal(payload) ?? expected;
      let added = 0;
      for (const item of items) {
        const id = typeof item?.id === "string" ? item.id : "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        output.push(item);
        added += 1;
      }
      setSourceState("running", `${archived ? "Архив" : "История"}: ${output.length}${expected != null ? `/${expected}` : ""}`);
      if (!items.length || (expected != null && output.length >= expected)) break;
      offset += items.length;
      repeated = added === 0 ? repeated + 1 : 0;
      if (repeated >= 2) throw new Error("ChatGPT repeated the same conversation-list page");
      await sleep(40);
    }
    return output;
  }

  function textFromPart(part) {
    if (typeof part === "string") return part;
    if (!part || typeof part !== "object") return "";
    if (typeof part.text === "string") return part.text;
    if (typeof part.content === "string") return part.content;
    if (Array.isArray(part.content)) return part.content.map(textFromPart).filter(Boolean).join("\n");
    if (Array.isArray(part.parts)) return part.parts.map(textFromPart).filter(Boolean).join("\n");
    return "";
  }

  function messageText(message) {
    const content = message?.content;
    if (typeof content === "string") return content.trim();
    if (!content || typeof content !== "object") return "";
    const values = [];
    if (Array.isArray(content.parts)) values.push(...content.parts.map(textFromPart));
    if (typeof content.text === "string") values.push(content.text);
    if (typeof content.content === "string") values.push(content.content);
    if (Array.isArray(content.content)) values.push(...content.content.map(textFromPart));
    return values.map(value => String(value || "").trim()).filter(Boolean).join("\n\n");
  }

  function fallbackLeaf(mapping) {
    let bestId = null;
    let bestTime = -1;
    for (const [id, node] of Object.entries(mapping || {})) {
      if (!node?.message || (Array.isArray(node.children) && node.children.length)) continue;
      const time = Date.parse(asIso(node.message.create_time) || "") || 0;
      if (bestId == null || time > bestTime) {
        bestId = id;
        bestTime = time;
      }
    }
    return bestId;
  }

  function selectedMessages(payload) {
    const conversation = payload?.conversation && typeof payload.conversation === "object" ? payload.conversation : payload;
    const mapping = conversation?.mapping && typeof conversation.mapping === "object" ? conversation.mapping : {};
    let id = conversation?.current_node;
    if (!id || !mapping[id]) id = fallbackLeaf(mapping);
    const nodes = [];
    const seen = new Set();
    while (id && mapping[id] && !seen.has(id)) {
      seen.add(id);
      nodes.push(mapping[id]);
      id = mapping[id]?.parent;
    }
    nodes.reverse();

    const messages = [];
    for (const node of nodes) {
      const message = node?.message;
      const role = message?.author?.role;
      const hidden = Boolean(message?.metadata?.is_visually_hidden_from_conversation || message?.metadata?.is_hidden);
      const text = messageText(message).replace(/\s+/g, " ").trim();
      if (hidden || message?.status === "in_progress" || !text || !["user", "assistant"].includes(role)) continue;
      messages.push({ role, text });
    }
    return messages;
  }

  function clip(text, max) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  }

  function titleTags(title) {
    const words = String(title || "").toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 4);
    return ["chatgpt", ...words.slice(0, 3)].slice(0, 4);
  }

  function projectConversation(payload, summary) {
    const conversation = payload?.conversation && typeof payload.conversation === "object" ? payload.conversation : payload;
    const sourceId = String(conversation?.id || summary?.id || "").trim();
    if (!sourceId) throw new Error("Conversation has no id");
    const messages = selectedMessages(conversation);
    const assistants = messages.filter(item => item.role === "assistant" && item.text.length >= 20);
    const users = messages.filter(item => item.role === "user" && item.text.length >= 12);
    const assistant = assistants[assistants.length - 1]?.text || "";
    const user = users[users.length - 1]?.text || "";
    const title = clip(conversation?.title || summary?.title || "Untitled ChatGPT conversation", 140);
    return {
      sourceId,
      title,
      summary: clip(assistant || user || title, 520),
      currentState: clip(user, 180),
      tags: titleTags(title),
      facts: [`${messages.length} visible messages`],
      updatedAt: asIso(conversation?.update_time ?? summary?.update_time) || new Date().toISOString()
    };
  }

  function receiverUrl() {
    const url = new URL(receiverPath, receiverOrigin);
    url.searchParams.set("chatgptImportReceiver", "1");
    url.searchParams.set("session", sessionId);
    url.searchParams.set("nonce", nonce);
    return url.href;
  }

  function postToReceiver(payload) {
    if (!receiverWindow || receiverWindow.closed) return false;
    receiverWindow.postMessage({
      protocol,
      version: protocolVersion,
      sessionId,
      nonce,
      ...payload
    }, receiverOrigin);
    return true;
  }

  function validReceiverMessage(event) {
    const data = event.data;
    return event.origin === receiverOrigin
      && event.source === receiverWindow
      && data
      && data.protocol === protocol
      && data.version === protocolVersion
      && data.sessionId === sessionId
      && data.nonce === nonce;
  }

  function waitForReply(types, predicate = () => true, timeoutMs = 8000) {
    const acceptedTypes = new Set(Array.isArray(types) ? types : [types]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("DashGPT receiver did not answer"));
      }, timeoutMs);
      function onMessage(event) {
        if (!validReceiverMessage(event)) return;
        const data = event.data;
        if (!acceptedTypes.has(data.type) || !predicate(data)) return;
        clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve(data);
      }
      window.addEventListener("message", onMessage);
    });
  }

  async function handshake() {
    postToReceiver({ type: "HELLO", sourceVersion });
    const ready = await waitForReply("READY", () => true, 5000);
    knownFreshness = new Map(Array.isArray(ready.known) ? ready.known : []);
    log("receiver-ready", { known: knownFreshness.size });
  }

  async function sendBatch(cards) {
    if (!cards.length) return;
    const bytes = new Blob([JSON.stringify(cards)]).size;
    if (bytes > maxBatchBytes && cards.length > 1) {
      const middle = Math.ceil(cards.length / 2);
      await sendBatch(cards.slice(0, middle));
      await sendBatch(cards.slice(middle));
      return;
    }
    sequence += 1;
    const currentSequence = sequence;
    const message = {
      type: "BATCH",
      sequence: currentSequence,
      cards,
      progress: {
        discovered: discoveredTotal,
        processed: processedCurrent,
        importedThisRun,
        skipped: skippedCurrent,
        unresolved
      }
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!postToReceiver(message)) throw new Error("DashGPT receiver window is unavailable");
      try {
        const reply = await waitForReply(["ACK", "NACK"], data => data.sequence === currentSequence, 12_000);
        if (reply.type === "NACK") throw new Error(`DashGPT did not save the batch (${reply.reason || "unknown"})`);
        importedThisRun += Number(reply.accepted || 0) + Number(reply.updated || 0);
        return;
      } catch (error) {
        if (/did not save the batch/.test(String(error?.message || ""))) throw error;
        if (attempt === 4) throw error;
        await sleep(700 * (attempt + 1));
      }
    }
  }

  function isCurrent(summary) {
    const sourceId = String(summary?.id || "");
    if (!sourceId || !knownFreshness.has(sourceId)) return false;
    const remote = Date.parse(asIso(summary?.update_time) || "") || 0;
    const local = Date.parse(knownFreshness.get(sourceId) || "") || 0;
    return local >= remote && local > 0;
  }

  async function runImport() {
    setSourceState("running", "Подключено к DashGPT. Получаю историю…");
    const auth = await selectAuth();
    const active = await listConversations(auth, false);
    let archived = [];
    try {
      archived = await listConversations(auth, true);
    } catch {
      log("archived-unavailable");
    }

    const byId = new Map();
    for (const item of [...active, ...archived]) {
      if (item?.id && !byId.has(item.id)) byId.set(item.id, item);
    }
    const all = [...byId.values()];
    discoveredTotal = all.length;
    postToReceiver({ type: "DISCOVERED", total: discoveredTotal, archived: archived.length });

    const pending = [];
    for (const item of all) {
      if (isCurrent(item)) skippedCurrent += 1;
      else pending.push(item);
    }
    processedCurrent = skippedCurrent;
    setSourceState("running", `Найдено ${discoveredTotal}. Уже актуальны: ${skippedCurrent}. Осталось: ${pending.length}`);

    let next = 0;
    const completed = [];
    let flushChain = Promise.resolve();

    async function flush(force = false) {
      if (!force && completed.length < batchSize) return;
      const cards = completed.splice(0, batchSize);
      if (!cards.length) return;
      flushChain = flushChain.then(() => sendBatch(cards));
      await flushChain;
    }

    async function worker() {
      while (!cancelled) {
        const index = next;
        next += 1;
        if (index >= pending.length) return;
        const item = pending[index];
        try {
          const raw = await requestJson(`/backend-api/conversation/${encodeURIComponent(item.id)}`, auth, { retries: 5, detail: true });
          completed.push(projectConversation(raw, item));
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          unresolved += 1;
          log("conversation-unresolved", { reason: String(error?.message || "detail-failed").slice(0, 80) });
        } finally {
          processedCurrent += 1;
          setSourceState("running", `${processedCurrent}/${discoveredTotal} обработано · ${unresolved} ждут повтора`);
        }
        await flush(false);
      }
    }

    await Promise.all(Array.from({ length: maxConcurrency }, () => worker()));
    await flush(true);
    await flushChain;
    if (cancelled) throw abortError();

    postToReceiver({ type: "COMPLETE", total: discoveredTotal, skipped: skippedCurrent, unresolved });
    try {
      await waitForReply("COMPLETE_ACK", () => true, 8000);
    } catch {
      // Completion can be reconstructed on the next run from durable cards.
    }
    setSourceState(unresolved ? "partial" : "complete", unresolved
      ? `Импорт почти завершён. ${unresolved} разговоров будут повторены при следующем запуске.`
      : "Готово: история импортирована в DashGPT.");
  }

  const overlay = document.createElement("section");
  overlay.id = overlayId;
  Object.assign(overlay.style, {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    zIndex: "2147483647",
    width: "min(440px, calc(100vw - 36px))",
    padding: "18px",
    borderRadius: "16px",
    background: "#111827",
    color: "#f8fafc",
    boxShadow: "0 18px 60px rgba(0,0,0,.4)",
    fontFamily: "system-ui,sans-serif"
  });
  const heading = document.createElement("strong");
  heading.textContent = "DashGPT · импорт истории";
  const state = document.createElement("p");
  state.style.cssText = "margin:10px 0;color:#cbd5e1;font-size:13px;line-height:1.4";
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
  const connect = document.createElement("button");
  connect.type = "button";
  connect.textContent = "Подключить DashGPT";
  connect.style.cssText = "padding:9px 12px;border:0;border-radius:9px;cursor:pointer";
  const stop = document.createElement("button");
  stop.type = "button";
  stop.textContent = "Пауза";
  stop.style.cssText = "padding:9px 12px;border:1px solid #475569;border-radius:9px;background:#1f2937;color:#fff;cursor:pointer";
  actions.append(connect, stop);
  overlay.append(heading, state, actions);
  document.body.append(overlay);

  function setSourceState(kind, text) {
    state.dataset.state = kind;
    state.textContent = text;
  }

  function pauseImport(reason = "manual") {
    if (cancelled) return;
    cancelled = true;
    abortController.abort();
    scheduler.wake();
    postToReceiver({ type: "PAUSED", discovered: discoveredTotal, processed: processedCurrent, unresolved, reason });
    setSourceState("paused", "Остановлено. Уже сохранённые карточки останутся в DashGPT; продолжить можно позже.");
    stop.disabled = true;
  }

  stop.addEventListener("click", () => pauseImport("source-button"));

  window.addEventListener("message", event => {
    if (!validReceiverMessage(event)) return;
    if (event.data.type === "CONTROL_PAUSE") pauseImport("dashgpt-card");
  });

  async function connectAndRun(targetWindow) {
    receiverWindow = targetWindow;
    setSourceState("connecting", "Подключаю локальный Vault DashGPT…");
    try {
      await handshake();
      connect.hidden = true;
      await runImport();
    } catch (error) {
      if (error?.name === "AbortError") return;
      log("fatal", { reason: String(error?.message || error).slice(0, 120) });
      setSourceState("error", `Не удалось продолжить: ${String(error?.message || error).slice(0, 180)}`);
      connect.hidden = false;
      connect.textContent = "Подключить снова";
    }
  }

  connect.addEventListener("click", () => {
    const target = window.open(receiverUrl(), "dashgpt-chatgpt-import-receiver");
    if (!target) {
      setSourceState("blocked", "Safari заблокировал окно DashGPT. Разрешите всплывающее окно и нажмите ещё раз.");
      return;
    }
    setTimeout(() => connectAndRun(target), 800);
  });

  setSourceState("ready", "Скрипт запущен. Сейчас попробую подключиться к исходной вкладке DashGPT; если Safari разорвал opener, нажмите «Подключить DashGPT».");
  if (window.opener && !window.opener.closed) connectAndRun(window.opener).catch(() => {});
}

export function buildChatGptHistorySourceRunner({ receiverOrigin, receiverPath = "/demo/", sessionId, nonce }) {
  const normalizedOrigin = new URL(String(receiverOrigin || ""));
  if (normalizedOrigin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(normalizedOrigin.hostname)) {
    throw new Error("receiverOrigin must be HTTPS outside local development");
  }
  if (!sessionId || !nonce) throw new Error("sessionId and nonce are required");
  const config = {
    ...SOURCE_CONFIG,
    sourceVersion: CHATGPT_HISTORY_SOURCE_VERSION,
    receiverOrigin: normalizedOrigin.origin,
    receiverPath: String(receiverPath || "/demo/"),
    sessionId: String(sessionId),
    nonce: String(nonce)
  };
  return `(${sourceRuntime.toString()})(${JSON.stringify(config)});`;
}

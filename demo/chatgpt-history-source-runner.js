import {
  CHATGPT_HISTORY_SOURCE_VERSION as CORE_CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner as buildCoreRunner,
  computeChatGptDetailRetryDelay as computeCoreDetailRetryDelay
} from "./chatgpt-history-source-runner-core.js";
import {
  computeChatGptDetailRetryDelay
} from "./chatgpt-history-import-policy.js";
import {
  CHATGPT_SEMANTIC_ENRICHMENT_VERSION,
  deriveChatGptSemanticMetadata
} from "./chatgpt-semantic-enrichment.js";

export const CHATGPT_VISIBLE_TEXT_ESTIMATOR = "visible-text-v1";
export const CHATGPT_HISTORY_SOURCE_VERSION = CORE_CHATGPT_HISTORY_SOURCE_VERSION + 4;
export { computeChatGptDetailRetryDelay };

const HANDSHAKE_HOOK = "    postToReceiver({ type: \"HELLO\", sourceVersion });\n    const ready = await waitForReply(\"READY\", () => true, 5000);";
const PROJECT_TITLE_HOOK = "    const title = clip(conversation?.title || summary?.title || \"Untitled ChatGPT conversation\", 140);\n    return {";
const FACTS_HOOK = "      facts: [`${messages.length} visible messages`],";
const TAG_HOOK = "      tags: titleTags(title),";
const OPENER_CONNECT_HOOK = "  if (window.opener && !window.opener.closed) connectAndRun(window.opener).catch(() => {});";
const ACTION_SESSION_SENTINEL = "__DASHGPT_ACTION_SESSION__";
const ACTION_NONCE_SENTINEL = "__DASHGPT_ACTION_NONCE__";
const SOURCE_VERSION_HOOK = `\"sourceVersion\":${CORE_CHATGPT_HISTORY_SOURCE_VERSION}`;
const SCHEDULER_STATE_HOOK = "    successStreak: 0,\n    waiters: [],";
const RATE_LIMITED_HOOK = `    rateLimited() {
      this.limit = Math.max(1, this.limit - 1);
      this.successStreak = 0;
      this.wake();
    },`;
const SUCCEEDED_HOOK = `    succeeded() {
      this.successStreak += 1;
      if (this.successStreak >= successStreakToIncrease && this.limit < maxConcurrency) {
        this.limit += 1;
        this.successStreak = 0;
        this.wake();
      }
    }`;
const ACKED_PROGRESS_HOOK = "        importedThisRun += Number(reply.accepted || 0) + Number(reply.updated || 0);";
const RATE_LIMIT_CALL_HOOK = "        scheduler.rateLimited();";
const DETAIL_429_HOOK = `        if (error?.name === "ChatGptDetailDeferredError" && error.status === 429) {
          task.attempt += 1;`;
const DEFERRED_SLEEP_HOOK = "        await sleep(Math.min(Math.max(1, waitMs), 60_000));";
const CONTROL_MESSAGE_HOOK = `  window.addEventListener("message", event => {
    if (!validReceiverMessage(event)) return;
    if (event.data.type === "CONTROL_PAUSE") pauseImport("dashgpt-card");
  });`;
const QUEUE_STATE_HOOK = `    function updateQueueState(retryAfterMs = 0) {
      refreshDeferredCount();
      if (deferred.length && ready.length === 0 && running.size === 0) {
        const delay = retryAfterMs || Math.max(0, deferred[0].nextRetryAt - Date.now());
        setSourceState("waiting", \`${'${processedCurrent}'}/${'${discoveredTotal}'} обработано · ${'${deferred.length}'} ждут следующей попытки\`);
        publishReceiverState("rate_limited", deferred.length, delay);
        return;
      }
      const waiting = deferred.length ? \` · ${'${deferred.length}'} ждут повтора\` : "";
      setSourceState("running", \`${'${processedCurrent}'}/${'${discoveredTotal}'} обработано${'${waiting}'} · ${'${unresolved}'} на следующий запуск\`);
      publishReceiverState("running", deferred.length);
    }`;

export const MAX_CHATGPT_IMPORT_ACTION_CHARS = 64 * 1024;

export function estimateVisibleTextTokens(text) {
  const value = String(text || "");
  if (!value) return 0;
  const bytes = new TextEncoder().encode(value).length;
  return Math.max(1, Math.ceil(bytes / 4));
}

function replaceRequired(runner, hook, replacement, label) {
  if (!runner.includes(hook)) throw new Error(`ChatGPT source runner hook not found: ${label}`);
  return runner.replace(hook, replacement);
}

function injectUsageProjection(runner) {
  const estimator = estimateVisibleTextTokens.toString();
  let next = replaceRequired(
    runner,
    "  function projectConversation(payload, summary) {",
    `  const estimateVisibleTextTokens = ${estimator};\n\n  function projectConversation(payload, summary) {`,
    "visible-text token estimator"
  );
  next = replaceRequired(
    next,
    FACTS_HOOK,
    `      facts: [\`${'${messages.length}'} visible messages\`],\n      usage: {\n        tokenCount: messages.reduce((total, item) => total + estimateVisibleTextTokens(item.text), 0),\n        tokenCountKind: \"estimated\",\n        estimator: \"${CHATGPT_VISIBLE_TEXT_ESTIMATOR}\"\n      },`,
    "usage card fields"
  );
  return next;
}

function injectSemanticProjection(runner) {
  let next = runner;
  const semanticHook = PROJECT_TITLE_HOOK.replace(
    "    return {",
    `    const semantic = (${deriveChatGptSemanticMetadata.toString()})({ title, messages });\n    return {`
  );
  next = replaceRequired(next, PROJECT_TITLE_HOOK, semanticHook, "semantic projection");
  next = replaceRequired(
    next,
    TAG_HOOK,
    `      category: semantic.category,\n      tags: semantic.tags,\n      semanticEnrichmentVersion: ${CHATGPT_SEMANTIC_ENRICHMENT_VERSION},`,
    "semantic card fields"
  );
  return next;
}

function injectHandshakeRetry(runner) {
  return replaceRequired(
    runner,
    HANDSHAKE_HOOK,
    `    let ready = null;\n    let lastHandshakeError = null;\n    for (let attempt = 0; attempt < 10 && !ready; attempt += 1) {\n      postToReceiver({ type: \"HELLO\", sourceVersion });\n      try {\n        ready = await waitForReply(\"READY\", data => data.usageAware === true && Number(data.semanticEnrichmentVersion || 0) >= ${CHATGPT_SEMANTIC_ENRICHMENT_VERSION}, 1200);\n      } catch (error) {\n        lastHandshakeError = error;\n        if (attempt < 9) await sleep(250);\n      }\n    }\n    if (!ready) throw lastHandshakeError || new Error(\"DashGPT receiver did not become usage and semantic-enrichment aware\");`,
    "handshake"
  );
}

function injectF26RetryWakeup(runner) {
  let next = runner;
  next = replaceRequired(next, SOURCE_VERSION_HOOK, `\"sourceVersion\":${CHATGPT_HISTORY_SOURCE_VERSION}`, "source version");
  next = replaceRequired(next, computeCoreDetailRetryDelay.toString(), computeChatGptDetailRetryDelay.toString(), "detail retry helper");
  next = replaceRequired(
    next,
    SCHEDULER_STATE_HOOK,
    `    successStreak: 0,\n    rateLimitStreak: 0,\n    lastRateLimitAt: 0,\n    waiters: [],`,
    "scheduler pressure state"
  );
  next = replaceRequired(
    next,
    RATE_LIMITED_HOOK,
    `    rateLimited(delayMs = 0) {
      const now = Date.now();
      if (!this.lastRateLimitAt || now - this.lastRateLimitAt > 60_000) this.rateLimitStreak = 0;
      this.lastRateLimitAt = now;
      this.rateLimitStreak += 1;
      const cooldownStages = [5_000, 10_000, 15_000, 30_000];
      const stagedCooldown = cooldownStages[Math.min(cooldownStages.length - 1, this.rateLimitStreak - 1)];
      const requestedCooldown = Math.max(0, Number(delayMs) || 0);
      const cooldown = Math.max(stagedCooldown, requestedCooldown);
      this.limit = 1;
      this.successStreak = 0;
      this.cooldownUntil = Math.max(this.cooldownUntil, now + cooldown);
      this.wake();
    },`,
    "detail 429 circuit breaker"
  );
  next = replaceRequired(
    next,
    SUCCEEDED_HOOK,
    `    succeeded() {
      this.successStreak += 1;
      if (this.rateLimitStreak > 0 && this.successStreak >= 12) {
        this.rateLimitStreak = 0;
        this.lastRateLimitAt = 0;
      }
      if (this.successStreak >= successStreakToIncrease && this.limit < maxConcurrency) {
        this.limit += 1;
        this.successStreak = 0;
        this.wake();
      }
    }`,
    "circuit breaker recovery"
  );
  next = replaceRequired(
    next,
    ACKED_PROGRESS_HOOK,
    "        importedThisRun += Number(reply.accepted || 0) + Number(reply.updated || 0) + Number(reply.skipped || 0);",
    "durable ACK count"
  );
  next = replaceRequired(
    next,
    RATE_LIMIT_CALL_HOOK,
    "        scheduler.rateLimited(delay);",
    "shared retry cooldown"
  );
  next = replaceRequired(
    next,
    DETAIL_429_HOOK,
    `        if (error?.name === "ChatGptDetailDeferredError" && error.status === 429) {
          await flush(true);
          task.attempt += 1;`,
    "rate-limit flush"
  );
  next = replaceRequired(
    next,
    DEFERRED_SLEEP_HOOK,
    "        await scheduler.signal(Math.min(Math.max(1, waitMs), 15_000));",
    "wakeable deferred wait"
  );
  next = replaceRequired(
    next,
    CONTROL_MESSAGE_HOOK,
    `  window.addEventListener("message", event => {
    if (!validReceiverMessage(event)) return;
    if (event.data.type === "CONTROL_PAUSE") pauseImport("dashgpt-card");
    if (event.data.type === "CONTROL_WAKE") scheduler.wake();
  });

  window.addEventListener("focus", () => scheduler.wake());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduler.wake();
  });`,
    "validated retry wake controls"
  );
  next = replaceRequired(
    next,
    QUEUE_STATE_HOOK,
    `    function updateQueueState(retryAfterMs = 0) {
      refreshDeferredCount();
      const savedCurrent = Math.min(discoveredTotal, skippedCurrent + importedThisRun);
      if (deferred.length && ready.length === 0 && running.size === 0) {
        const delay = retryAfterMs || Math.max(0, deferred[0].nextRetryAt - Date.now());
        setSourceState("waiting", \`${'${processedCurrent}'}/${'${discoveredTotal}'} обработано · ${'${savedCurrent}'} сохранено в DashGPT · ${'${deferred.length}'} ждут следующей попытки\`);
        publishReceiverState("rate_limited", deferred.length, delay);
        return;
      }
      const waiting = deferred.length ? \` · ${'${deferred.length}'} ждут повтора\` : "";
      setSourceState("running", \`${'${processedCurrent}'}/${'${discoveredTotal}'} обработано · ${'${savedCurrent}'} сохранено в DashGPT${'${waiting}'} · ${'${unresolved}'} на следующий запуск\`);
      publishReceiverState("running", deferred.length);
    }`,
    "truthful source progress"
  );
  return next;
}

export function buildChatGptHistorySourceRunner(options) {
  return injectHandshakeRetry(injectUsageProjection(injectSemanticProjection(injectF26RetryWakeup(buildCoreRunner(options)))));
}

export function buildChatGptHistoryImportAction({ receiverOrigin, receiverPath = "/demo/" }) {
  let runner = buildChatGptHistorySourceRunner({
    receiverOrigin,
    receiverPath,
    sessionId: ACTION_SESSION_SENTINEL,
    nonce: ACTION_NONCE_SENTINEL
  });

  const sessionLiteral = JSON.stringify(ACTION_SESSION_SENTINEL);
  const nonceLiteral = JSON.stringify(ACTION_NONCE_SENTINEL);
  for (const [literal, label] of [[sessionLiteral, "session"], [nonceLiteral, "nonce"]]) {
    if (!runner.includes(literal)) throw new Error(`ChatGPT import action ${label} hook not found`);
  }
  if (!runner.includes(OPENER_CONNECT_HOOK)) throw new Error("ChatGPT import action receiver-connect hook not found");

  runner = runner
    .replace(sessionLiteral, "sessionId")
    .replace(nonceLiteral, "nonce")
    .replace(OPENER_CONNECT_HOOK, "  connect.click();");

  if (runner.includes(ACTION_SESSION_SENTINEL) || runner.includes(ACTION_NONCE_SENTINEL)) {
    throw new Error("ChatGPT import action contains fixed launch identity");
  }

  const runtime = `(()=>{const makeId=(prefix)=>prefix+\"_\"+(globalThis.crypto?.randomUUID?.()||Date.now()+\"-\"+Math.random().toString(16).slice(2));const sessionId=makeId(\"session\");const nonce=makeId(\"nonce\");${runner}void 0;})()`;
  const action = `javascript:${runtime}`;
  if (action.length > MAX_CHATGPT_IMPORT_ACTION_CHARS) {
    throw new Error(`ChatGPT import action is too large (${action.length} chars)`);
  }
  return action;
}

export function buildChatGptHistorySafariShortcutScript({ receiverOrigin, receiverPath = "/demo/" }) {
  const action = buildChatGptHistoryImportAction({ receiverOrigin, receiverPath });
  const prefix = "javascript:";
  if (!action.startsWith(prefix)) throw new Error("ChatGPT import bookmark action prefix is missing");
  const runtime = action.slice(prefix.length);
  return `${runtime};if(typeof completion===\"function\")completion();`;
}

import {
  CHATGPT_HISTORY_SOURCE_VERSION as CORE_SOURCE_VERSION,
  buildChatGptHistorySourceRunner as buildCoreRunner
} from "./chatgpt-history-source-runner-core.js";

export const CHATGPT_HISTORY_SOURCE_VERSION = CORE_SOURCE_VERSION + 1;

const HANDSHAKE_HOOK = "    postToReceiver({ type: \"HELLO\", sourceVersion });\n    const ready = await waitForReply(\"READY\", () => true, 5000);";
const PROJECT_CONVERSATION_HOOK = "  function projectConversation(payload, summary) {";
const PROJECT_FACTS_HOOK = "      facts: [`${messages.length} visible messages`],";
const OPENER_CONNECT_HOOK = "  if (window.opener && !window.opener.closed) connectAndRun(window.opener).catch(() => {});";
const ACTION_SESSION_SENTINEL = "__DASHGPT_ACTION_SESSION__";
const ACTION_NONCE_SENTINEL = "__DASHGPT_ACTION_NONCE__";

export const MAX_CHATGPT_IMPORT_ACTION_CHARS = 64 * 1024;
export const CHATGPT_VISIBLE_TEXT_ESTIMATOR = "visible-text-v1";

export function estimateVisibleTextTokens(text) {
  const value = String(text || "").normalize("NFKC");
  if (!value.trim()) return 0;

  let tokens = 0;
  let asciiRun = 0;
  let unicodeRun = 0;
  const flushAscii = () => {
    if (!asciiRun) return;
    tokens += Math.ceil(asciiRun / 4);
    asciiRun = 0;
  };
  const flushUnicode = () => {
    if (!unicodeRun) return;
    tokens += Math.ceil(unicodeRun / 2);
    unicodeRun = 0;
  };

  for (const char of value) {
    if (/\s/u.test(char)) {
      flushAscii();
      flushUnicode();
      continue;
    }
    if (/^[\x00-\x7F]$/u.test(char)) {
      flushUnicode();
      asciiRun += 1;
      continue;
    }
    flushAscii();
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]$/u.test(char)) {
      flushUnicode();
      tokens += 1;
      continue;
    }
    unicodeRun += 1;
  }
  flushAscii();
  flushUnicode();
  return Math.max(1, tokens);
}

function injectSourceVersion(runner) {
  const from = `\"sourceVersion\":${CORE_SOURCE_VERSION}`;
  const to = `\"sourceVersion\":${CHATGPT_HISTORY_SOURCE_VERSION}`;
  if (!runner.includes(from)) throw new Error("ChatGPT source runner version hook not found");
  return runner.replace(from, to);
}

function injectUsageEstimate(runner) {
  if (!runner.includes(PROJECT_CONVERSATION_HOOK) || !runner.includes(PROJECT_FACTS_HOOK)) {
    throw new Error("ChatGPT source runner usage hooks not found");
  }
  const estimatorSource = estimateVisibleTextTokens.toString()
    .split("\n")
    .map(line => `  ${line}`)
    .join("\n");
  return runner
    .replace(PROJECT_CONVERSATION_HOOK, `${estimatorSource}\n\n${PROJECT_CONVERSATION_HOOK}`)
    .replace(
      PROJECT_FACTS_HOOK,
      `${PROJECT_FACTS_HOOK}\n      usage: {\n        tokenCount: messages.reduce((total, item) => total + estimateVisibleTextTokens(item.text), 0),\n        tokenCountKind: \"estimated\",\n        estimator: ${JSON.stringify(CHATGPT_VISIBLE_TEXT_ESTIMATOR)}\n      },`
    );
}

function injectHandshakeRetry(runner) {
  if (!runner.includes(HANDSHAKE_HOOK)) {
    throw new Error(`ChatGPT source runner hook not found: ${HANDSHAKE_HOOK.slice(0, 48)}`);
  }

  return runner.replace(
    HANDSHAKE_HOOK,
    `    let ready = null;\n    let lastHandshakeError = null;\n    for (let attempt = 0; attempt < 10 && !ready; attempt += 1) {\n      postToReceiver({ type: \"HELLO\", sourceVersion });\n      try {\n        ready = await waitForReply(\"READY\", data => data.usageAware === true, 1200);\n      } catch (error) {\n        lastHandshakeError = error;\n        if (attempt < 9) await sleep(250);\n      }\n    }\n    if (!ready) throw lastHandshakeError || new Error(\"DashGPT receiver did not become ready\");`
  );
}

export function buildChatGptHistorySourceRunner(options) {
  return injectHandshakeRetry(injectUsageEstimate(injectSourceVersion(buildCoreRunner(options))));
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

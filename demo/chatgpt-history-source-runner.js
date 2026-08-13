import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner as buildCoreRunner
} from "./chatgpt-history-source-runner-core.js";

export { CHATGPT_HISTORY_SOURCE_VERSION };

const HANDSHAKE_HOOK = "    postToReceiver({ type: \"HELLO\", sourceVersion });\n    const ready = await waitForReply(\"READY\", () => true, 5000);";
const OPENER_CONNECT_HOOK = "  if (window.opener && !window.opener.closed) connectAndRun(window.opener).catch(() => {});";
const ACTION_SESSION_SENTINEL = "__DASHGPT_ACTION_SESSION__";
const ACTION_NONCE_SENTINEL = "__DASHGPT_ACTION_NONCE__";

export const MAX_CHATGPT_IMPORT_ACTION_CHARS = 64 * 1024;

function injectHandshakeRetry(runner) {
  if (!runner.includes(HANDSHAKE_HOOK)) {
    throw new Error(`ChatGPT source runner hook not found: ${HANDSHAKE_HOOK.slice(0, 48)}`);
  }

  return runner.replace(
    HANDSHAKE_HOOK,
    `    let ready = null;\n    let lastHandshakeError = null;\n    for (let attempt = 0; attempt < 10 && !ready; attempt += 1) {\n      postToReceiver({ type: \"HELLO\", sourceVersion });\n      try {\n        ready = await waitForReply(\"READY\", () => true, 1200);\n      } catch (error) {\n        lastHandshakeError = error;\n        if (attempt < 9) await sleep(250);\n      }\n    }\n    if (!ready) throw lastHandshakeError || new Error(\"DashGPT receiver did not become ready\");`
  );
}

export function buildChatGptHistorySourceRunner(options) {
  return injectHandshakeRetry(buildCoreRunner(options));
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

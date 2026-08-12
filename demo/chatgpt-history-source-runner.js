import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner as buildCoreRunner
} from "./chatgpt-history-source-runner-core.js";

export { CHATGPT_HISTORY_SOURCE_VERSION };

const HANDSHAKE_HOOK = "    postToReceiver({ type: \"HELLO\", sourceVersion });\n    const ready = await waitForReply(\"READY\", () => true, 5000);";

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

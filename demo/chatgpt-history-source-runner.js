import {
  CHATGPT_HISTORY_SOURCE_VERSION,
  buildChatGptHistorySourceRunner as buildCoreRunner
} from "./chatgpt-history-source-runner-core.js";

export { CHATGPT_HISTORY_SOURCE_VERSION };

const STATE_DECLARATION = "  let unresolved = 0;";
const SUCCESS_HOOK = "        if (detail) scheduler.succeeded();";
const THROTTLE_HOOK = "        scheduler.throttled(delay);\n        setSourceState(\"waiting\",";

function injectBridgeState(runner) {
  for (const needle of [STATE_DECLARATION, SUCCESS_HOOK, THROTTLE_HOOK]) {
    if (!runner.includes(needle)) throw new Error(`ChatGPT source runner hook not found: ${needle.slice(0, 48)}`);
  }

  return runner
    .replace(
      STATE_DECLARATION,
      `${STATE_DECLARATION}\n  let dashGptReceiverState = \"running\";`
    )
    .replace(
      SUCCESS_HOOK,
      `        if (detail) {\n          scheduler.succeeded();\n          if (dashGptReceiverState === \"rate_limited\") {\n            dashGptReceiverState = \"running\";\n            postToReceiver({ type: \"SOURCE_STATE\", state: \"running\" });\n          }\n        }`
    )
    .replace(
      THROTTLE_HOOK,
      `        scheduler.throttled(delay);\n        if (dashGptReceiverState !== \"rate_limited\") {\n          dashGptReceiverState = \"rate_limited\";\n          postToReceiver({\n            type: \"SOURCE_STATE\",\n            state: \"rate_limited\",\n            retryAfterMs: Math.min(60_000, Math.max(0, Math.round(delay)))\n          });\n        }\n        setSourceState(\"waiting\",`
    );
}

export function buildChatGptHistorySourceRunner(options) {
  return injectBridgeState(buildCoreRunner(options));
}

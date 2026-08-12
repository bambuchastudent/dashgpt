import { buildChatGptHistorySafariShortcutScript } from "../demo/chatgpt-history-source-runner.js";

const shortcut = buildChatGptHistorySafariShortcutScript({
  receiverOrigin: "https://dashgpt.example",
  receiverPath: "/demo/"
});

console.log(`Safari Shortcut payload generated: ${shortcut.length} chars`);

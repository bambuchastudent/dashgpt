import {
  conversationsFromChatGptExportPayload,
  projectChatGptExportConversation
} from "./chatgpt-export-normalizer.js";
import { readChatGptConversationJsonEntriesFromZip } from "./chatgpt-export-zip.js";

const MAX_DIRECT_JSON_BYTES = 512 * 1024 * 1024;
const utf8 = new TextDecoder("utf-8");

function nameOf(file, index) {
  return String(file?.name || `export-${index + 1}.json`);
}

function zipInput(file) {
  const name = String(file?.name || "").toLocaleLowerCase();
  const type = String(file?.type || "").toLocaleLowerCase();
  return name.endsWith(".zip") || type === "application/zip" || type === "application/x-zip-compressed";
}

async function jsonInputs(file, index) {
  if (zipInput(file)) return readChatGptConversationJsonEntriesFromZip(file);
  if (Number(file?.size || 0) > MAX_DIRECT_JSON_BYTES) {
    throw new Error(`${nameOf(file, index)} is too large; select the numbered conversation JSON files from the export`);
  }
  return [{ name: nameOf(file, index), bytes: new Uint8Array(await file.arrayBuffer()) }];
}

export async function readChatGptExportFiles(files, { onFile } = {}) {
  const input = Array.from(files || []);
  if (!input.length) throw new Error("Choose a ChatGPT export ZIP or conversation JSON file");
  const bySourceId = new Map();
  let rawConversations = 0;
  let malformed = 0;
  let jsonFiles = 0;

  for (let fileIndex = 0; fileIndex < input.length; fileIndex += 1) {
    for (const jsonInput of await jsonInputs(input[fileIndex], fileIndex)) {
      jsonFiles += 1;
      let parsed;
      try {
        parsed = JSON.parse(utf8.decode(jsonInput.bytes));
      } catch {
        throw new Error(`Cannot read ChatGPT conversation JSON: ${jsonInput.name}`);
      }
      const conversations = conversationsFromChatGptExportPayload(parsed);
      rawConversations += conversations.length;
      for (const conversation of conversations) {
        try {
          const candidate = projectChatGptExportConversation(conversation);
          const current = bySourceId.get(candidate.sourceId);
          const currentTime = current ? Date.parse(current.updatedAt) || 0 : -1;
          const incomingTime = Date.parse(candidate.updatedAt) || 0;
          if (!current || incomingTime >= currentTime) bySourceId.set(candidate.sourceId, candidate);
        } catch {
          malformed += 1;
        }
      }
      onFile?.({ name: jsonInput.name, rawConversations, uniqueConversations: bySourceId.size, malformed });
      await Promise.resolve();
    }
  }

  if (!bySourceId.size && rawConversations === 0) throw new Error("No ChatGPT conversations found in the selected export");
  return {
    candidates: [...bySourceId.values()],
    discovered: bySourceId.size,
    rawConversations,
    malformed,
    duplicateSourceRecords: Math.max(0, rawConversations - malformed - bySourceId.size),
    jsonFiles
  };
}

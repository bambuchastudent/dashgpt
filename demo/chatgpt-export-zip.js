import { isChatGptConversationJsonPath } from "./chatgpt-export-normalizer.js";

const MAX_CENTRAL_DIRECTORY_BYTES = 32 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 100_000;
const MAX_CONVERSATION_JSON_BYTES = 512 * 1024 * 1024;
const MAX_TOTAL_CONVERSATION_JSON_BYTES = 768 * 1024 * 1024;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const utf8 = new TextDecoder("utf-8");

function u16(view, offset) { return view.getUint16(offset, true); }
function u32(view, offset) { return view.getUint32(offset, true); }
function bounds(length, offset, size) {
  if (offset < 0 || size < 0 || offset + size > length) throw new Error("Invalid ZIP structure");
}

function findEnd(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (u32(view, offset) !== EOCD_SIGNATURE) continue;
    bounds(bytes.byteLength, offset, 22);
    const commentLength = u16(view, offset + 20);
    if (offset + 22 + commentLength <= bytes.byteLength) return { view, offset };
  }
  throw new Error("This file is not a supported ZIP archive");
}

function centralEntries(bytes, entryCount) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let offset = 0;
  for (let index = 0; index < entryCount; index += 1) {
    bounds(bytes.byteLength, offset, 46);
    if (u32(view, offset) !== CENTRAL_SIGNATURE) throw new Error("Invalid ZIP central directory");
    const flags = u16(view, offset + 8);
    const method = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const uncompressedSize = u32(view, offset + 24);
    const nameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const diskStart = u16(view, offset + 34);
    const localOffset = u32(view, offset + 42);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff || diskStart === 0xffff) {
      throw new Error("This very large ZIP format is not supported yet; unzip it and select the conversation JSON files instead");
    }
    const length = 46 + nameLength + extraLength + commentLength;
    bounds(bytes.byteLength, offset, length);
    const name = utf8.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.push({ name, flags, method, compressedSize, uncompressedSize, localOffset });
    offset += length;
  }
  return entries;
}

async function boundedInflate(compressed, entry) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser cannot unpack the ChatGPT ZIP directly; unzip it and select the conversation JSON files instead");
  }
  let stream;
  try {
    stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  } catch {
    throw new Error("This browser cannot unpack this ChatGPT ZIP; unzip it and select the conversation JSON files instead");
  }
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  const maximum = entry.uncompressedSize || MAX_CONVERSATION_JSON_BYTES;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
      total += chunk.byteLength;
      if (total > maximum || total > MAX_CONVERSATION_JSON_BYTES) {
        await reader.cancel();
        throw new Error(`Conversation JSON expands beyond its declared safe size: ${entry.name}`);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock?.();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function inflateEntry(blob, entry) {
  if (entry.flags & 0x1) throw new Error(`Protected ZIP entry is not supported: ${entry.name}`);
  if (![0, 8].includes(entry.method)) throw new Error(`Unsupported ZIP compression for ${entry.name}`);
  if (entry.uncompressedSize > MAX_CONVERSATION_JSON_BYTES) throw new Error(`Conversation JSON is too large: ${entry.name}`);

  const header = await blob.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer();
  const view = new DataView(header);
  bounds(header.byteLength, 0, 30);
  if (u32(view, 0) !== LOCAL_SIGNATURE) throw new Error("Invalid ZIP local header");
  const nameLength = u16(view, 26);
  const extraLength = u16(view, 28);
  const dataStart = entry.localOffset + 30 + nameLength + extraLength;
  if (dataStart + entry.compressedSize > blob.size) throw new Error("Invalid ZIP entry bounds");
  const compressed = new Uint8Array(await blob.slice(dataStart, dataStart + entry.compressedSize).arrayBuffer());
  const output = entry.method === 0 ? compressed : await boundedInflate(compressed, entry);
  if (output.byteLength > MAX_CONVERSATION_JSON_BYTES) throw new Error(`Conversation JSON is too large: ${entry.name}`);
  if (entry.uncompressedSize && output.byteLength !== entry.uncompressedSize) throw new Error(`ZIP entry size mismatch: ${entry.name}`);
  return output;
}

export async function readChatGptConversationJsonEntriesFromZip(blob) {
  if (!blob || typeof blob.slice !== "function" || !Number.isFinite(Number(blob.size))) throw new Error("Invalid ZIP file");
  const tailLength = Math.min(blob.size, 65_535 + 42);
  const tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - tailLength)).arrayBuffer());
  const end = findEnd(tail);
  const disk = u16(end.view, end.offset + 4);
  const centralDisk = u16(end.view, end.offset + 6);
  const entriesOnDisk = u16(end.view, end.offset + 8);
  const entryCount = u16(end.view, end.offset + 10);
  const centralSize = u32(end.view, end.offset + 12);
  const centralOffset = u32(end.view, end.offset + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) throw new Error("Multi-volume ZIP archives are not supported");
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("This very large ZIP format is not supported yet; unzip it and select the conversation JSON files instead");
  }
  if (entryCount > MAX_ZIP_ENTRIES || centralSize > MAX_CENTRAL_DIRECTORY_BYTES) throw new Error("ZIP archive is too large to inspect safely");
  if (centralOffset + centralSize > blob.size) throw new Error("Invalid ZIP central directory bounds");

  const central = new Uint8Array(await blob.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const entries = centralEntries(central, entryCount).filter(entry => isChatGptConversationJsonPath(entry.name));
  if (!entries.length) throw new Error("No conversations.json or numbered conversation JSON files found in this ChatGPT export");
  const total = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  if (total > MAX_TOTAL_CONVERSATION_JSON_BYTES) {
    throw new Error("Conversation export is too large to unpack at once; unzip it and select the numbered conversation JSON files instead");
  }
  const output = [];
  for (const entry of entries) output.push({ name: entry.name, bytes: await inflateEntry(blob, entry) });
  return output;
}

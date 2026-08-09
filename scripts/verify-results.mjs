import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const DURABLE_FIELDS = ["id", "title", "summary", "category", "tags", "decisions", "next", "source"];
const REQUIRED_FIELDS = [
  "id",
  "schemaVersion",
  "title",
  "summary",
  "category",
  "tags",
  "favorite",
  "decisions",
  "next",
  "publishedAt",
  "immutable",
  "contentVersion",
  "contentHash"
];

export function durablePayload(result) {
  const payload = {};
  for (const field of DURABLE_FIELDS) {
    if (result[field] !== undefined) payload[field] = result[field];
  }
  return payload;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashResult(result) {
  return `sha256:${createHash("sha256")
    .update(canonicalize(durablePayload(result)), "utf8")
    .digest("hex")}`;
}

const results = JSON.parse(
  await readFile(new URL("../demo/data/results.json", import.meta.url), "utf8")
);

if (!Array.isArray(results)) throw new Error("Published Result catalog must be an array.");

const ids = new Set();
for (const result of results) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) throw new Error(`${result.id || "<unknown>"}: missing required field ${field}`);
  }
  if (ids.has(result.id)) throw new Error(`${result.id}: duplicate id`);
  ids.add(result.id);
  if (result.schemaVersion !== 1) throw new Error(`${result.id}: unsupported schemaVersion`);
  if (result.immutable !== true) throw new Error(`${result.id}: published Result must be immutable`);
  if (!Number.isInteger(result.contentVersion) || result.contentVersion < 1) {
    throw new Error(`${result.id}: invalid contentVersion`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(result.contentHash)) {
    throw new Error(`${result.id}: invalid contentHash format`);
  }

  const actual = hashResult(result);
  if (actual !== result.contentHash) {
    throw new Error(
      `${result.id}: immutable content changed; expected ${result.contentHash}, got ${actual}. Create a new Result/content revision instead of silently rewriting it.`
    );
  }
}

console.log(`Verified ${results.length} immutable DashGPT Results.`);

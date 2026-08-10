import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const DURABLE_FIELDS = [
  "id", "title", "goal", "summary", "currentState", "category", "tags", "decisions", "facts",
  "constraints", "userPreferences", "openQuestions", "next", "suggestedNextStep", "links",
  "relatedMaterials", "language", "continuationContext", "source"
];
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

const CONTINUATION_FIELDS = [
  "goal", "currentState", "facts", "constraints", "userPreferences", "openQuestions",
  "suggestedNextStep", "links", "relatedMaterials", "language", "continuationContext"
];

const continuationProbe = {
  id: "continuation-integrity-probe",
  title: "Continuation integrity probe",
  summary: "Structured continuation fields must remain durable.",
  category: "Verification",
  tags: ["continuation"],
  decisions: ["Keep the brief derived from the current Result."],
  next: "Verify the projected fields.",
  goal: "Prove additive continuation data participates in integrity checks.",
  currentState: "The projection is under test.",
  facts: ["This is a deterministic in-memory fixture."],
  constraints: ["Do not alter published fixture hashes."],
  userPreferences: ["English"],
  openQuestions: ["Does every additive field survive projection?"],
  suggestedNextStep: "Compare the durable projections.",
  links: [{ title: "DashGPT", url: "https://example.com/dashgpt" }],
  relatedMaterials: ["OpenSpec change"],
  language: "en",
  continuationContext: { summary: "Allowlisted structured context." },
  source: { type: "verification" }
};

const projectedContinuation = durablePayload(continuationProbe);
for (const field of CONTINUATION_FIELDS) {
  if (!(field in projectedContinuation)) {
    throw new Error(`Continuation integrity regression: ${field} was dropped from the durable projection.`);
  }
}

const changedContinuationProbe = structuredClone(continuationProbe);
changedContinuationProbe.openQuestions = ["This field changed and must change the digest."];
if (hashResult(continuationProbe) === hashResult(changedContinuationProbe)) {
  throw new Error("Continuation integrity regression: additive continuation content did not change the digest.");
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

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RESULTS_PATH = "demo/data/results.json";
const baseRef = process.argv[2];

if (!baseRef) {
  console.error("Usage: node scripts/check-immutable-results.mjs <base-git-ref>");
  process.exit(2);
}

function parse(content, label) {
  const value = JSON.parse(content);
  if (!Array.isArray(value)) throw new Error(`${label} must contain a JSON array.`);
  return value;
}

function immutableContent(result) {
  return {
    title: result.title,
    summary: result.summary,
    category: result.category,
    tags: result.tags || [],
    decisions: result.decisions || [],
    next: result.next || "",
    source: result.source || null
  };
}

const base = parse(
  execFileSync("git", ["show", `${baseRef}:${RESULTS_PATH}`], { encoding: "utf8" }),
  `${baseRef}:${RESULTS_PATH}`
);
const current = parse(readFileSync(RESULTS_PATH, "utf8"), RESULTS_PATH);
const currentById = new Map(current.map((result) => [result.id, result]));
const violations = [];

for (const previous of base) {
  if (previous.immutable !== true) continue;

  const next = currentById.get(previous.id);
  if (!next) {
    violations.push(`${previous.id}: immutable Result was removed`);
    continue;
  }

  if (next.immutable !== true) {
    violations.push(`${previous.id}: immutable flag was removed`);
  }

  if (JSON.stringify(immutableContent(previous)) !== JSON.stringify(immutableContent(next))) {
    violations.push(`${previous.id}: immutable content changed; create a new Result revision instead`);
  }

  if ((next.contentVersion || 1) !== (previous.contentVersion || 1)) {
    violations.push(`${previous.id}: contentVersion changed in-place; create a new Result revision instead`);
  }
}

if (violations.length) {
  console.error("Immutable Result guard failed:\n- " + violations.join("\n- "));
  process.exit(1);
}

console.log(`Immutable Result guard passed for ${base.filter((item) => item.immutable === true).length} locked Results.`);

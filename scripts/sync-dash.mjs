import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../DASH.md", import.meta.url);
const targetUrl = new URL("../demo/data/dash.json", import.meta.url);

function parseDash(markdown) {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith("# "));
  const title = titleLine ? titleLine.slice(2).trim() : "DashGPT — DASH";
  const intro = [];
  const sections = [];
  let current = null;
  let afterTitle = false;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      afterTitle = true;
      continue;
    }

    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), lines: [] };
      sections.push(current);
      continue;
    }

    if (!afterTitle || !line.trim()) continue;
    if (current) current.lines.push(line.replace(/\s+$/, ""));
    else intro.push(line.replace(/\s+$/, ""));
  }

  return { title, intro, sections };
}

const expected = `${JSON.stringify(parseDash(await readFile(sourceUrl, "utf8")), null, 2)}\n`;

if (process.argv.includes("--check")) {
  let actual = "";
  try {
    actual = await readFile(targetUrl, "utf8");
  } catch {
    console.error("demo/data/dash.json is missing. Run: node scripts/sync-dash.mjs");
    process.exit(1);
  }

  if (actual !== expected) {
    console.error("Mobile DASH mirror is stale. Run: node scripts/sync-dash.mjs");
    process.exit(1);
  }

  console.log("DASH.md and demo/data/dash.json are synchronized.");
} else {
  await writeFile(targetUrl, expected, "utf8");
  console.log("Updated demo/data/dash.json from DASH.md.");
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/check.yml", import.meta.url),
  "utf8"
);
const playwrightConfig = readFileSync(
  new URL("../playwright.config.mjs", import.meta.url),
  "utf8"
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

assert.match(workflow, /runs-on: ubuntu-latest/, "canonical checks must remain on GitHub-hosted Ubuntu");
assert.match(workflow, /timeout-minutes: 30/, "the existing hard CI budget must remain explicit");
assert.match(workflow, /npm run verify:full/, "hosted CI must execute the canonical full verification command");
assert.match(workflow, /npx playwright install --with-deps chromium/, "hosted CI must provision Chromium and Linux dependencies");

const installLine = workflow
  .split(/\r?\n/)
  .find((line) => line.includes("npm install"));
assert.ok(installLine, "hosted CI must install npm dependencies");
assert.match(installLine, /--ignore-scripts/, "hosted npm install must keep lifecycle scripts disabled");
assert.match(installLine, /--no-audit/, "hosted npm install must skip non-verification audit work");
assert.match(installLine, /--no-fund/, "hosted npm install must skip non-verification funding output/work");

assert.match(playwrightConfig, /fullyParallel: false/, "per-file Playwright ordering must remain unchanged");
assert.match(
  playwrightConfig,
  /workers: process\.env\.CI \? 2 : undefined/,
  "hosted CI must use bounded two-worker Playwright scheduling"
);
assert.match(playwrightConfig, /retries: process\.env\.CI \? 1 : 0/, "CI retry coverage must remain enabled");
assert.match(playwrightConfig, /name: "desktop-chromium"/, "desktop Chromium coverage must remain configured");
assert.match(playwrightConfig, /name: "mobile-chromium"/, "mobile Chromium coverage must remain configured");

assert.equal(
  packageJson.scripts["verify:full"],
  "npm run check && npm run test:browser",
  "canonical verification must retain deterministic checks plus the full browser suite"
);
assert.match(
  packageJson.scripts.check,
  /node scripts\/verify-hosted-ci-performance\.mjs/,
  "the hosted CI contract verifier must remain wired into npm run check"
);

console.log("Hosted CI canonical verification performance checks passed.");

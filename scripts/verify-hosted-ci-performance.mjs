import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

const workflow = read("../.github/workflows/check.yml");
const playwrightConfig = read("../playwright.config.mjs");
const fixture = read("../tests/playwright-fixture.mjs");
const bootstrap = read("../demo/catalog-bootstrap.js");
const isolationSpec = read("../tests/playwright-isolation.spec.mjs");
const packageJson = JSON.parse(read("../package.json"));

assert.match(workflow, /runs-on: ubuntu-latest/, "canonical checks must remain on GitHub-hosted Ubuntu");
assert.match(workflow, /deterministic:/, "hosted CI must keep a deterministic verification shard");
assert.match(workflow, /browser:/, "hosted CI must keep a browser matrix shard");
assert.match(workflow, /\n  canonical-full:\n/, "hosted CI must keep an opt-in literal canonical verification lane");
assert.match(workflow, /\n  check:\n/, "hosted CI must preserve the final required check job identity");
assert.match(workflow, /- desktop-chromium/, "desktop Chromium must remain in the hosted browser matrix");
assert.match(workflow, /- mobile-chromium/, "mobile Chromium must remain in the hosted browser matrix");
assert.match(workflow, /npm run check/, "deterministic hosted CI must execute npm run check");
assert.match(
  workflow,
  /npx playwright test --project="\$\{\{ matrix\.project \}\}"/,
  "browser matrix must execute its selected Playwright project"
);
assert.match(workflow, /contains\(github\.event\.pull_request\.title, '\[verify:full\]'\)/, "literal canonical proof must stay explicitly opt-in");
assert.match(workflow, /- run: npm run verify:full/, "opt-in canonical lane must execute the literal canonical command");
assert.match(workflow, /npx playwright install --with-deps chromium/, "browser jobs must provision Chromium and Linux dependencies");
assert.match(workflow, /timeout-minutes: 5/, "deterministic shard must keep a short hard budget");
assert.match(workflow, /timeout-minutes: 9/, "browser and opt-in canonical shards must stay below the ten-minute feedback budget");
assert.match(workflow, /timeout-minutes: 2/, "final check aggregator must stay lightweight");
assert.match(workflow, /needs:\s*\n\s*- deterministic\s*\n\s*- browser\s*\n\s*- canonical-full/, "final check must depend on every canonical shard and optional proof lane");
assert.match(workflow, /DETERMINISTIC_RESULT: \$\{\{ needs\.deterministic\.result \}\}/, "aggregator must inspect deterministic result");
assert.match(workflow, /BROWSER_RESULT: \$\{\{ needs\.browser\.result \}\}/, "aggregator must inspect browser result");
assert.match(workflow, /CANONICAL_RESULT: \$\{\{ needs\.canonical-full\.result \}\}/, "aggregator must inspect opt-in canonical result");
assert.match(workflow, /CANONICAL_REQUIRED:/, "aggregator must distinguish requested and skipped literal canonical proof");
assert.match(workflow, /actions\/upload-artifact@v4/, "browser failures must retain Playwright diagnostics");

for (const installLine of workflow.split(/\r?\n/).filter(line => line.includes("npm install"))) {
  assert.match(installLine, /--ignore-scripts/, "hosted npm install must keep lifecycle scripts disabled");
  assert.match(installLine, /--no-audit/, "hosted npm install must skip non-verification audit work");
  assert.match(installLine, /--no-fund/, "hosted npm install must skip non-verification funding work");
}

assert.match(playwrightConfig, /fullyParallel: true/, "browser tests must be eligible for isolation-safe full parallelism");
assert.match(
  playwrightConfig,
  /workers: process\.env\.CI \? 2 : undefined/,
  "hosted browser jobs must use bounded two-worker scheduling"
);
assert.match(playwrightConfig, /maxFailures: process\.env\.CI \? 4 : 0/, "hosted browser jobs must fail systemic breakage early");
assert.match(playwrightConfig, /retries: process\.env\.CI \? 1 : 0/, "CI retry coverage must remain enabled");
assert.match(playwrightConfig, /storageState: \{ cookies: \[\], origins: \[\] \}/, "every test context must start from empty configured browser storage state");
assert.match(playwrightConfig, /name: "desktop-chromium"/, "desktop Chromium coverage must remain configured");
assert.match(playwrightConfig, /name: "mobile-chromium"/, "mobile Chromium coverage must remain configured");
assert.match(playwrightConfig, /"json", \{ outputFile: "test-results\/results\.json" \}/, "CI must emit machine-readable per-test timings");

assert.match(fixture, /READY_TIMEOUT_MS = process\.env\.CI \? 5_000 : 10_000/, "CI demo readiness must fail within five seconds");
assert.match(fixture, /context\.clearCookies\(\)/, "test contexts must explicitly clear cookies before use");
assert.match(fixture, /context\.clearPermissions\(\)/, "test contexts must explicitly clear permissions before use");
assert.match(fixture, /html\[data-dashgpt-ready="true"\]/, "fixture must wait for the explicit DashGPT readiness signal");
assert.match(bootstrap, /document\.documentElement\.dataset\.dashgptReady = "true"/, "demo bootstrap must emit the readiness signal");
assert.match(bootstrap, /summary\.textContent !== "Loading Results…"/, "readiness must wait for rendered app state rather than DOM load alone");

assert.match(isolationSpec, /browser contexts isolate DashGPT storage/, "browser isolation regression coverage must remain present");
assert.match(isolationSpec, /localStorage\.setItem/, "isolation regression must write browser-local state");
assert.match(isolationSpec, /toBeNull\(\)/, "isolation regression must prove state is absent from another context");

assert.equal(
  packageJson.scripts["verify:full"],
  "npm run check && npm run test:browser",
  "canonical full verification must retain deterministic checks plus the complete browser suite"
);
assert.match(
  packageJson.scripts.check,
  /node scripts\/verify-hosted-ci-performance\.mjs/,
  "the hosted CI contract verifier must remain wired into npm run check"
);
assert.match(
  packageJson.scripts.check,
  /node --check tests\/playwright-isolation\.spec\.mjs/,
  "browser isolation regression syntax must remain covered by deterministic checks"
);

console.log("Hosted CI fast/isolation/parallel verification checks passed.");

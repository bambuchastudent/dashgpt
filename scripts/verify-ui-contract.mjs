import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../demo/styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../demo/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");

// Semantic color must be computed per Result and applied through CSS variables.
assert.match(app, /function semanticHue\(result\)/, "semanticHue(result) renderer is required");
assert.match(app, /--semantic-hue/, "renderer must expose semantic hue to CSS");
assert.match(app, /applySemanticVisual\(card,result\)/, "dashboard cards must receive semantic visuals");

// Regression guard: semantic color must be visibly encoded in more than a hairline border.
// These selectors intentionally require three independent visual cues.
assert.match(css, /\.result-card::before\{[^}]*height:(?:5|6|7|8)px[^}]*background:linear-gradient\([^}]*--semantic-hue/s,
  "Result cards need a clearly visible semantic color strip");
assert.match(css, /\.result-card \.category\{[^}]*background:hsla\(var\(--semantic-hue\)/s,
  "Result category must have a semantic-color pill/background");
assert.match(css, /\.result-card\{[^}]*background:[^}]*hsla\(var\(--semantic-hue\)[^}]*\.(?:3|4|5|6|7|8|9)/s,
  "Result card background needs a perceptible semantic tint (alpha >= .3)");

// UX contract from Feature 5: Context is secondary, not a peer card action.
assert.doesNotMatch(html, /class="[^"]*context-button[^"]*"/, "Context Pack must not return as a primary card action");
assert.match(app, /More ···/, "Result details must keep secondary actions behind More");
assert.match(app, /Original chat ↗/, "Original chat must remain a prominent action when source exists");
assert.match(app, /Continue in new chat ↗/, "Continuation must remain a prominent action");

console.log("DashGPT UI contract checks passed.");

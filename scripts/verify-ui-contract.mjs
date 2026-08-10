import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = ["../demo/styles.css", "../demo/semantic.css"]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");
const app = readFileSync(new URL("../demo/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");

assert.match(app, /function semanticHue\(result\)/, "semanticHue(result) renderer is required");
assert.match(app, /--semantic-hue/, "renderer must expose semantic hue to CSS");
assert.match(app, /applySemanticVisual\(card,\s*result\)/, "dashboard cards must receive semantic visuals");

// Require three independent, clearly visible semantic cues so a hairline-only regression fails CI.
assert.match(css, /\.result-card::before\{[^}]*height:(?:5|6|7|8)px[^}]*background:linear-gradient\([^}]*--semantic-hue/s,
  "Result cards need a clearly visible semantic color strip");
assert.match(css, /\.result-card \.category\{[^}]*background:hsla\(var\(--semantic-hue\)/s,
  "Result category must have a semantic-color pill/background");
assert.match(css, /\.result-card\{[^}]*background:[^}]*hsla\(var\(--semantic-hue\)[^}]*\.(?:3|4|5|6|7|8|9)/s,
  "Result card background needs a perceptible semantic tint (alpha >= .3)");

assert.match(html, /semantic\.css/, "semantic visual layer must be loaded by the dashboard");
assert.match(html, /vault\.css/, "vault storage status layer must be loaded by the dashboard");
assert.match(html, /id="storageButton"/, "local vault status must be visible from the dashboard");
assert.doesNotMatch(html, /class="[^"]*context-button[^"]*"/, "Context Pack must not return as a primary card action");
assert.match(app, /More ···/, "Result details must keep secondary actions behind More");
assert.match(app, /Original chat ↗/, "Original chat must remain a prominent action when source exists");
assert.match(app, /Continue in new chat ↗/, "Continuation must remain a prominent action");

// Explicit local user state must override catalog defaults, including false overriding a seeded true.
assert.match(app, /typeof localResult\.favorite === "boolean"/, "published/local merge must honor explicit local favorite state");
assert.doesNotMatch(app, /localResult\.favorite\s*\|\|\s*publishedResult\.favorite/, "favorite merge must not make published true impossible to unset");

console.log("DashGPT UI contract checks passed.");
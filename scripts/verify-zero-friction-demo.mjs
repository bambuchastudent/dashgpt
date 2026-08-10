import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEMO_DASHES,
  DEMO_RESULTS,
  defaultValueState,
  dismissPersistenceOffer,
  isDemoResult,
  isShowcaseMode,
  markPersistenceShown,
  recordConfirmedUserResult,
  shouldOfferPersistence
} from "../demo/zero-friction-demo.js";

const html = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../demo/zero-friction.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("../demo/zero-friction-ui.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../demo/app.js", import.meta.url), "utf8");
const proposal = readFileSync(new URL("../openspec/changes/f9-zero-friction-mobile-demo/proposal.md", import.meta.url), "utf8");
const impact = readFileSync(new URL("../openspec/changes/f9-zero-friction-mobile-demo/impact-manifest.md", import.meta.url), "utf8");

const heroEnd = html.indexOf('<details class="dashboard-tools">');
assert.ok(heroEnd > 0, "dashboard must keep secondary tools below the value-first surface");
const firstSurface = html.slice(0, heroEnd);

assert.match(firstSurface, /Важное из разговоров с ИИ — всегда под рукой/, "exact F9 hero title is required");
assert.match(firstSurface, /DashGPT превращает полезные итоги, решения и планы в карточки, которые легко найти и продолжить\./,
  "exact F9 hero subtitle is required");
assert.match(firstSurface, />Показать за 20 секунд</, "20-second demo CTA is required");
assert.match(firstSurface, />Сохранить разговор</, "human save-conversation CTA is required");
assert.doesNotMatch(firstSurface, /PRIVATE\s*•\s*LOCAL-FIRST/i, "technical privacy architecture must not lead the first screen");
assert.doesNotMatch(firstSurface, /LOCAL\s*·\s*NOT SYNCED/i, "sync state must not lead the first screen");
assert.doesNotMatch(firstSurface, /\bVault\b/i, "Vault terminology must not lead the first screen");
assert.doesNotMatch(firstSurface, /MCP/i, "MCP terminology must not lead the first screen");
assert.doesNotMatch(firstSurface, /immutable|verified|browser storage|local storage/i,
  "technical storage/integrity terminology must not lead the first screen");
assert.doesNotMatch(html, /No saved Dashes yet/, "legacy empty Semantic Dashes message must not appear in the demo flow");
assert.doesNotMatch(html, /\+ Add Result/, "legacy Add Result action must be removed from the dashboard shell");

assert.equal(DEMO_RESULTS.length, 5, "five expressive demo themes are required");
assert.deepEqual(new Set(DEMO_RESULTS.map(item => item.category)), new Set(["DashGPT", "Еда", "Поездки", "Дом", "Здоровье"]));
assert.deepEqual(DEMO_DASHES.map(item => item.title), ["Про DashGPT", "Что приготовить", "Поездки и планы"]);
assert.ok(DEMO_RESULTS.every(isDemoResult), "every demo Result must be explicitly presentation-only");
assert.doesNotMatch(ui, /putResult\(/, "F9 presentation controller must never persist demonstration Results directly");

assert.match(html, /id="demoStoryDialog"/, "deterministic story dialog is required");
assert.match(html, /id="closeDemoStoryButton"/, "story must be immediately closable");
assert.match(ui, /const STORY_STAGES = \[/, "story must be a deterministic local state machine");
assert.match(ui, /storyStep === STORY_STAGES\.length - 1/, "story must have a deterministic completion state");
assert.match(ui, /Теперь это можно найти и продолжить в любой момент\./, "story must finish with the continuation-value message");
assert.match(html, />Открыть карточку</, "story final open-card action is required");
assert.match(html, />Попробовать со своим разговором</, "story final try-own-conversation action is required");
assert.doesNotMatch(ui, /fetch\(|XMLHttpRequest|openai|anthropic/i, "demo story must not depend on a live AI/network request");

assert.match(ui, /detailSection\("Главное"/, "opened card needs Главное");
assert.match(ui, /detailSection\("Что решили"/, "opened card needs Что решили");
assert.match(ui, /detailSection\("Сейчас"/, "opened card needs Сейчас");
assert.match(ui, /detailSection\("Дальше"/, "opened card needs Дальше");
assert.match(ui, /Открыть исходный чат/, "existing Result source action must use human-facing copy");
assert.match(ui, /Продолжить разговор/, "existing Result continuation must use human-facing copy");
assert.match(css, /\.primary-gallery \.result-card \.favorite-button[^}]*display:none!important/s,
  "compact first-screen cards must hide favorite/internal controls");
assert.match(css, /\.primary-gallery \.result-card \.card-actions[^}]*display:none!important/s,
  "compact first-screen cards must open by card body rather than competing action buttons");

assert.match(html, /Вот что DashGPT сохранит/, "save flow must have the exact review heading");
assert.match(html, /id="prepareReviewButton"/, "save flow needs an explicit prepare-review action");
assert.match(html, /id="reviewStep" hidden/, "review must be a distinct pre-persistence state");
assert.match(ui, /if \(elements\.reviewStep\?\.hidden\)[\s\S]*event\.preventDefault\(\)[\s\S]*prepareReview\(\)/,
  "submission before review must be intercepted rather than persisted");
assert.match(ui, /recordConfirmedUserResult\(/, "only confirmed review submissions may advance persistence onboarding");

let state = defaultValueState();
assert.equal(shouldOfferPersistence(state), false);
state = recordConfirmedUserResult(state, "demo-food-salmon");
assert.equal(state.confirmedUserResultIds.length, 0, "demo cards must never count as own cards");
state = recordConfirmedUserResult(state, "user-1");
state = recordConfirmedUserResult(state, "user-2");
assert.equal(shouldOfferPersistence(state), false, "persistence offer must not appear before third own card");
state = recordConfirmedUserResult(state, "user-3");
assert.equal(shouldOfferPersistence(state), true, "third own card must trigger persistence offer");
state = markPersistenceShown(state);
assert.equal(shouldOfferPersistence(state), false, "shown offer must not nag immediately");
state = dismissPersistenceOffer(state);
for (let index = 4; index <= 7; index += 1) state = recordConfirmedUserResult(state, `user-${index}`);
assert.equal(shouldOfferPersistence(state), false, "dismissal must suppress the offer for four additional cards");
state = recordConfirmedUserResult(state, "user-8");
assert.equal(shouldOfferPersistence(state), true, "dismissal may repeat only after five additional cards");
assert.match(html, /Сохранить свою память\?/, "persistence sheet needs value-first title");
assert.match(html, /У тебя уже три полезные карточки\. Можно сохранить их надолго и открывать на других устройствах\./,
  "persistence sheet needs exact first-threshold explanation");
assert.match(html, />Сохранить мои карточки</, "persistence sheet needs functional save action");
assert.match(html, />Не сейчас</, "persistence sheet needs non-blocking dismissal");
assert.doesNotMatch(html.slice(html.indexOf('id="persistenceDialog"'), html.indexOf('id="storageDialog"')), /Google Drive|local storage|browser storage|Vault is not synced/i,
  "value-triggered persistence offer must not advertise unsupported/scary provider terminology");

assert.equal(isShowcaseMode("?showcase=1"), true, "showcase=1 must activate showcase mode");
assert.equal(isShowcaseMode("?showcase=0"), false);
assert.match(ui, /document\.body\.classList\.add\("showcase-mode"\)/, "showcase mode must be presentation-only");

assert.match(css, /body\{overflow-x:hidden\}/, "page-level horizontal overflow must be prevented");
assert.match(css, /@media\(max-width:620px\)/, "narrow-mobile contract is required");
assert.match(css, /min-height:44px/, "primary touch targets need at least 44 CSS pixels");
assert.match(css, /100dvh/, "mobile dialogs/sheets must use dynamic viewport height");
assert.match(css, /env\(safe-area-inset-bottom/, "mobile flow must respect bottom safe area");

// Collision guard: F9 must consume the current continuation contract instead of redesigning it.
assert.match(app, /function continuationText\(result\)/, "existing continuationText contract must remain present");
assert.match(app, /function continuationUrl\(result\)/, "existing continuationUrl contract must remain present");
assert.match(impact, /Do not modify `continuationText`, `continuationUrl`/, "Impact Manifest must preserve the continuation collision guard");
assert.match(proposal, /Structured Chat Continuation/, "proposal must keep Structured Chat Continuation explicitly out of scope");

console.log("DashGPT F9 zero-friction mobile demo checks passed.");

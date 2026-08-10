## 1. OpenSpec and Existing Surface Gate

- [x] 1.1 Inspect current dashboard shell, Result cards/details, Semantic Dashes, Semantic Gallery UX, local save path, storage management, and current verification scripts.
- [x] 1.2 Review Feature 7 and Feature 8 boundaries and keep Structured Chat Continuation out of F9.
- [x] 1.3 Add proposal, UX design, spec delta, tasks, and compact Impact Manifest.
- [ ] 1.4 Check Serena and Graphify availability/configuration and record whether they are used or unavailable; do not add runtime dependencies.
- [ ] 1.5 Run strict OpenSpec validation for `f9-zero-friction-mobile-demo` before production-code edits.

## 2. Value-first First Screen

- [ ] 2.1 Replace technical first-screen header/status with the exact compact hero and human-facing CTAs.
- [ ] 2.2 Add deterministic non-user demo Results for DashGPT, food, travel, home, and health and three required demo Dashes.
- [ ] 2.3 Remove empty Semantic Dash state and technical storage/immutable/Vault copy from the main first-run flow while retaining management access outside the value path.
- [ ] 2.4 Reuse existing Semantic Gallery hue/group/order behavior for the combined presentation board without changing domain semantics.

## 3. Twenty-second Demo Story

- [ ] 3.1 Add deterministic `chat -> card -> details -> neighborhood -> complete` story with no AI/auth/keyboard dependency.
- [ ] 3.2 Make the story immediately closable/skippable and preserve the interactive board after close/completion.
- [ ] 3.3 Add final actions `Открыть карточку` and `Попробовать со своим разговором` and final continuation-value message.
- [ ] 3.4 Add `showcase=1` presentation state without persisting demo objects.

## 4. Card and Save UX

- [ ] 4.1 Simplify first-screen card content to theme, title, short summary, relevance/recency, and semantic color; preserve one-tap card body opening.
- [ ] 4.2 Reorganize primary opened-card content into `Главное`, `Что решили`, `Сейчас`, `Дальше`, source-chat action, and continuation action; hide technical metadata on this surface.
- [ ] 4.3 Rename creation action to `Сохранить разговор` and implement capture/import preparation followed by `Вот что DashGPT сохранит` review.
- [ ] 4.4 Require explicit review confirmation before Result persistence/activity/counting and render the confirmed card through existing semantic grouping.

## 5. Value-triggered Persistence

- [ ] 5.1 Add versioned presentation state tracking only explicitly confirmed user Result IDs/count; exclude demo/published seed data.
- [ ] 5.2 Show the non-blocking persistence bottom sheet at confirmed card 3 with exact primary copy/actions.
- [ ] 5.3 Persist `Не сейчас` suppression and repeat only after five additional confirmed user cards.
- [ ] 5.4 Route `Сохранить мои карточки` only to currently functional persistence management and suppress unsupported-provider promises in the F9 flow.

## 6. Mobile Investor Mode

- [ ] 6.1 Enforce 360px no-horizontal-overflow layout, >=44px primary touch targets, compact hero, and immediately visible populated-board content.
- [ ] 6.2 Ensure dialogs/sheets use mobile-safe viewport behavior and the demo story needs no keyboard.
- [ ] 6.3 Verify obvious return-to-board behavior from dialog and standalone Result presentation.

## 7. Deterministic Verification

- [ ] 7.1 Add `scripts/verify-zero-friction-demo.mjs` covering hero copy, forbidden first-screen terminology, demo/user separation, review-before-save, threshold 3/+5, showcase handling, card/detail labels, and mobile contracts.
- [ ] 7.2 Add `npm run verify:fast` and `npm run verify:full`; retain `npm run check` as the full-suite compatibility alias.
- [ ] 7.3 Run `npm run verify:fast` during implementation and fix all failures.
- [ ] 7.4 Run strict OpenSpec validation again after final spec/task updates.
- [ ] 7.5 Run exactly one final `npm run verify:full` after implementation is frozen and before opening the PR.

## 8. PR and Preview Evidence

- [ ] 8.1 Review exact F9 diff against the Impact Manifest and prove continuation/Vault/domain collision guards were not changed.
- [ ] 8.2 Open a dedicated PR to `develop` linking `openspec/changes/f9-zero-friction-mobile-demo` and record fast/full/OpenSpec evidence.
- [ ] 8.3 Check the deployed branch/PR production preview at 360px mobile viewport, a mobile-Safari/WebKit-style viewport, and desktop; record overflow/touch/first-render findings.
- [ ] 8.4 Record the grandmother-test checklist in the PR. Mark real-human results pending unless an uninstructed human actually performs the test; do not fabricate acceptance evidence.

## Acceptance Checklist

- [ ] First screen contains neither `LOCAL · NOT SYNCED` nor technical storage terminology.
- [ ] Gallery is immediately populated with expressive demo cards and required demo Dashes.
- [ ] `Показать за 20 секунд` works without setup and can be closed/skipped.
- [ ] `Add Result` is replaced by `Сохранить разговор`.
- [ ] Save flow shows review before persistence.
- [ ] Confirmed card appears through semantic grouping.
- [ ] Persistence offer first appears after three own cards; demo cards do not count.
- [ ] Dismissal does not block and does not nag before +5 cards.
- [ ] 360px, mobile Safari/WebKit-style, and desktop preview checks are recorded.
- [ ] Strict OpenSpec, fast verification, and one final full verification pass.
- [ ] Grandmother-test record is present in PR with truthful human-test status.

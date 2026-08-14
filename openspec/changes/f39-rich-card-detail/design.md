# F39 design — rich canonical card detail

## Context

F36 reuses the existing `/api/shared-chat` resolver and stores the normalized Share URL as canonical provenance. Its browser capture code currently calls `cleanText()` on reply statements, which collapses all whitespace, and chooses the last assistant reply wholesale as `summary`. The card renderer in `demo/app.js` then assigns that summary to `textContent` in both modal and standalone detail.

This change fixes projection/presentation. It does not add a second resolver or a new storage model.

## Content pipeline

```text
shared-chat visible assistant reply
  -> normalize line endings
  -> strip internal provider render/reference markers
  -> preserve meaningful blank lines
  -> extract explicit Decisions / Решения section when present
  -> extract explicit Next / Следующий шаг section when present
  -> remaining body becomes reviewable summary
  -> existing user review/edit
  -> existing canonical-card persistence
```

Extraction is deliberately explicit rather than inferential. F39 recognizes section headings/strong labels that unambiguously name Decisions or Next in English/Russian and consumes their following body until another recognized section. It may normalize bullet markers for structured arrays. It must not infer a decision from arbitrary prose such as “готово” or “мы сделали X”.

If extraction would leave an empty summary, the cleaned original body remains the summary and structured fields stay conservative.

## Safe rich-text rendering

Add a small DOM renderer that never assigns captured card text to `innerHTML`.

Supported block subset:

- paragraphs;
- `#`-style headings mapped into detail-safe heading levels;
- unordered lists (`-`, `*`, `+`);
- ordered lists;
- blank-line separation.

Supported inline subset:

- `**strong**` / `__strong__`;
- `*emphasis*` / `_emphasis_`;
- inline backtick code;
- Markdown links with `http:` or `https:` targets only.

Unsupported markup remains readable text. Unsafe/non-http(s) Markdown links render as label text, not anchors. Links use `target=_blank` and `rel="noopener noreferrer"`.

The renderer is shared by the modal and standalone card detail. Compact gallery cards remain plain excerpts; this change does not turn the gallery into a document renderer.

## Internal marker cleanup

Provider UI/reference markers encoded using ChatGPT render-control delimiters (for example `memcite`) are presentation artifacts, not durable user memory. They are removed from link-first prepared content and are also removed at render time so already-saved affected cards become readable without a destructive Vault migration.

The cleanup is presentation/content normalization only. Ordinary Markdown URLs and human text remain intact.

## Structured detail blocks

Modal and standalone detail render `Decisions` only when the card contains one or more non-empty decisions and render `Next` only when a non-empty next step exists. They no longer synthesize `No decisions captured yet.` or `No next step captured yet.` as visible product content.

Existing Context Pack / Structured Continuation behavior continues to represent missing fields as missing rather than being mutated by display logic.

## Compatibility boundaries

- Preserve canonical Share URL identity and repeat-capture update semantics from F36.
- Preserve current Vault schema and version behavior.
- Preserve existing structured JSON handoff parsing.
- Preserve search/Dash/semantic-gallery consumers of `summary`, `decisions`, `next`.
- Preserve continuation ownership in `demo/continuation.js`.
- Do not alter shared-chat backend fetch/parser ownership.
- Do not add a Markdown dependency or allow captured HTML/script execution.

## Verification design

Deterministic tests cover cleanup, section extraction, link safety and DOM shape. Save-chat browser coverage adds a mocked Share response containing the escaped F36-style Markdown/internal marker case, then asserts saved structured fields and detail presentation. Existing F36 duplicate/source/fallback/provider/mobile regressions remain in scope. Production preview is checked at desktop and 360px width.

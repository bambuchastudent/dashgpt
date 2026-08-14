# F39 — Rich canonical card detail

## Why

F36 made ChatGPT Share links the primary Save-chat input, but the resolved conversation is currently projected into a card by taking the final assistant reply as a flattened plain string. The card detail then renders that string with `textContent`.

That escaped production-shaped UX has three visible consequences:

- useful Markdown appears literally instead of as readable structure;
- newlines are destroyed before save, so paragraphs/lists collapse into a wall of text;
- ChatGPT internal render/reference markers can leak into the saved/displayed card.

The detail UI also always renders `Decisions` and `Next` placeholder blocks even when those fields are absent, which makes a valid but unstructured capture look like a failed distillation.

A canonical card should be readable without reopening the source chat and should preserve explicit structure without inventing facts that are not present.

## What changes

- Introduce a small provider-neutral card-content utility for cleaning, structuring and safely rendering card summary text.
- Preserve line/block structure from public Share assistant replies.
- Remove provider-internal UI/reference markers from card content.
- Extract explicit `Decisions` / `Решения` and `Next` / `Следующий шаг` sections when the final assistant reply contains them, and remove those extracted sections from the summary body to avoid duplication.
- Render a bounded Markdown subset in modal and standalone card detail without assigning untrusted content to `innerHTML`.
- Omit empty Decisions/Next detail blocks instead of presenting synthetic negative placeholders.
- Keep card/Vault identity, source provenance, duplicate-by-Share-URL behavior, Dashes/search, continuation and the structured JSON fallback unchanged.

## What does not change

- No new card schema or migration.
- No LLM call or invented decision extraction.
- No change to `/api/shared-chat` transport/parsing ownership.
- No change to Google Drive/GitHub sync semantics.
- No change to bulk ChatGPT history import.
- No rewrite of unrelated legacy `Result` compatibility vocabulary.

## Success

A linked-chat card containing bold/code/link/list/heading Markdown renders as readable structured content; only safe `http(s)` links become anchors; internal ChatGPT markers are absent; explicit decisions/next are projected into their card fields; missing decisions/next do not produce empty placeholder panels; existing source/continuation behavior remains intact on desktop and 360px mobile.

Issue: #97
Target: `develop`

# F36 design — link-first Save chat

## Context

F27 owns the existing-user Save-chat dialog, local-first persistence, review step and optional Google Drive/GitHub controls. The same repository already exposes `/api/shared-chat`, which normalizes and retrieves public ChatGPT Share conversations through the hardened resolver chain.

The UX problem is therefore orchestration, not a missing parser or a missing storage model.

## Flow

```text
+ Сохранить чат
  -> first field: ChatGPT link
  -> normalize supported ChatGPT Share URL
  -> GET /api/shared-chat?url=...
  -> derive review title + concise summary
  -> review/edit title + summary
  -> save/update canonical local card
  -> optional existing provider sync
```

The prior structured handoff remains below this primary path as a fallback:

```text
can't / don't want to use Share link
  -> copy DashGPT command
  -> paste structured JSON response
  -> existing review/save path
```

## URL behavior

Supported primary input is a public ChatGPT Share URL on `chatgpt.com` or `chat.openai.com`, including the compatibility forms already accepted elsewhere in DashGPT.

A private authenticated conversation URL such as `https://chatgpt.com/c/...` cannot be fetched by the existing public resolver without the user's ChatGPT session. It must therefore produce a human instruction to press ChatGPT **Share** and paste the resulting Share link. It must not fall through to raw 4xx/5xx/fetch/parser text.

## Card identity and duplicate behavior

The resolved canonical Share URL is the stable source identity for this capture path.

Before creating a card, the Save-chat flow searches the materialized local cards for `source.type === "chatgpt-share"` with the same canonical `source.url`.

- No match: create one new canonical card using existing Vault functions.
- Match: reuse that card id and write the newly reviewed content as the current card representation rather than appending a second user-visible card.

No new Vault field or parallel source index is introduced.

## Prepared card

The public resolver already returns conversation title and visible replies. The primary flow derives:

- title: resolver title, bounded for the existing card UI;
- summary: last useful assistant reply, with a final visible reply fallback;
- category: `Мои чаты` unless the fallback structured envelope provides a more specific category;
- tags: at minimum provenance tags for ChatGPT/share; existing semantic consumers continue operating on canonical card fields;
- source: `{ type: "chatgpt-share", url: canonicalShareUrl, title }`.

The user can edit title and summary in the existing review section before saving.

## Failure states

The UI maps failures into product language:

- invalid/non-ChatGPT URL -> ask for a ChatGPT Share link;
- private `/c/...` URL -> explain how to obtain a Share link;
- unreadable public Share -> say the public conversation could not be read and keep the fallback handoff available;
- resolver/network failure -> generic retry message without raw backend implementation details.

The dialog remains open and no card is written on resolution failure.

## Compatibility constraints

- Do not alter Google Drive/GitHub controller ownership.
- Do not insert awaited work before the delegated Google connect click; F26 Safari user activation must remain intact.
- Do not change bulk history/export importer semantics.
- Do not reopen the generic Add Result form for the personal Save-chat action.
- Preserve 360px no-horizontal-overflow behavior.

## Verification

Add deterministic/browser regression coverage for:

- link field appears before structured handoff controls;
- successful Share resolution and save;
- canonical source URL;
- duplicate-free repeat capture;
- private `/c/...` human error;
- existing JSON fallback;
- provider controls/Safari click delegation remain working;
- 360px layout.

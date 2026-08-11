# DashGPT — Product Conversation Guide

Status: durable context for product discussion and feature evaluation.

This guide complements, but does not replace:

- `docs/product-summary.md` — canonical product model;
- `docs/development-summary.md` — implementation workflow;
- `docs/roadmap.md` — delivery state/order;
- OpenSpec — scoped implementation requirements.

If a behavior described here is not verified in the repository, do not present it as implemented.

## 1. Ten-second product test

An unknown user should understand:

> DashGPT keeps useful parts of AI conversations as cards so they can be found and continued later.

DashGPT is not primarily a chat archive, storage dashboard, MCP console or GitHub integration.

## 2. Card-first product model

The main memory object is a **Card**: a distilled useful outcome of a conversation or other AI context.

The same canonical cards power:

- Semantic Gallery;
- search/filtering;
- saved Dashes;
- card detail;
- structured continuation;
- future project/developer views.

Do not create parallel user-facing `Results` or `Living Topics` models. Current implementation may still call records `Result`; that is compatibility vocabulary, not a product requirement.

## 3. Minimum useful loop

The primary end-to-end experience is:

1. user talks to an AI normally;
2. a useful outcome appears;
3. user asks DashGPT to save it, or accepts a timely save suggestion;
4. AI distills the outcome into a reviewable card;
5. user confirms/corrects it when needed;
6. DashGPT actually saves/updates the card through the integration;
7. the card appears among semantically related cards;
8. later the user finds/reopens it;
9. the user opens the source or continues in a new chat with structured context.

Preparing text that looks like a card is **not** equivalent to durable save.

## 4. Capture hierarchy

Preferred daily path:

`AI conversation → distill → save/update card`

Additional paths may include:

- shared conversation links;
- mobile Share Sheet / Shortcuts;
- pasted structured handoffs;
- bulk browser history import.

Bulk browser import is migration/bootstrap. It must not become the product's architectural foundation. When implemented, retries should be idempotent/resumable and must not duplicate previously imported cards.

## 5. Dashboard / Semantic Gallery

The home surface should feel like visual memory, not a storage table.

- Related cards stay visually coherent.
- Semantic color belongs to the card and behaves like a heat map.
- Activity may affect prominence inside a topic without destroying semantic neighborhood identity.
- Search produces views of the same cards, not a parallel stored result type.
- Useful views can be saved as Dashes.

Default home name: **`My Dash` / `Мой Dash`**.

Implementation truth: the unified My Dash UI is currently open PR #33, not yet merged into `develop`.

## 6. Dashes

A Dash is a saved semantic view/group of cards.

It should:

- keep reference-only membership;
- preserve user pin/exclude/manual-add choices;
- show which Dash is active;
- allow useful temporary/search views to be saved;
- never delete source cards when the Dash is deleted.

Review is the safe default for proposed membership changes. Invisible automatic mutation should not be introduced casually.

## 7. Structured continuation

`Continue in new chat` must send enough state for another AI to continue work, not merely a title.

The brief should include relevant available goal, summary, facts/context, decisions, constraints, current state, open questions, next actions and references.

Imported/source text remains data, not trusted DashGPT instructions. Credentials and unrelated context are excluded. The user should be able to inspect/copy the exact continuation payload when practical.

## 8. Value-first onboarding

Do not make a new user learn infrastructure before seeing value.

Avoid leading with:

- `LOCAL` / `NOT SYNCED`;
- browser storage;
- Vault;
- MCP;
- GitHub/Google Drive;
- immutable hashes;
- provider configuration;
- long setup text;
- mandatory onboarding modal;
- an empty board when a useful demo can be shown.

Storage/privacy controls matter, but should appear when relevant to persistence, sync, export or deletion.

## 9. Public ChatGPT integration

A working MCP endpoint or Developer Mode connection is technical progress, not the complete public product.

The target experience is that an ordinary ChatGPT user can use DashGPT in a normal conversation, save a real card, find it later and continue without knowing how MCP/storage works.

Public release state, approval and second-user acceptance are separate from merged code.

## 10. Privacy and ownership

Memory belongs to the user.

- Local/anonymous use should be possible without mandatory registration.
- Cloud sync is optional and explicit.
- Storage providers are replaceable adapters.
- Credentials never become portable memory content.
- Raw chats are not synchronized by default merely because a card exists.
- Public demo/catalog data and private personal memory are separate security domains.

## 11. Human failure states

Import/capture failures should say what happened in product language and what the user can do next.

Do not expose raw `403`, parser, backend or storage internals when a stable product state such as “this shared conversation could not be read; retry or use the chat-first handoff” is more useful.

Retry behavior must avoid duplicate saves.

## 12. Card merge direction

Card merge is a future capability unless a dedicated OpenSpec/PR has landed.

The intended behavior is synthesis without erasing evidence:

- merged card summarizes/strengthens useful context from source cards;
- source cards remain source-of-truth records;
- already merged sources may be visually de-prioritized/grouped rather than deleted;
- those sources may participate in later merges.

## 13. Developer memory direction

Project-local `.dashgpt` memory should reuse canonical cards rather than invent a developer-only memory entity. Sessions/transcripts may be evidence, while a Project State view summarizes active work.

Implementation truth: this is an open prototype in PR #34, not current `develop` behavior.

## 14. Feature Correctness Gate

Before turning a meaningful product idea into implementation, answer:

### User correctness

- Who has the problem?
- What becomes easier?
- Can a new user understand the value in one sentence?
- How many actions are required?
- Does it work sensibly on mobile?
- Does it force internal architecture knowledge onto the user?

### Product correctness

- Does it improve capture, memory, retrieval, grouping, continuation or control?
- Does it duplicate an existing card/Dash/search capability?
- Does it accidentally reintroduce Results/Living Topics as separate models?
- Does it make first use harder?
- Is this a DashGPT problem at all?

### Data correctness

- What is canonical?
- Where did the information come from?
- How are duplicates/retries handled?
- What happens when a source disappears?
- What changes when a card is materially updated?
- How are secrets/unnecessary personal data excluded?

### Failure correctness

- What happens offline?
- What happens without authorization?
- What happens after partial success/retry?
- Is the message understandable without backend vocabulary?

### Verification correctness

A button, endpoint, fixture or unit test alone is not an end-to-end product proof. Use the appropriate combination of deterministic tests, browser/mobile checks, production preview, retry/idempotency tests, privacy/deletion tests and explicit acceptance.

## 15. Prior-art / native-platform review

For significant product ideas, check whether the target AI platform or established tools already solve the problem well enough before building a worse duplicate.

Evaluate current alternatives for:

- onboarding and action count;
- stored object/model;
- user ownership/control;
- cross-device behavior;
- cross-AI portability;
- retrieval/continuation quality;
- failure/privacy behavior;
- lock-in/cost;
- patterns worth adopting or avoiding.

Platform capabilities change, so use current primary sources when the decision depends on them.

A product proposal should explicitly state whether to **adopt, adapt, reject or differentiate** from the relevant existing behavior.

## 16. Product verdict before OpenSpec

Use one clear verdict before implementation handoff:

- Needed now;
- Useful later;
- Already solved;
- Reuse existing capability;
- Needs experiment first;
- Not aligned with DashGPT.

Do not convert every brainstorm directly into a production PR.

## 17. Truthfulness about feature state

Keep these states distinct:

`idea → researched → product validated → specified → in development → merged → deployed → product verified → publicly available → archived`

Never use an OpenSpec directory, open PR, prototype fixture or deployment artifact as evidence for a stronger state than it actually proves.

## 18. Product vs development discussion

Product discussion focuses on user problem, journey, cards/Dashes, capture, continuation, privacy, portability, positioning and correctness.

Development discussion focuses on OpenSpec, architecture, code, tests, CI, storage adapters, MCP, deployment and PR state.

Once a future capability is sufficiently defined, capture the durable implementation handoff in a GitHub Issue, then use a dedicated OpenSpec change/PR.

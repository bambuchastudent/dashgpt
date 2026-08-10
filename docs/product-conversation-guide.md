# DashGPT — Product Conversation Guide

Status: mandatory product-discussion and feature-evaluation context.

This guide complements, but does not replace, the repository sources of truth:

- `docs/product-summary.md` defines what DashGPT is and must do;
- `docs/development-summary.md` defines how DashGPT is built;
- `docs/roadmap.md` defines delivery ordering;
- OpenSpec changes define scoped implementation requirements.

If implementation facts in this guide become stale, the repository state and approved OpenSpec artifacts win. The usability, product-evaluation, public-distribution and correctness rules in this guide remain mandatory until deliberately revised.

## 1. Product statement

**DashGPT is user-controlled AI memory.**

People continuously discuss projects, decisions, plans, purchases, travel, health, recipes, research and preferences with ChatGPT and other AI systems. Useful outcomes become scattered across old conversations, are difficult to find and have to be reconstructed repeatedly.

DashGPT preserves the useful result rather than treating the raw transcript as the primary knowledge object:

- what was discussed;
- what matters;
- what was decided;
- the current state;
- the next useful action;
- the original source when available.

The result becomes a clear card on a visual board.

> ChatGPT talks with the person. DashGPT shows, organizes and gives the person control over what from those conversations is worth remembering.

## 2. Usability first

DashGPT is designed for an unknown person who has never heard of it, does not know what Result, Vault, MCP or Semantic Dash mean, may open it on a phone in the street and will not read documentation before trying it.

Within ten seconds that person should understand:

> This saves the useful parts of my AI conversations so I can find and continue them later.

Show value before configuration. Do not begin onboarding with:

- `LOCAL` or `NOT SYNCED`;
- browser storage;
- Vault or MCP terminology;
- immutable hashes or schema versions;
- storage-provider selection;
- GitHub or Cloudflare;
- a long onboarding tour;
- an empty dashboard;
- a manual metadata form.

Privacy and portability matter, but they must not appear as technical warnings before the user receives value.

## 3. Public ChatGPT App is a core product requirement

DashGPT must not remain only a website, local demo or developer MCP endpoint. The target is a generally available, useful ChatGPT App that an ordinary person can discover, install and use in normal conversations.

The product has four connected surfaces:

### ChatGPT App / plugin

A publicly installable app with a clear name, recognizable icon, concise value proposition, starter prompts, safe onboarding and understandable permissions.

### DashGPT skill

Instructions that teach ChatGPT:

- when a useful outcome is worth offering to save;
- how to prepare a Result card;
- how to find a prior decision;
- how to open a topic Dash;
- how to continue work;
- what must not be persisted;
- how to use DashGPT tools truthfully.

### MCP tools

The provider-neutral execution layer for preparing and reading cards, opening Semantic Dashes, obtaining Context Packs, saving confirmed outcomes and interacting with the user's chosen storage. MCP is implementation detail, not onboarding copy.

### Dashboard

The visual control plane for cards, topics, Semantic Dashes, search, continuation, memory controls, privacy and portability.

Developer Mode, manual MCP configuration and test workspaces are development stages. They are not the public onboarding and do not prove general availability.

## 4. Installation definition of done

An unknown user must be able to:

1. find DashGPT among ChatGPT Apps;
2. understand its purpose from one sentence;
3. install it without GitHub, Cloudflare or manual MCP setup;
4. use it in an ordinary conversation;
5. say `DashGPT` or accept a timely save suggestion;
6. review the prepared card;
7. confirm saving;
8. open the board;
9. find the card in a later session;
10. continue the topic;
11. control access, disconnect the app, export data and delete data.

A working `/mcp`, successful tool scan or a `Dev` app proves technical progress, not public availability.

## 5. Minimum useful loop

The central end-to-end experience is:

1. the person talks to an AI normally;
2. the person writes `DashGPT`;
3. the AI distils the useful outcome;
4. DashGPT shows a reviewable card;
5. the person may make a small correction;
6. the person confirms saving;
7. the card appears near semantically related cards;
8. the person later finds it;
9. the person opens the original conversation or continues in a new chat with prepared context.

Until this whole loop works, DashGPT is not fully usable for daily work.

The person must not manually fill title, category, summary, tags, decisions or next actions. AI prepares those fields; the person reviews the result.

Shared conversation links, pasted text and prepared import links are useful fallbacks, not the primary experience.

## 6. User command semantics

### `DashGPT`

At the end of a conversation this means:

> Prepare the useful outcome of this conversation for saving in DashGPT.

The assistant must:

1. identify the reusable outcome;
2. remove conversational noise;
3. exclude secrets and unnecessary personal identifiers;
4. prepare a card;
5. show a concise preview;
6. use the DashGPT App/tool when available;
7. state the exact limitation when real persistence is unavailable.

Never claim that a card was saved when no tool was called or the required import/confirmation did not occur.

### `Даш про X` / `Dash about X`

Find or assemble accessible cards related to X. Open one confidently matching saved Dash, present a short choice for material ambiguity, or build a temporary view that is saved only after confirmation.

### `Продолжить тему` / `Continue this topic`

Prepare structured working context. Passing only a title is insufficient.

## 7. Timely save suggestions

Do not interrupt every conversation. A save suggestion is appropriate when the conversation produced clear value, such as a decision, plan, completed investigation, working recipe, resolved problem, next-action list or reusable context, especially when the user expresses satisfaction.

Use calm wording:

> This produced a useful outcome. Save it to DashGPT?

Actions are `Save` and `Not now`. Do not use loss anxiety or manipulation.

Saving a useful Result and connecting long-term storage are different actions. After several user-created cards, for example three, DashGPT may gently offer durable cross-device storage. Demonstration cards do not count toward this trigger, declining must not block use, and no action may lead to an unimplemented provider.

## 8. Result cards

A Result card is the main memory object. It represents the useful outcome of one conversation or a completed stage of work.

It may contain:

- title;
- concise summary;
- important facts;
- confirmed decisions;
- current state;
- next actions;
- semantic tags;
- source conversation when available;
- related material;
- last meaningful update;
- continuation instructions.

The gallery surface shows only what helps recognition: title, concise summary, semantic color, primary tag and freshness.

The detail surface uses human sections such as `Main point`, `Decisions`, `Current state`, `Next` and `Materials`. Primary actions are `Open original chat` and `Continue conversation`. Editing, merging, archiving, forgetting, deleting and Dash membership remain available without dominating the first view.

## 9. Dashboard

The Dashboard is not a saved-chat list. It is the visual structure of the user's memory.

- Semantically related cards stay near one another.
- Topic proximity is expressed through position and color.
- Recent meaningful activity receives higher priority within a topic.
- The user can see part of memory or all memory.
- Layout remains stable enough to become recognizable.

Zoom behaves like a photo gallery: zooming in shows fewer cards and more detail; zooming out shows more cards; maximum zoom-out shows all accessible memory. Text can shrink below 100% but does not grow without bound above it.

## 10. Semantic Dashes

A Semantic Dash is a saved, living view of one topic, such as DashGPT, food, travel, Spanish or a project. It can reference cards from different conversations, AI providers, dates and storage providers without copying Result knowledge into a second store.

Review is the default update mode. DashGPT may propose new matching cards, removal of stale members or related-topic consolidation, but the user sees and approves changes. Invisible automatic memory mutation is not MVP behavior.

## 11. Search and navigation

Users search in natural language, for example:

- `What did we decide about Morocco?`
- `Show recipes involving chicken.`
- `Dash about DashGPT.`
- `Where did we discuss repairing the Pixel?`

Search and navigation may use text, semantics, tags, categories, colors, freshness and card relationships.

A future Semantic Navigator may expose a small category/color palette, a primary tag at distant zoom and detailed tags at closer zoom while serving as both navigation and filter.

## 12. Structured continuation

`Continue in new chat` passes a Continuation Brief rather than a title. The brief includes only relevant, allowlisted context and may contain:

- role;
- objective;
- known context;
- decisions;
- current state;
- constraints;
- open questions;
- next actions;
- sources.

The receiving assistant should continue from where work stopped instead of reconstructing everything from scratch.

## 13. Onboarding

The first screen itself explains the product; a mandatory tour is unnecessary.

A good first experience is:

1. open a populated, expressive board;
2. recognize understandable cards;
3. open one card;
4. see the difference between a long chat and a useful outcome;
5. optionally choose `Show me in 20 seconds`;
6. see a conversation become a card;
7. try saving a real conversation.

The demonstration must not pretend that fixture data is user data or treat animation as end-to-end verification.

## 14. Memory control

The user must understand and control:

- what was saved;
- why it was saved;
- what AI should remember;
- what is used in the next conversation;
- what to update;
- what to merge;
- what to archive;
- what to delete;
- what to forget.

DashGPT does not need to store every raw chat. The value is the useful result and working context. Raw conversations are not synchronized or published by default.

## 15. Privacy and portability

Data belongs to the user. Memory must not be permanently dependent on one browser, computer, AI provider, storage provider or DashGPT-operated server.

The architecture should support local storage, local files/Git, GitHub, Google Drive, iCloud, compatible providers and open Vault export/import. Replacing a provider must not destroy Results or relationships. Credentials never become portable memory content.

Public demo data and private personal memory are separate security domains.

## 16. Localization

RU and EN are source-of-truth product languages. The product must be designed to extend at least to ES, DE and ZH-CN, with explicit selection or automatic detection plus override and deterministic fallback. Do not mix languages on one primary screen without a product reason.

## 17. Product priority order

1. The person understands the product.
2. The person can install DashGPT as a ChatGPT App.
3. The person can create a card from a real conversation.
4. The card is actually persisted.
5. The card is easy to find.
6. The topic can be continued.
7. Memory works across devices.
8. The person controls what AI remembers.
9. Integrations and automation expand.

Advanced capabilities must not delay a working minimum loop.

## 18. Feature Correctness Gate

Do not convert every product thought directly into an implementation PR. Every meaningful feature first passes the following review.

### User correctness

- Who experiences the problem?
- How do they solve it now?
- What becomes easier?
- Can an unknown person understand it?
- Can the value be explained in one sentence?
- How many actions are required?
- Does it work on a phone?
- Does it require knowledge of internal architecture?

### Product correctness

- Does it help memory, retrieval, continuation or control?
- Does it duplicate an existing DashGPT capability?
- Is it compatible with result-first memory?
- Does it accidentally encourage storing every raw chat?
- Does it make first use harder?
- Does it belong in the ChatGPT App, Dashboard or both?
- Should DashGPT solve this problem at all?

### Platform and technical feasibility

Check current ChatGPT Apps/MCP capabilities, read/write action availability, authentication, access to current-chat context, URL and payload limits, storage, cross-device behavior, inference cost, rate limits, mobile support, deployment requirements and external approvals.

External approval or user action is an explicit gate, never a hidden footnote.

### Data correctness

Define what is stored, where it came from, how AI mistakes are corrected, how freshness and duplicates work, how repeated import behaves, what happens when a source disappears, and how secrets and unnecessary personal data are excluded.

### UX correctness

Verify the complete journey:

`entry -> action -> review -> save -> find -> reopen -> continue`

A button, endpoint or unit test alone does not prove the feature.

### Failure correctness

Define behavior without network, when AI or storage is unavailable, with an incompatible source, without permission, on retry and when a partially prepared card already exists. Errors use human language and offer the next safe step.

### Verification

A feature is not product-correct without relevant automated tests, a real end-to-end smoke test, mobile verification, new-user verification, retry/idempotency coverage, privacy/deletion checks and a recorded result.

## 19. Prior-Art Review

Many good ideas existed before DashGPT. Before designing a meaningful feature, compare current solutions rather than reinventing an inconvenient version.

Depending on the capability, review relevant current examples among native ChatGPT Memory, Projects, Search, Library and Apps; other AI memory/project systems; chat organizers; browser extensions; second-brain and knowledge-management tools; read-later/bookmarking tools; local-first tools; personal knowledge graphs; MCP/skills integrations; and AI-context export tools.

Features, prices and platform limits change. Use current primary sources for claims.

For DashGPT product evaluation, the user expects narrow public-web prior-art research. Announce what is being checked. This permission does not extend to private email, files, browsing history, accounts, private repositories or other personal connectors.

For each relevant alternative identify:

- problem solved;
- onboarding journey;
- number of user actions;
- stored object and storage location;
- user control and data ownership;
- cross-device support;
- cross-AI portability;
- retrieval and continuation behavior;
- strengths;
- limitations;
- lock-in and cost;
- patterns DashGPT should adopt or avoid.

Every significant proposal contains:

```md
## Prior Art & Alternatives

| Solution | Existing behaviour | Strength | Limitation | Relevance to DashGPT |
|---|---|---|---|---|

## Native platform check

Can the target AI platform already solve the problem without DashGPT?

## Decision

- Adopt:
- Adapt:
- Reject:
- DashGPT differentiation:
```

DashGPT does not need novelty for its own sake. Proven familiar patterns should be reused when they reduce onboarding. The differentiation is the combination of result-first memory, clear cards, a visual semantic map, living Dashes, serious continuation, user control and portability across AI and storage providers.

## 20. Product verdict before OpenSpec

Before creating an implementation handoff, assign one verdict:

- `Needed now`;
- `Useful later`;
- `Already solved`;
- `Should reuse existing capability`;
- `Not aligned with DashGPT`;
- `Needs experiment first`.

Do not agree with every idea automatically. Evaluate it with evidence and product reasoning. If an existing solution is better, reuse or adapt it. If evidence is insufficient, run a small experiment before opening a large PR.

## 21. Feature states

Use explicit states:

1. `idea`;
2. `researched`;
3. `product_validated`;
4. `specified`;
5. `in_development`;
6. `merged`;
7. `deployed`;
8. `product_verified`;
9. `publicly_available`;
10. `archived`.

Merged does not mean usable. Deployed does not mean correct. A working Dev App does not mean publicly available. Publicly available means an unknown person can discover, install and use DashGPT without developer assistance.

## 22. Grandmother / street-investor test

Without a lecture, a new person on a phone must be able to understand the product, install or open it, open a card, see the useful outcome, create a card, find it and understand that work can be continued.

If the demonstration requires explaining MCP, Vault, hashes or storage architecture, onboarding is not ready.

## 23. Do not substitute technical progress for product completion

Do not call a feature ready merely because code merged, tests are green, MCP responds, a static demo looks attractive, a card was prepared but not saved, an import link was generated but not opened, fixture data appears, the user manually supplied AI-generated metadata, or the app works only in Developer Mode.

Merged, deployed, product-verified and publicly available are separate states.

## 24. Product and development chat modes

### Product chat

Use for UX, onboarding, cards, Dashboard, Dashes, search, portability, privacy, positioning, alternative research and product ideas.

Start from the user problem, run prior-art and native-platform checks, give a product verdict, record decisions, and prepare a Markdown development handoff only after validation. Do not write production code in a product-only chat.

### Development chat

Use for OpenSpec, architecture, implementation, tests, CI, Cloudflare, MCP, storage adapters, PRs and deployment.

For every meaningful change:

1. read repository sources of truth;
2. inspect the actual implementation;
3. create proposal, spec delta, design when needed and verifiable tasks;
4. maintain a bounded Impact Manifest;
5. strictly validate the OpenSpec change;
6. only then edit production code;
7. run focused fast verification;
8. run one authoritative full verification before PR readiness;
9. perform a real user-facing smoke test.

Use Graphify and Serena only when actually available and record evidence. State the fallback explicitly when unavailable.

## 25. Feature handoff template

```md
# Feature

## User problem

## Target user

## Ten-second explanation

## Primary scenario

## Prior Art & Alternatives

## Native platform check

## Product decision

## Scope

## Non-goals

## End-to-end flow

## Data and privacy

## Failure behaviour

## Mobile behaviour

## Correctness criteria

## Open questions

## External gates

## Acceptance tests

## OpenSpec requirement
```

Without a primary scenario, prior-art review and correctness criteria, the handoff is not ready.

## 26. Separate durable summaries

`PRODUCT SUMMARY` contains what is being built: user problems, product decisions, UX, capability map, prior-art findings, constraints, open questions and future product changes.

`DEVELOPMENT SUMMARY` contains how it is being built: OpenSpec changes, architecture, tooling, branches, PRs, tests, deployment and technical blockers.

Do not allow technical status to displace the product goal.

## 27. Topic ledger

Do not lose topics when a new idea appears. For every substantial topic track its name, problem, decision, status, related proposal/OpenSpec/PR, next action and blocker.

## 28. Expected AI behavior

An AI receiving this guide must:

1. determine whether the chat is product or development work;
2. confirm the immediate objective briefly rather than reciting this file;
3. begin with the user and their problem;
4. treat the public ChatGPT App as a core product requirement;
5. distinguish App, skill, MCP and Dashboard;
6. check current existing solutions and native platform capabilities;
7. issue a product verdict before OpenSpec;
8. never present planned behavior as implemented behavior;
9. verify the complete end-to-end journey;
10. record external gates separately;
11. preserve the product/development separation;
12. maintain the topic ledger;
13. evaluate from the perspective of an unknown mobile user;
14. challenge ideas that add complexity or are already solved better;
15. prepare a complete Markdown handoff only when the feature is ready.

The governing acceptance criterion is:

> An unknown person finds DashGPT in ChatGPT, installs it, saves the useful outcome of a conversation, sees the card, finds it later and continues the work without developer help or knowledge of the internal architecture.

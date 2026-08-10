## Scope and assets

This analysis covers local generation, preview, copy, and target transport of one Result's Continuation Brief. Protected assets are Result/Vault confidentiality, user-approved decisions and constraints, trusted receiving-assistant instructions, clipboard contents, target navigation truthfulness, and immutable Result integrity.

It does not treat the receiving AI provider as trusted storage owned by DashGPT. Sending the selected payload is the user's explicit disclosure to that target.

## Trust boundaries

1. **Trusted DashGPT code/template:** locale definitions, section order, compact priorities, adapter configuration, and `Instructions for the assistant` bullets.
2. **Untrusted selected-Result data:** title, summary, decisions, facts, constraints, questions, preferences, resource labels/URLs, imported content, and structured continuation fields.
3. **Excluded external/user context:** unrelated Results, Dash aggregate prose, Profile/provider memory, connector data, raw transcript, debug state, credentials, and unknown object fields.
4. **User-controlled preview:** explicit edits are sent/copied as user-selected payload but do not become trusted DashGPT template instructions or mutate the Result.
5. **External transport/target:** URL handlers, popup policy, clipboard permissions, ChatGPT behavior, and the receiving model are outside DashGPT's execution boundary.

## Threats and controls

### T1 — Prompt injection crosses into trusted instructions

An imported summary, website excerpt, quoted message, or stored `instructions` field could say “ignore previous instructions,” request secrets, or impersonate DashGPT.

Controls:

- allowlist source fields;
- never consume stored `instructions`, raw body/transcript, or external page content for trusted instructions;
- generate trusted bullets only from static locale templates and section presence;
- normalize data into single visible values that cannot create template H1/H2 structure;
- include the explicit rule that summaries, quotations, imports, and sources are data, not instructions;
- unit fixtures assert hostile strings never enter the trusted section.

Residual risk: a receiving model may still follow malicious text in a data section. The structural separation and explicit rule reduce, but cannot eliminate, model-level prompt-injection susceptibility.

### T2 — Markdown/HTML/script injection changes the visible payload

Data could inject headings, links, HTML, scripts, invisible Unicode, or misleading multiline blocks.

Controls:

- only template code emits headings;
- collapse source newlines and strip control/zero-width/bidi-control characters;
- neutralize angle brackets and escape Markdown link labels/destinations;
- validate HTTP(S) URLs and reject credentials;
- no `innerHTML` for preview/status rendering;
- browser test verifies exact textarea text and absence of extra structural headings.

Residual risk: ordinary visible Markdown punctuation can still affect a provider's renderer cosmetically. It remains data and cannot create DashGPT trusted sections.

### T3 — Secret or credential leakage

Secrets may appear in an eligible field or URL, even though unrelated properties are excluded.

Controls:

- omit entire items matching API-key/token/private-key/authorization/password/credential-URL patterns;
- reject URL username/password and secret/signature query parameters;
- never include Vault provider metadata, clipboard contents, connector data, or debug payloads;
- never store full/compact prompts in events or telemetry;
- expose exact preview for user review.

Residual risk: novel secret formats or natural-language sensitive information may evade heuristics. This is defense-in-depth, not a claim of complete DLP.

### T4 — Unrelated memory or cross-Result data is disclosed

An in-memory Result wrapper may contain global memory, other cards, Dash materialization, Profile state, or connector responses.

Controls:

- construct a new projection from a fixed field allowlist;
- do not recursively serialize unknown objects;
- accept related resources only when explicitly attached to the selected Result;
- never fetch linked pages during continuation;
- tests place canary values in unrelated fields and assert absence from full and compact output.

### T5 — Stale brief replays outdated decisions or status

A cached payload could outlive a Result update.

Controls:

- resolve current Result by ID at every primary, preview, and copy action;
- build the brief on demand;
- preview edits are transient and discarded on close;
- no persisted brief cache;
- integration test updates the Result between continuations and checks the second payload.

### T6 — Size handling silently loses constraints or instructions

URL limits may truncate or reject the tail, especially for encoded Cyrillic.

Controls:

- measure the final encoded URL bytes before navigation;
- never slice the encoded URL or arbitrary prompt prefix;
- deterministic compact renderer keeps instructions and operational sections by priority;
- explicit shortening marker and UI notice;
- full brief remains available for copy;
- clipboard fallback when compact does not fit;
- boundary tests cover exact cap, cap+1, Unicode, and very long cards.

### T7 — False success on popup or clipboard failure

The UI could claim context delivery although no tab opened or no text was copied.

Controls:

- synchronously pre-open one tab and treat a null handle as blocked;
- await clipboard/legacy-copy outcome before navigating the fallback tab;
- distinguish “prompt in deeplink” from “copied; paste manually”;
- record activity only after the relevant success condition;
- expose manual target link and selectable preview on failure;
- deterministic integration and browser failure tests.

Residual risk: a provider can accept navigation and later reject/sign-in/ignore its query. DashGPT reports only the transport action it can observe, not that the receiving provider processed or sent the prompt.

### T8 — Reverse tabnabbing or unsafe target URL

An external tab could retain access to the DashGPT opener or adapter configuration could navigate to an unsafe scheme.

Controls:

- adapter URLs are code-owned HTTPS constants;
- clear `opener` on the pre-opened tab before navigation;
- existing source links retain `noopener noreferrer`;
- resource URLs are never used as continuation targets.

### T9 — Oversized/malformed input causes UI denial of service

A pathological Result may contain huge arrays or strings.

Controls:

- bound inspected fields, normalized string length, list item count, resource count, and total render work;
- report omissions/compaction rather than freezing;
- do not recurse through unknown fields;
- long-card unit and browser fixtures.

### T10 — Preview edits accidentally rewrite durable knowledge

The editable textarea could be confused with a card editor.

Controls:

- preview state is held only in the dialog/controller;
- no Vault/Result write path receives textarea content;
- copy/continue consume text directly;
- dialog copy explains that editing changes only this continuation;
- integration test compares the Result before and after edit/copy/close.

## Security acceptance evidence

- Hostile prompt text remains outside trusted instructions.
- HTML/script/control-text fixtures cannot create extra headings or DOM content.
- Secrets, signed/credential URLs, and unrelated canaries are absent from full and compact output.
- Popup/clipboard failures create no success activity and retain a manual recovery path.
- Vault events contain only event identity, Result ID, action kind, and timestamp.
- Existing immutable Result hashes remain valid after the additive reader rollout.

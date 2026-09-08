# Design — F52 ChatGPT plugin direct Card save

## Context

The existing public MCP surface is primarily read-only and includes `prepare_result_import`, which builds a payload plus explicit browser import URL. A production Share failure trace demonstrated that anonymous server-side retrieval can be blocked upstream even when the same Share opens in a normal mobile browser. The reliable boundary is therefore the current AI client context, not a secondary fetch of `chatgpt.com`.

Repository inspection after the initial F52 proposal found two important existing boundaries:

- the production MCP is anonymous/read-oriented;
- the ordinary account-scoped Vault is local-first with optional Google Drive `drive.file` sync, and its Google access token currently lives only in browser memory.

OpenAI's current plugin authentication contract requires customer-specific/write actions to authenticate users and requires tool `securitySchemes`, protected-resource metadata, and runtime `mcp/www_authenticate` challenges. F52 therefore cannot safely add a public unauthenticated write tool.

## Chosen architecture

F52 uses **OAuth as a narrow authorization bridge to the existing Google Drive-backed Vault**. It does not create a DashGPT-hosted Card database.

```text
current ChatGPT conversation
  -> user: "dashgpt добавь карточку"
  -> model distills canonical Card fields
  -> upsert_card
     -> no/expired grant: MCP OAuth link challenge
     -> DashGPT authorization page: Continue with Google
     -> existing Google Drive drive.file consent
     -> one-time authorization code + PKCE S256
     -> short-lived DashGPT bearer grant scoped to cards:write
  -> MCP verifies grant scope/audience/expiry
  -> discover/create DashGPT/dashgpt-vault.json in user's Drive
  -> load Vault v1
  -> canonical Card upsert
  -> write Vault back to the same Drive file
  -> created/updated response
```

The OAuth bridge carries only authorization needed for the write. Conversation/Card content is never persisted by the authorization layer itself.

## OAuth/MCP surface

The Worker adds the standards-facing endpoints needed by the MCP authorization flow:

- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`
- `/oauth/authorize`
- `/oauth/authorize/complete`
- `/oauth/token`

The `upsert_card` tool advertises `securitySchemes: [{ type: "oauth2", scopes: ["cards:write"] }]`. Anonymous or stale calls return an MCP error result with `_meta["mcp/www_authenticate"]` pointing to protected-resource metadata.

The authorization server supports ChatGPT's stable Client ID Metadata Document (`https://chatgpt.com/oauth/client.json`) as a public OAuth client and PKCE S256. Because the server advertises RFC 9207 issuer identification, successful and error redirects include the exact authorization-server issuer and use only redirect URIs allowed by the validated client metadata/known ChatGPT client contract.

## One-time authorization state

OAuth authorization codes must not be replayable. F52 therefore adds one small Cloudflare Durable Object binding used only for short-lived authorization state:

- pending authorization request records live for minutes and contain client/resource/redirect/scope/state/PKCE challenge plus a random nonce;
- the first-party Google consent completion consumes the pending record and creates a short-lived authorization-code record;
- `/oauth/token` atomically consumes that code exactly once after validating client, redirect URI, resource and PKCE verifier;
- expired records are rejected and deleted opportunistically;
- the Durable Object never stores conversation text, Card payloads, Vault JSON, Search/Dash data or long-lived user memory.

This is ephemeral security state, not a memory provider. It exists only to provide one-time OAuth semantics across Worker instances.

## Short-lived bearer grants

After one-time code redemption, `/oauth/token` returns a short-lived self-contained DashGPT bearer grant protected by deployment secret material. The grant records issuer/resource, Card-write scope, expiry and the bounded Google provider authorization needed to perform Drive operations. The provider authorization is never written to Vault content, logs, Card fields, URLs, tool output or submission fixtures.

Because provider grants are short-lived, expiry triggers normal MCP reauthorization. Long-lived refresh-token custody is deliberately deferred rather than introducing a hosted account credential store in this change.

## Google authorization page

`/oauth/authorize` renders a minimal first-party DashGPT page explaining the requested action and showing one human action: **Continue with Google**. It uses the same public Google OAuth client configuration and the same `https://www.googleapis.com/auth/drive.file` scope as the existing browser account flow.

The Google access grant is returned to the first-party authorization page, posted directly to `/oauth/authorize/complete`, validated for the configured Google client and required Drive scope, then stored only inside the one-time authorization-code record until redemption. It is never exposed to ChatGPT tool arguments or canonical data.

If Google OAuth is not configured on the deployment, the authorization page fails as a human product state and `upsert_card` remains not-persisted; the anonymous/read-only MCP tools continue working.

## Card persistence/upsert

The server reuses Vault v1 and the existing Google Drive folder/file conventions. For an authorized `upsert_card` call:

1. discover or create the DashGPT folder;
2. discover `dashgpt-vault.json`;
3. if absent, create a new Vault v1 and add the Card;
4. if present, download/validate the Vault;
5. derive canonical source identity:
   - canonical ChatGPT Share URL when supplied;
   - otherwise an optional caller-supplied stable card identity;
   - otherwise create a new Card id;
6. when the existing source/card identity matches, reuse the Card id and increment `contentVersion`;
7. write the updated Vault using existing Google Drive helpers;
8. return `created` or `updated`, stable Card id, contentVersion and safe provider-independent state.

No source URL is fetched from ChatGPT during this process.

## Canonical Card input

`upsert_card` accepts the durable current-chat fields already used by DashGPT capture/continuation: title, goal, summary, current state, category, tags, decisions, facts, constraints, user preferences, open questions, next/suggested next step, useful references/links, language and optional source metadata. Inputs stay bounded and schema-validated.

The model/skill is responsible for distilling the current conversation. The tool must not accept ChatGPT session material as authorization and should not require the entire raw transcript.

## Write semantics and annotations

`upsert_card` is mutating and therefore:

- `readOnlyHint: false`;
- `destructiveHint: false` because normal upsert preserves the canonical Card history semantics and does not delete external state;
- `openWorldHint: false` because it writes only private user-controlled DashGPT storage, not public internet state;
- `idempotentHint: false` for the general tool because calls without stable source/card identity create a new Card; stable source/card identity still converges to update semantics.

The current `prepare_result_import` remains available as a read-only portable fallback.

## Security boundaries

- validate OAuth issuer/resource/scope/expiry on every direct-write tool call;
- use PKCE S256 for authorization code exchange;
- authorization codes are single-use through the Durable Object;
- validate the known ChatGPT client identity and allowed redirect URI contract rather than accepting arbitrary OAuth clients;
- do not accept ChatGPT account authentication state as DashGPT authorization;
- do not put provider authorization in tool input/output, query parameters, canonical Card/Vault content, browser local storage, logs or fixtures;
- reject unsupported redirect/resource/scope combinations;
- keep OAuth state/code/grant lifetimes bounded;
- preserve existing Drive `drive.file` scope rather than broadening Drive access;
- no hosted Card database or mandatory registration.

## Mobile/product surfaces

Custom developer-mode MCP remains a web-only setup surface unless OpenAI documents otherwise. F52 prepares the **published plugin** path because Plugin Directory distribution is the route intended to remove manual MCP setup for ordinary/mobile users. We do not claim native-mobile direct save until the published build is installed and tested on a supported mobile client.

## Share fallback

Share-link capture remains best-effort and separate. A Share URL supplied by the current conversation may be attached as provenance without server-side re-fetch. F50 remains responsible for current web recovery UX.

## Verification

- strict OpenSpec validation before this scoped production implementation;
- OAuth discovery, client/redirect validation, one-time code, PKCE, audience/scope/expiry and auth-challenge regressions;
- Google Drive persistence/upsert regression against Vault v1 and existing provider layout;
- Card identity/provenance/update regression;
- no provider authorization leakage regression;
- MCP descriptor/securitySchemes/output schema verification;
- submission JSON + bundled skill consistency checks;
- targeted `npm run check` during implementation;
- final `npm run verify:full` once on final candidate;
- deployed preview of auth product states where configuration permits;
- native mobile capability claimed only after explicit published-plugin verification.
# Design

## URL contract

DashGPT recognizes two ChatGPT shared-chat families:

1. Classic public share: `/share/<id>` and legacy `/s/<id>`, canonicalized to `https://chatgpt.com/share/<id>`.
2. Project shared chat: `/g/<project-or-gpt-slug>/shared/c/<conversation-id>`, canonicalized on `https://chatgpt.com` while preserving that path.

Validation is exact-path, HTTPS-only, and restricted to ChatGPT hosts. Credentials and fragments are rejected/removed. For Project shared-chat URLs only `owner_user_id` is preserved because it can be routing context; unrelated query parameters are discarded.

## Browser normalization

A small shared browser helper owns URL recognition so the Save chat form and legacy share-link compatibility adapter cannot drift apart. `public-onboarding.js` keeps its existing internal normalization/error boundary while delegating URL recognition to that shared helper.

## Resolver behavior

The server canonicalizer accepts the same URL families. Existing retrieval layers remain unchanged: backend-reader attempts may derive the last conversation/share id, while text/direct/browser fallbacks receive the preserved Project URL. Acceptance is not an assertion of anonymous readability.

If ChatGPT requires Project membership or other authentication, DashGPT returns its existing human `SHARED_CHAT_UNREADABLE` state rather than exposing upstream HTTP/storage details.

## Security

This change does not send or persist ChatGPT credentials. Exact route matching prevents arbitrary paths on ChatGPT hosts from being treated as share sources. Query normalization prevents unrelated tracking or opaque parameters from entering canonical Card source references.

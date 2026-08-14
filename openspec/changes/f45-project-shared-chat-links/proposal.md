# F45 — ChatGPT Project shared-chat links

## Problem

DashGPT's Save chat flow currently accepts only classic ChatGPT public links such as `chatgpt.com/share/<id>` (plus legacy `/s/<id>`). ChatGPT can also produce Project-scoped shared-chat URLs shaped like `chatgpt.com/g/<project>/shared/c/<conversation-id>`. The current browser normalizer and backend canonicalizer reject these before the existing resolver can even attempt retrieval.

## Proposed change

- Recognize the exact ChatGPT Project shared-chat URL shape on `https://chatgpt.com` / `https://chat.openai.com`.
- Preserve the Project route when canonicalizing instead of rewriting its conversation id into the unrelated classic `/share/<id>` namespace.
- Preserve only the routing query parameter `owner_user_id` when present and strip unrelated query/fragment data.
- Send accepted Project shared-chat URLs through the existing multi-tier resolver and existing human unreadable-link failure state.
- Keep classic `/share/<id>` and legacy `/s/<id>` behavior unchanged.
- Add regression coverage using the Project shared-chat URL shape that exposed the bug.

## Non-goals

- Bypassing ChatGPT authentication, Project membership, or access controls.
- Scraping private/unshared conversations.
- Storing ChatGPT cookies, tokens, or credentials.
- Changing Card/Vault schema, storage providers, Dashes, or bulk history import.

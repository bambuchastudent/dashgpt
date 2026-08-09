# Spec — M1 Local Result Vertical Slice

## Functional requirements

1. The demo SHALL display saved Results with title, category, summary and tags.
2. The user SHALL be able to create a Result from the UI.
3. Results SHALL persist locally across page reloads in the demo environment.
4. The user SHALL be able to search Results.
5. The user SHALL be able to filter Results by category.
6. The user SHALL be able to toggle favorites and show favorites only.
7. The user SHALL be able to open Result details.
8. The user SHALL be able to generate a human-readable portable Context Pack from a Result.
9. The Context Pack SHALL include summary, captured decisions, tags and next intended action when available.
10. The UI SHALL remain usable on phone-width screens.

## Non-goals

- final persistence/storage adapter design
- authentication
- Cloudflare deployment
- MCP
- ChatGPT app integration
- automatic LLM summarization
- multi-user support

## Acceptance

The slice is accepted when it can be started locally without a build step and the central Result → Context Pack flow works without network services.

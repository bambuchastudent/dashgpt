# Design

## First-run interaction

A clean personal root has no saved Results and renders a compact two-step handoff:

1. **In the original ChatGPT conversation** — the visitor copies one DashGPT command and sends it in the chat they want to save.
2. **Back in DashGPT** — the visitor pastes the structured Result envelope returned by ChatGPT, reviews title/summary, and saves it locally.

The first screen does not request a public share URL and does not make a network request to chatgpt.com.

## Portable Result envelope

The copied command asks ChatGPT to return JSON only with this minimal shape:

```json
{
  "title": "Short useful title",
  "summary": "Durable summary of the useful outcome",
  "category": "Short category",
  "tags": ["tag"],
  "decisions": ["durable decision"],
  "next": "Next useful action"
}
```

The client accepts plain JSON and JSON wrapped in a Markdown code fence. It validates and normalizes the fields locally. No raw transcript is stored unless the user explicitly puts it in the envelope.

## Local persistence

The accepted envelope becomes a normal mutable Result in the visitor's browser Vault. Provenance is `chatgpt-handoff`; it records that ChatGPT distilled the current conversation but does not claim a public source URL.

## Compatibility share importer

`/api/shared-chat` remains available for explicit compatibility use and existing tests/integrations. It is not part of the primary onboarding surface because automated access to ChatGPT public pages is not a reliable product contract.

## Future direct-save path

The same Result fields are the payload for the future authenticated DashGPT plugin `save_result` tool. When direct save ships, the visible user intent remains the same (`DashGPT, save this conversation`) while the copy/paste bridge disappears.

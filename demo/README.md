# DashGPT M1 Demo

Zero-build local-first prototype for the first product loop.

## Run

From the repository root:

```bash
python3 -m http.server 8080 -d demo
```

Open http://localhost:8080.

## Included in this slice

- seeded Results
- create Result
- local persistence via browser localStorage
- search
- category filters
- stable semantic grouping with within-topic activity priority
- five-level touch/trackpad/keyboard gallery density
- favorites
- Result details
- structured RU/EN Continuation Brief generation, exact preview/edit/copy and safe ChatGPT transport fallback
- separate portable Full Context Pack generation and copy
- responsive laptop/mobile UI

No Cloudflare, GitHub API, backend, database, paid LLM API or build step is required.

This is intentionally a product demo, not the final persistence architecture.

# Feature 3 tasks

- [x] Research shared-page presentation update strategy.
- [x] Choose one shared SPA renderer rather than copied per-Result HTML.
- [x] Add stable `/demo/result/<id>/` routing.
- [x] Add `immutable` and `contentVersion` to published Results.
- [x] Add CI guard for immutable Result content.
- [x] Publish the second shared chat as a sanitized immutable Result.
- [x] Add read-only `/mcp` endpoint with `list_results`, `get_result`, and `get_context_pack`.
- [x] Add `plugins/dashgpt/.codex-plugin/plugin.json` with stable id `dashgpt`.
- [x] Add initial DashGPT plugin workflow skill.
- [ ] Run syntax and immutable-content checks in CI.
- [ ] Verify Cloudflare branch preview `/demo/` and standalone Result route.
- [ ] Verify MCP initialize/tools/list/tools/call against deployed preview.
- [ ] Register deployed `/mcp` in ChatGPT Developer mode using user-facing name `DashGPT`.
- [ ] Capture the real `plugin_asdk_app...` id and wire `.app.json` into the plugin package.
- [ ] Demonstrate the same flow against a second/separate DashGPT site.
- [ ] Review and merge Feature 3 into `develop` after acceptance.

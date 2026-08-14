# Verification plan

Targeted deterministic checks:

- `node --check demo/chatgpt-history-source-runner.js`
- `node --check demo/chatgpt-history-import-batch.js`
- `node scripts/verify-chatgpt-history-import-f25.mjs`
- `node scripts/verify-chatgpt-history-import-f26.mjs`
- `npm run verify:fast`

Real-browser acceptance after deployment:

1. Start/resume an import with existing durable cards.
2. Reach a rate-limited/deferred state.
3. Put the ChatGPT source tab in the background and keep DashGPT foregrounded.
4. Confirm the receiver wake heartbeat does not reset progress and that overdue deferred work resumes when provider pressure clears.
5. Confirm focusing the ChatGPT tab wakes due retries immediately.
6. Confirm no duplicate cards are created for already imported conversation IDs.

# Impact Manifest

## Production

- Existing ChatGPT history import operation receives the recommended export-file path.
- New browser-local export parser normalizes official conversation exports.
- Existing canonical Vault/card write path remains authoritative.
- Existing live import remains available.

## Verification

- Add unit and browser regressions for JSON/archive import, numbered files, idempotency, live-import deduplication, malformed records, progress UI, and mobile layout.

## Data and privacy

- No new card type or Vault schema migration.
- The selected export is processed as a local browser input and is not retained as a separate asset.

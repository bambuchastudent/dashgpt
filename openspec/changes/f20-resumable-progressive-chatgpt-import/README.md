# f20 — Resumable Progressive ChatGPT History Import

Product input: GitHub issue #37.

This change makes bulk ChatGPT history migration progressive, resumable and idempotent while keeping DashGPT card-first and local-first. Imported conversations are written directly through the existing canonical Result/Card + Vault path; the import does not create a second card database.

The change is intentionally stacked on PR #33 (`Unified Card Dashboard — My Dash`) because the import launcher/progress state is a first-class My Dash card. Browser extensions/plugins are not required or introduced.

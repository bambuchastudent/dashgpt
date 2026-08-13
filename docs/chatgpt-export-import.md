# ChatGPT export import

DashGPT uses the official ChatGPT data export as the recommended way to migrate a large existing history.

## User flow

1. In ChatGPT open `Settings → Data Controls → Export data` and request the export.
2. Download the export when OpenAI sends it.
3. In DashGPT open the `Импортировать историю ChatGPT` card.
4. Choose `Надёжно всю историю` and select the ZIP.
5. If the browser cannot read a very-large ZIP variant directly, unzip it and select `conversations.json` or the numbered conversation JSON files instead.
6. DashGPT imports canonical cards into the local Vault first; the already-configured Google Drive or GitHub provider can then synchronize that same Vault.

## Guarantees

- The same stable ChatGPT conversation ID is used by live import and export import, so switching methods does not intentionally create duplicate cards.
- Parsing is local-first. The selected export is not kept as a separate DashGPT asset.
- Cards are saved progressively in bounded batches, so successful work survives a malformed conversation later in the export.
- The existing live importer remains available for a small number of recent chats.

## Archive behavior

DashGPT reads only recognized conversation JSON entries from the ZIP rather than loading unrelated export assets. It supports ordinary stored/DEFLATE ZIP entries through browser Compression Streams. Unsupported very-large/ZIP64 archives fall back to the unzipped numbered JSON-file path rather than attempting an unbounded extraction.

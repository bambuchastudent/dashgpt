# Spec — Semantic Result cards

## Semantic visual coordinate

The renderer MUST compute a deterministic hue from semantic text available on the Result (`category`, `title`, `tags`). It MUST NOT persist renderer-only color into immutable durable Result fields.

For the first implementation, broad semantic anchors provide neighborhoods rather than exact category colors. A stable hash of title/tags adds a bounded offset, so related Results cluster while individual cards vary. Unknown topics fall back to a stable full-spectrum hash.

The renderer SHOULD expose hue and companion hue as CSS custom properties and use them for a restrained gradient/border glow. Readability takes precedence over saturation.

## Actions

A Result with `source.url` MUST expose `Original chat` prominently in details.

Every Result MUST expose `Continue in new chat`, implemented as a ChatGPT new-chat URL carrying a compact continuation instruction based on the Result summary/decisions/next action.

Context Pack MUST remain available but SHOULD be hidden behind a secondary `More` disclosure in Result details rather than being a primary card action.

## Compatibility

Existing schemaVersion 1 Results remain valid. Semantic visuals are presentation state and MUST NOT change `contentHash` verification.

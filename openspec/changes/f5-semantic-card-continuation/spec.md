# Semantic Result card UX specification

## Semantic heat map

Each newly created or newly revised Result MUST receive a stored `semanticColor` with hue, saturation, lightness and algorithm version.

The color MUST be based on the combined meaning of title, summary, category, tags, decisions and next action. Multiple matching topic clusters MUST blend, so a route-planning Result can sit between transport and travel while a car-maintenance Result remains closer to the automotive cluster.

The browser MUST render an old Result without stored semantic color using a deterministic semantic fallback. This fallback is presentation metadata and MUST NOT mutate or invalidate immutable Result knowledge.

## Content-rich cards

A dashboard card MUST display:

- category;
- title;
- summary;
- first captured decision or an explicit empty state;
- next action or an explicit empty state;
- tags;
- a clear action to open the Result.

Context Pack MUST NOT appear as a primary dashboard-card action.

## Result continuation actions

A Result page MUST prioritize:

1. opening the original source chat when a source URL exists;
2. starting a new ChatGPT conversation with the Result title, summary, decisions and next action.

The continuation prompt MUST tell the new chat to continue from captured state instead of restarting from scratch.

Context Pack MUST remain available from an overflow/additional menu. Favorite remains secondary.

## Compatibility and integrity

Semantic coloring MUST work without a model API.

Adding or rendering semantic color MUST NOT change the existing durable-field hash contract for immutable Results. Knowledge corrections continue to require a new revision.

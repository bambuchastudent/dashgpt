# Change: Semantic Result cards and continuation-first actions

## Why

The current dashboard gives every Result nearly the same visual weight and treats Context Pack generation as a primary action. A Result should communicate what it contains, where it sits in the user's semantic landscape, and how to continue the work.

## What changes

- Assign a blended semantic heat-map color when a Result is created or revised.
- Store the derived color as Result metadata; renderer fallback colors old Results without changing immutable knowledge.
- Make dashboard cards show summary, one key decision, next action and tags.
- Make opening the original source chat and continuing in a new chat the primary Result-page actions.
- Move Context Pack access into an overflow menu.
- Preserve immutable Result content and content hashes.

## Out of scope

- Model-backed embeddings or a mandatory paid LLM.
- Retrofitting semantic color into the immutable hash of published Results.
- Redesigning the Feature 4 plugin submission architecture.

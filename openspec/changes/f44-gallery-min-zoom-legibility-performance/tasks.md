# Tasks

- [ ] Validate `f44-gallery-min-zoom-legibility-performance` with strict OpenSpec validation before production-code edits.
- [ ] Add a presentation-only short cue for minimum-density compact and heat-map/overflow cards without changing canonical Card/Vault data.
- [ ] Bound all-card FLIP geometry animation so large selections do not measure every card twice on density commit.
- [ ] Coalesce transient pinch/trackpad zoom presentation writes to animation frames.
- [ ] Split F32 full refresh from overview-only refresh so density/resize do not re-materialize and re-sort the Vault.
- [ ] Add regression tests for visible minimum-density text, unchanged whole-board geometry, large-board reflow guard, and overview-only refresh behavior.
- [ ] Run targeted Semantic Gallery/F32 verification.
- [ ] Run canonical `npm run verify:full` before merge.
- [ ] Verify the production preview at desktop and 390px mobile viewport, including a large-card overview and zoom interaction.
- [ ] Merge the dedicated PR to `develop` only after required verification succeeds.

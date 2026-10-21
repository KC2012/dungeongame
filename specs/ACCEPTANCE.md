# Completion and acceptance gates

Build cannot call itself a playable six-floor game unless ALL below are demonstrated with evidence:

- [ ] New run solo and 4-player online remote room works, no paid account for player.
- [ ] All six different floors, their objectives, an entry, saferoom and exit are traversable and visually identifiable.
- [ ] Each of six bosses implements attack telegraphs, a combat victory and alternate solution, with tested defeat/win path.
- [ ] At least 8 class/profession choices and 6 adaptations function in gameplay, are correctly gated at floor 3, persist on save.
- [ ] All content catalogs consumed without placeholder behavior or dead references. If intentionally cut, amend content and note cut.
- [ ] All named environment interactions have executable systems and diagnostic logs.
- [ ] Director achievements actually match game events and trigger correct rewards/score; no unlimited farming.
- [ ] Character creation, inventory, crafting, shop, target inspector, level choices, final recap and ally visibility complete.
- [ ] Statuses, equipment, talent selection, AP, LOS, knockback, damage and death obey specs and pass deterministic tests.
- [ ] Save/resume, restart, disconnected slot, death spectator, role migration, duplicate message protection verified.
- [ ] 100 generator seeds/floor in CI; 10k nightly floor sweeps; known dangerous seeds saved as regression cases.
- [ ] Full four-browser smoke test passes; separate-network tunnel smoke tested and recorded.
- [ ] Keyboard access, status-readable-without-color, reduced motion, font-scale and no broken controls.
- [ ] Game includes understandable controls and credits, original art/text, no assets from book games without permission.
- [ ] Source committed, reproducible install/build documented, no hidden paid credentials required.

## Two statuses, never conflate
`SPEC_READY`: docs and data internally validated (this package can reach this status after validator).
`PLAYABLE_RC`: actual game completed, all gates above demonstrated (not achieved by this package).

## First friends playtest rubric
Each player rates: (a) what happened and why, (b) how often their choices mattered, (c) if waiting was tolerable, (d) if they could help a teammate, (e) if funny moments emerged naturally, (f) desire to replay. Collect mean plus verbatim feedback and report failures. Target >=4/5 average on clarity, agency, cooperative contribution; any game-breaking incident is P0 independent of score.

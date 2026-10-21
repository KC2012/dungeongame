# Interface and visual style contract

## Art direction
Low-fi but composed. A warm gray-black dungeon canvas, muted stone blocks, high-chroma warnings only for actionable danger. 16×16 nearest-neighbor sprites; characters identifiable by silhouette/palette plus shape glyph. 16px wall/floor tiles with 2–4 tone shading; doors, devices, water, gas and hazard telegraphs look different even in grayscale. No glossy mobile-app controls, gradients everywhere or default emoji sprites.

## Main screens
1. Title: New Run / Join Run / Resume Host Run / Settings / Credits (unofficial fan inspiration disclaimer and original content attribution).
2. Lobby: room name, 1–4 slots, nickname + palette + portrait symbol, background+aptitude+flaw cards, invite URL copy, connection state, ready toggles, host start. Solo starts with one slot.
3. Dungeon: 70% map primary; narrow right panel for party health/AP/readiness, focused target, top-level objective; bottom actions AP queue, inventory hotkeys, log, Inspect mode, Ready/Undo; no modal blocking camera when possible.
4. Inventory/equipment: 10 slot grid, item tags and hover explanation, trade request with confirmation, visible weight/capacity.
5. Character: portrait/stats, status definitions, actual active skill effects, level offer choices, profession/adaptation two-column cards with one-sentence benefit and detailed preview.
6. Saferoom: heal, craft, shop, sponsor, reward draft, respec not offered (choices meaningful), team ready to descend with warning.
7. Death: cause chain and attacker, spectate button, remaining ally portraits. Death is serious but reversible only via defined downed mechanic.
8. Run result: seed, duration, each crawler's fate, top chain reaction, achieved feats, unlocks, Start New Run / Copy recap.

## Input
- WASD/arrows movement preview one cardinal step; click tile path preview and queue as many steps as AP permits; `1–5` select actions; `I` inventory; `C` character; `F` inspect; `Space` confirm current action; `R` Ready/Unready; `Esc` cancel/back.
- Mouse-hover and keyboard focus show identical inspect details. Target indicator spells max range and LOS; projected ally AOE areas outlined with warnings.
- Four visual states for queued commands: queued, confirmed, invalid with reason, resolved (separate from animation). Ready state clearly shows all players.
- Movement animations and effects are short and can be sped up x2 or skipped without skipping log contents.

## Clarity and accessibility
- All status icons include letters/patterns: BURN (flame), SHK (zig-zag), ACID (droplet), etc. Semantics remain when color disabled.
- Text high-contrast; viewport can zoom x2/x3/x4 where screen allows; tooltips keyboard accessible; never require reading rapidly fading text.
- Introduce mechanics through optional short contextual callouts; may be disabled after first run. No unskippable tutorial video.
- Announcer overlay never blocks map or action buttons; queue transmissions in expandable log. Avoid flicker/CRT shader by default.

## User flow acceptance
From clean install to joining a friend's room in <6 meaningful interactions after opening link, and first complete round in <90 seconds (targets to playtest, not guaranteed). No account registration, friend install or paid subscription required for guests.

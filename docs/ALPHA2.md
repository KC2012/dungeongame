# THE CRAWL — Alpha 2: Make the game visible

Version 0.2.0, local presentation alpha. The five implementation passes are delivered; human evidence that a new player understands the game more easily remains to be collected. No public deployment, tunnel, purchase, paid service or external AI was used.

## Launch

From the repository root, with Node.js 22+:

```sh
npm ci
npm run build
npm run host
```

The host uses loopback port 2567 by default. Open that port in a local desktop browser, create a private room, and begin the run. `npm run dev` runs the development host. Existing save data remains in `.data/`; the Alpha 1 ZIP's saved sessions were retained in the untouched import and were not copied into this checkout. Back up saves before switching builds. Existing schema-1 checkpoints load without migration; previously generated rooms are not retroactively changed. Both host and browser should use the Alpha 2 build. Cross-version replay hashes differ because event payloads and newly generated situations changed.

For cloud tasks, use the existing isolated checkout at `/workspace/dungeongame`; no additional worktree is needed. The saved environment setup/start draft is separate from code and does not publish anything.

## Play and inspect

- Arrows/WASD move. Combat still queues tactical actions; R commits Ready to the authority. Presentation never gates input or acknowledgements.
- M = pursuer, R = gunner, G = sentry, F = flanker, H = hazard setter, S = summoner, + = support, C = charger, K = skirmisher. Silhouettes reinforce these roles. Inspector shows actual catalog weakness and behavioral hints.
- Crosshatched boss tiles mark the next enemy-phase strike. Boss HUD shows HP, phase and alternative-device progress.
- Z marks a powered machine; − marks offline. Fuel/volatile containers, wet ground, ice, cover and fragile partitions are visible. Room plaques identify authored situations.
- Use **Map focus** to widen the world; **Show panels** restores the sidebar. F restores panels and Inspector. Transmission Log is under its disclosure; exact probabilities, statuses, stats and item mechanics remain available.
- Settings includes reduced motion and Producer mute. Reduced motion preserves stationary outcome feedback. Commentary remains until a new selected transmission replaces it.

## Milestones

| Pass | Delivered behavior | Evidence |
| --- | --- | --- |
| A2.1 | Bounded confirmed-event timeline: movement paths, melee/ranged cues, impacts, miss/critical/armor/shield/damage/heal/status feedback, forced movement/collisions, down/death/revive, ability and environmental reactions; stronger persistent boss telegraphs | [Combat](alpha2/a21-combat.png), [conduction/telegraphs](alpha2/a21-chain-telegraph.png), [reduced motion](alpha2/a21-reduced-motion-down.png) |
| A2.2 | Four authored situations inserted deterministically into existing procedural encounter/discovery rooms, using existing materials and interactions while protecting central routes, actors and objects | [Flooded relay](alpha2/a22-flooded-relay.png), [two six-floor campaigns](alpha2/a22-campaign.json) |
| A2.3 | Enemy role silhouettes/glyphs and tactics, guardian crests/phase feedback and HUD, existing-item tactical opportunities, two-stage permanent profession/adaptation station | [Enemy roles](alpha2/a23-enemy-roles.png), [crawler development](alpha2/a23-crawler-development.png) |
| A2.4 | Original confirmed-outcome Producer lines, priority/cooldown/mute, actual Audience meter and changes tied to achievements/spotlight/quiet rounds | [Producer reaction](alpha2/a24-producer-reaction.png) |
| A2.5 | Wider map, reversible map-focus view, contextual readout and targeting line/probability, collapsible expert panels, full expert information retained | [1280 view](alpha2/a25-dungeon-1280.png), [1920 view](alpha2/a25-dungeon-1920.png), [map focus](alpha2/a25-map-focus-1280.png) |

Combat/environment screenshots use a development-only Phaser fixture driven by real engine operations. They are controlled scenarios, not evidence of an ordinary unassisted playthrough. The 1280/1920 UI and character screenshots come from the real production client/authority. [Detailed phase record](alpha2/PROGRESS.md) distinguishes implementation, tests and limitations.

## Validation

```sh
npm run validate:content
npm test
npm run build
npm run e2e
```

Browser tests use system Chromium at `/usr/bin/chromium` by default. On another machine, install Playwright Chromium with `npx playwright install chromium`, then set `CHROMIUM_PATH` to that browser executable. The browser runner starts its own loopback production host on port 2570 with isolated `.data/e2e` saves, plus a loopback test-fixture Vite server on port 5179. Stop conflicting processes or set `E2E_PORT` for the production-test host. Neither test server is publicly deployed.

Python compatibility checks:

```sh
python3 tools/validate.py
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

Install `jsonschema==4.26.0` in a virtual environment for formal Python schemas. Cloud venv: `/workspace/.venvs/dungeongame`.

The final validation summary is [alpha2/test-summary.json](alpha2/test-summary.json). Alpha 1 baseline was 529 automated tests plus 11 Python tests and 6 browser tests. Final Alpha 2 has 547 automated tests, including 10k randomized tactical rounds and the existing deterministic replay, save/reconnect, networking and all catalog-behavior suites. New generation tests check 600 seeded floors twice for deterministic hashes/reachability/safe spawns. Two assisted campaigns reached six-floor victory using alternate and combat routes; they are not human win-rate evidence. A separate 1,000-case comparison against the untouched Alpha 1 source found identical non-event combat state, RNG and event ordering after attacks, capped heals and wall collisions; enriched payloads are intentionally different ([report](alpha2/alpha1-combat-parity.json)). No fresh 60k generation sweep or 30-minute browser endurance run is claimed for Alpha 2.

## Known limitations and remaining presentation weaknesses

- The new-player comprehension criterion has not been measured with people. Human readability, accessibility, balance and tone review remain necessary.
- Large simultaneous chains can crowd small map labels. A maximum of 160 active effects bounds work; newer authority movement supersedes stale animation. Some low-priority feedback is intentionally dropped during large bursts.
- Snapshot deltas cannot show a status applied and expired entirely inside one server update. Event positions cannot reconstruct every historical source movement; unseen attackers never receive invented visible tracers.
- Guardian bodies share a lightweight silhouette, differentiated by floor crests/phase pips and names. There is no bespoke animated sprite set for every boss or item.
- The four authored room situations intentionally reuse existing mechanics; suspended loads, new physics and new puzzle systems were not introduced.
- Producer lines are finite, muted optionally, and rate-limited. Ordinary commentary may be suppressed when outcomes arrive quickly. The full log remains available.
- No actual separate-internet/WAN test, new long endurance test or human playtest was performed. Alpha 1's unresolved desktop long-tail performance and balance/accessibility gates still apply. The existing large-client-bundle warning remains (~1.95 MB before gzip).

## Alpha 3 recommendations

Start with a small observed first-time-player study: hide the log initially and ask players to explain a chain reaction, an enemy role, a boss warning and an alternative resolution. Use the misunderstandings to prioritize the next presentation work. Then focus on crowded feedback placement, bespoke boss silhouettes and clearer causal links for multi-step environmental outcomes. Recheck keyboard/accessibility and profile real desktop frame times during dense effects before expanding content.

## Branch and preservation

Development branch: `alpha2/make-the-game-visible`. Alpha 1 source baseline: `alpha1-import-baseline` at `41d79ba`; original ZIP SHA-256 and original-manifest caveat are recorded in [BASELINE.md](alpha2/BASELINE.md). The local Alpha 2 tag is `v0.2.0-local-alpha`. No push or remote release was made. Use `git log --oneline alpha1-import-baseline..HEAD` for the exact milestone history and `git status --short` for local state. The packaged Git bundle preserves local commits/tags; the ZIP contains source, compiled outputs, evidence and a delivery manifest, without saves or installed dependencies.

The reusable cloud `install_script` and `start_skill` were saved successfully as a draft. To activate a reusable snapshot, review and save them in Environment settings, then publish the environment. This session did not publish it or verify restoration in a new task. The current local host on port 2567 passed health, HTML/assets and catalog requests after release-version alignment.

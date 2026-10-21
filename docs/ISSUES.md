# Known limits and remaining acceptance work

Release status: **LOCAL_ALPHA 0.1.0**. No reproduced save-loss, duplication, false-victory or unbounded-reaction defect remains in the final automated suite. That is bounded evidence, not a guarantee of defect-free play.

| Priority | Issue | Reproduction/evidence and next useful check |
| --- | --- | --- |
| Release gate | Separate-internet multiplayer unverified | All current clients share this host's loopback network. Test four actual machines/networks privately, including 250ms RTT/3% loss, tab hiding, host sleep and restart. No tunnel was started. |
| P1 investigation | Rare long wall-clock resolution stalls | 30k load fixture p95 43.76ms but maximum 16.23s under concurrent cloud load. Captured prior slow-round replay did not reproduce the stall. Measure wall/CPU time on a standard desktop and profile any reproducible outlier. Do not call the desktop performance gate passed. |
| Release gate | Human balance and run length | One ordinary alternate-route bot victory and three combat defeats are a small diagnostic sample. Assisted 100-seed success is progression evidence. The four-crawler sample also has one alternate and one combat victory, a floor-6 loss and a bot routing failure. Run friends rubric and solo/four-player playtests before tuning or certifying the desired 75–120 minutes. |
| Release gate | Full accessibility/control audit | Automated checks cover keyboard movement, settings, inventory, targeting infrastructure and both resolutions. Human contrast, legibility, complete keyboard workflow and screen-reader review remain. Canvas map uses a DOM inspector but is not a screen-reader-complete spatial interface. |
| P2 | Large client bundle | Phaser and engine/catalog code produce an approximately 1.93MB JS bundle (459KB gzip). Vite's chunk warning is retained; initial-load optimization is future work. |
| P2 | Deliberately simple presentation | Original generated pixel silhouettes and optional synthesized cues, with no character animation. All core gameplay systems run; this is not final bespoke production art/audio. |

Initial browser soak failure is preserved, not counted as a pass. See ACCEPTANCE_REPORT.md and the final endurance report for the scope of the repeat. Saved drafts and CI configuration are not evidence that a new cloud snapshot or GitHub workflow was published/executed.

No content catalogs were removed to satisfy tests. No paid service, registration, public deployment, remote AI, live spectator account, mobile control scheme or PvP was added. Those excluded product scopes remain as documented in DECISIONS.md.

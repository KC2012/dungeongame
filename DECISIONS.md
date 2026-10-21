# Decision register — 2026-10-20

| Category | Decision | Status |
|---|---|---|
| Game form | Complete six-floor mini-crawl; procedural replayability | LOCKED |
| Group size | 1–4 browser clients, separate computers | LOCKED |
| Combat | Discrete simultaneous planning, deterministic phased resolution | LOCKED |
| Camera/art | Top-down orthogonal 16px tiles, nearest-neighbor scaling, procedural pixel icon fallback | LOCKED FOR BUILD |
| Room host | Node.js + Colyseus authoritative server | LOCKED FOR BUILD |
| Client | TypeScript + Phaser 3 + DOM UI | LOCKED FOR BUILD |
| Content | Data-defined JSON catalog; TypeScript effect interpreter | LOCKED FOR BUILD |
| Map | Rot.js may be used for FOV/path; authored room sockets + custom grammar for floor layout | RECOMMENDED |
| Playing online | Hosted server; no browser acts as authority. For initial private test, run local Node server via Cloudflare Quick Tunnel | RECOMMENDED, must test actual WebSocket connectivity |
| Turn timer | No forced limit by default; unanimous Ready or host-force after 45s for unresponsive client; never force progress while all connected players intentionally plan | LOCKED FOR BUILD |
| Dead crawlers | Downed, revivable during 3 round window; later fatal until run ends; spectator camera for deceased | LOCKED FOR BUILD |
| Party wipe | Run ends; no continue-from-loss | LOCKED FOR BUILD |
| Meta progress | Horizontal unlocks only; no accumulating universal stats | LOCKED FOR BUILD |
| Boss gates | Clearly telegraphed, alternate tactical resolutions | LOCKED FOR BUILD |
| Content IP | Unofficial private fan-setting; all playable characters, zones, monsters, portraits and dialogue newly invented; no novel cast or plot | LOCKED |
| Narrative style | Dry sadistic broadcaster; satirical bureaucracy; unexpected moments of heroism | LOCKED FOR BUILD |
| Dependencies | Free/open-source runtime dependencies where available; no additional paid subscriptions mandated | LOCKED |

## Priorities / scope cuts
P0: solo loop, one functional online room, all 6 floors, save/reconnect, deterministic rounds, systemic hazards, combat/gear/classes, achievements, finale, good UX.
P1: advanced sponsor conditions, extra alternative boss solutions, full accessibility settings, 4-player soak tests.
P2: permanent hub decoration, world lore codex, fancy particle effects, meta narrative threads.
EXCLUDED: PvP mode, open-world map, player-made dungeon editor, voice chat, streaming AI services, live spectator users, persistent MMO services, account creation, microtransactions, mobile-first controls, 18 actual floors.

## Scope changes
Any proposed feature must specify (a) what is cut, (b) which test proves it, (c) multiplayer consequences. No silent feature cancellation. Disclose missing features rather than replacing them with static buttons.

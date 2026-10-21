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

## Local implementation decisions — 2026-10-20

- Colyseus 0.16 uses explicit server snapshots over its authenticated transport, rather than sharing writable client state. Phaser is pinned to 3.90.0; original pixel silhouettes are drawn procedurally. No art-generation or external paid service is used.
- Current floors use a 45×45 snake of nine rotated authored prefabs, two optional maintenance links and a lower bypass. The authored objectives and ordered alternate-device operations drive progression; no class is mandatory for the physical route. Hacking or disabling a quest device is an alternate way to perform that same operation. Final uplink stages must occur in order.
- Optional maintenance doors accept quest keys, skill/tool hacks or structural damage. The ordinary route remains open without optional gear.
- Catalog zero-range ally/device items normalize to adjacency; omitted hazard element becomes poison for the spore tool, omitted flash status becomes stunned against an enemy, and party skill range limits affected allies. Named passives resolve through exhaustive tables.
- Short-form `quick_plan` is awarded for a valid unanimous single-action tactical plan. Its narrative achievement name does not measure real-world seconds; achievements remain deterministic from submitted commands and completed rounds.
- A gift is a proposal. The recipient must accept while adjacent; inventory/weight and item presence are checked atomically at acceptance. Stale, replayed, or declined gifts do not move items.
- Spawned map hazards persist until handled; player-created hazards use their catalog duration. This prevents every later-room hazard expiring during the walk from the entrance.
- Solo and co-op use the same reducer and server. Default host bind is loopback; remote/LAN access must be explicitly enabled by the host. No tunnel or public deployment is launched automatically.
- Debug-assisted campaign fixtures start with 500 HP, +8 armor and a rail driver. They still walk, spend AP, resolve combat, operate devices and descend through ordinary actions. These results prove progression, not normal balance or human win rates.

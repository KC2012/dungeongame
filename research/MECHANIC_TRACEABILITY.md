# Traceability: inspiration → original game implementation

**Method:** Publisher product descriptions establish publicly discussed high-level features of the Dungeon Crawler Carl setting; third-party video games illustrate different design solutions. Neither copyrighted passages nor proprietary tabletop rule text is reproduced. All numbers, effect systems, naming and encounter structures in this project are newly proposed and require playtesting.

| Referenced high-level motif | THE CRAWL implementation | Responsible data/system | Required acceptance evidence |
|---|---|---|---|
| Dangerous televised subterranean survival contest | The Concourse, original six-floor broadcast wing | `GAME_BIBLE`, `DUNGEON`, `floors.json` | Floor entry and clear sequence works |
| Original players build their own crawlers | 12 ordinary backgrounds, professions and adaptations | `backgrounds`, `professions`, `adaptations` | Distinct initial tools and later build synergies |
| Transformative choices around third floor | Floor 3 profession + adaptation two-column choice | `floors`, advancement state | Can accept and resume exact choice |
| Dungeon safe rooms | Rest+craft+vendor+reward draft + upcoming preview | `MECHANICS`, UI safe room | Rest cannot be repeated for infinite resources |
| Achievement and reward system | Server events trigger distinct earned achievements and risk/reward offers | `achievements`, `achievement_events`, `DIRECTOR` | Achievement exactly once across replay and reconnect |
| Spectators and sponsors | Audience score, spotlight ledger, eight sponsor factions | `sponsors`, `events`, `DIRECTOR` | Fair rewards, no arbitrary host punishment |
| Environmental ingenuity | Material/element reaction graph | `INTERACTIONS`, `EFFECT_ENGINE`, `hazards` | Wet electric chain, wall breach, chemical reactions |
| Unpredictable loot combinations | 92 functional catalog items across six kinds and ten recipes | `items`, `recipes` | Every item compiles to at least one usable or meaningful passive behavior |
| Nonlinear encounter solutions | Alternate objective route for each floor boss | `floors`, `bosses`, `DUNGEON` | Six boss alternative resolutions executable |
| Roguelike survival and permadeath | Three-round downed state, conditional revival, permanent death | `MECHANICS` | Defeat and revive fixtures |
| Fast repeatability | Procedural rooms, alternate encounter routes, short floors | `rooms`, `DUNGEON` | Measured session duration, 100 seeded valid floor samples |
| Four-player online cooperative survival | Server authority, simultaneous plans, shared XP, safe item draft | `MULTIPLAYER`, `ARCHITECTURE` | Independent four-browser session with reconnect |

## Design lesson sources
- **Official tabletop descriptions:** https://dungeoncrawlercarl.renegadegamestudios.com/blog/renegade-game-studios-announces-two-upcoming-dungeon-crawler-carl-tabletop-games/
- **Caves of Qud:** https://cavesofqud.com/ — simulation emergent systems
- **Rogue Fable IV:** https://store.steampowered.com/app/2720010/Rogue_Fable_IV/ — manageable tactical run pacing
- **Barony:** https://www.baronygame.com/ — 1–4 cooperative dungeon replay
- **Fan browser experiment:** https://github.com/johnbeaird/dcc-browser — one-file prototype as caution against monolithic architecture for network co-op

## Original vs canonical
We are not specifying official copyrighted races, exact character names, plots, official level mechanics, publisher RPG dice math, or verbatim achievements. These entries are original balancing interpretations inside a private fan-setting premise. Book provenance is a design inspiration, not claim of license or canon.

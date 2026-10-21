# Research and precedent — verified public descriptions, 2026-10-20

## Directly relevant adaptations
- Renegade Game Studios official *Dungeon Crawler Carl Roleplaying Game* (announcement 2025-11-18; core book promotional page): custom crawlers, choice of class/race around floor three, achievements, loot, saferooms, mobs. The core rulebook promotional description says it primarily focuses on floors 3–5. This is useful as a feature map, **not a source of copied rules**. https://dungeoncrawlercarl.renegadegamestudios.com/blog/renegade-game-studios-announces-two-upcoming-dungeon-crawler-carl-tabletop-games/ and https://dungeoncrawlercarl.renegadegamestudios.com/dungeon-crawler-carl-rpg-core-rulebook/
- Official *Dungeon Crawler Carl: Unstoppable* tabletop/card product: relevant to cooperative run progression; the presence of a game does not indicate a reusable software system or open license. https://dungeoncrawlercarl.renegadegamestudios.com/
- Fan-made *Dungeon Crawler Carl: The Browser Incident* (public GitHub repository, version 0.4.0 as indexed): HTML Canvas, 23 room layouts, 19 enemy types, spectator-feed parody, achievements, floor bosses. Its README describes real-time play of novel characters; no confirmed online co-op and no permission to reuse code assumed. https://github.com/johnbeaird/dcc-browser

## Established system references
- *Caves of Qud*: systemic interactions and interesting build combinations. Borrow the architecture principle, not code, art or proprietary text. https://cavesofqud.com/
- *Rogue Fable IV*: high-density tactical runs around an hour; important because this is a group game where long sessions are a barrier. https://store.steampowered.com/app/2720010/Rogue_Fable_IV/
- *Barony*: four-player online co-op and permadeath; useful for cooperative resilience, party roles and replayability. https://www.baronygame.com/
- *Streets of Rogue*: systemic alternate solutions; directional reference only. https://store.steampowered.com/app/512900/Streets_of_Rogue/

## Technology verification
- Phaser v3 Tilemap API supports orthogonal tilemaps / JSON and 2D arrays. https://docs.phaser.io/api-documentation/3.90.0/function/tilemaps
- Colyseus provides Node authoritative rooms, typed state synchronization and browser SDK. Its APIs vary by version; install/pin a tested version before writing adapters. https://docs.colyseus.io/ and https://docs.colyseus.io/getting-started
- Cloudflare Quick Tunnels expose temporary localhost HTTP URLs without an account and are explicitly intended for development/testing. Tunnels can stop or change URLs and require integration testing for the game's WebSocket path. https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
- Supabase is a possible future persistence option, but no runtime dependency for v1. Simpler local snapshot storage avoids an additional remote account. https://supabase.com/docs/guides/realtime/limits

## Intellectual property boundaries
The use of recognizable fictional settings or language can implicate rights even when noncommercial. U.S. Copyright Office materials explain that derivative works generally require authorization subject to defenses such as fair use evaluated case-by-case; nonprofit intent is not a blanket exemption. https://copyright.gov/fair-use/ ; https://www.copyright.gov/help/faq/faq-fairuse.html

Working production choice: treat this as a private **unofficial fan-setting** game in a new six-floor wing of a televised world dungeon; use original art, creature names, descriptions, classes, broadcasts, item naming and room concepts. No quotations from books and no cloning branded UI. The setting tie remains legally relevant despite private sharing; separately preserve the ability to convert to an entirely original setting if desired.

## Gaps and limitations
- No paywalled/full official RPG rulebook studied; conclusions from publisher descriptions only.
- No exhaustive census of every fan game; references are an evidence-backed sample.
- Multiplayer deployment topology has not been live-tested; Node + Colyseus + Quick Tunnel compatibility needs an explicit smoke test.
- Recorded baseline date above; verify APIs again when coding, with versions pinned.

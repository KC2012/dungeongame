import { playBot } from "./bot";
for (const players of [1, 4])
  for (const route of ["alternate", "combat"]) {
    const r = playBot(42, players, route);
    console.log(
      JSON.stringify({
        seed: r.seed,
        players,
        route,
        result: r.result,
        floor: r.floor,
        turns: r.turns,
        reason: r.reason,
        party: Object.values(r.state.actors)
          .filter((a) => a.kind === "crawler")
          .map((a) => ({
            hp: a.hp,
            x: a.x,
            y: a.y,
            down: a.downed,
            inventory: a.inventory.map((i) => i.id),
          })),
        recent: r.state.events
          .slice(-3)
          .map((e) => ({ type: e.type, payload: e.payload })),
      }),
    );
  }

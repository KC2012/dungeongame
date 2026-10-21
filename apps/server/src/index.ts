import express from "express";
import { registerCheckpoints } from "./checkpoint-api";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { CrawlRoom, roomCodes, store } from "./room";
import {
  catalog,
  validateCatalog,
  contentHash,
} from "../../../packages/content/src/index";
const errors = validateCatalog();
if (errors.length) throw Error(errors.join("\n"));
const app = express();
app.disable("x-powered-by");
registerCheckpoints(app, store);
app.get("/api/health", (_q, r) =>
  r.json({ ok: true, version: "0.1.1", contentHash }),
);
app.get("/api/profile", (_q, r) => r.json({ unlocks: store.unlocked() }));
app.get("/api/catalog", (_q, r) => r.json(catalog));
app.get("/api/rooms/:code", (q, r) => {
  const id = roomCodes.get(q.params.code.toUpperCase());
  if (!id)
    r.status(404).json({
      error: "Room not active. The host may need to resume it.",
    });
  else r.json({ roomId: id });
});
if (process.argv.includes("--dev")) {
  const { createServer: createVite } = await import("vite");
  const vite = await createVite({
    configFile: resolve("apps/client/vite.config.ts"),
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else app.use(express.static(resolve("dist/client")));
const http = createServer(app);
const server = new Server({
  transport: new WebSocketTransport({
    server: http,
    maxPayload: 32768,
    pingInterval: 15000,
    pingMaxRetries: 4,
  }),
  greet: false,
});
server.define("crawl", CrawlRoom);
const port = Number(process.env.PORT ?? 2567);
await server.listen(port, process.env.HOST ?? "127.0.0.1");
console.log(
  `The Concourse local host listening on port ${port}. No public tunnel is active.`,
);
const stop = async () => {
  await server.gracefullyShutdown(false);
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

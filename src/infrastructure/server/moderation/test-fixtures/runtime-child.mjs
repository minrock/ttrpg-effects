import process from "node:process";
import { createInterface } from "node:readline";
import { createServer } from "node:http";
import { openModerationBackend } from "../../../../../out/api/invitation-backend.mjs";
const lines = createInterface({ input: process.stdin });
let backend, server;
try {
  for await (const line of lines) {
    if (!backend) {
      const config = JSON.parse(line); backend = await openModerationBackend(config.database, { publicOrigin: "http://localhost:8787", secret: config.secret });
      server = createServer((req, res) => { void backend.handler(req, res); }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
      process.stdout.write(JSON.stringify({ ready: true, port: server.address().port }) + "\n");
    } else if (line === "close") break;
  }
} catch { process.stdout.write(JSON.stringify({ unavailable: true }) + "\n"); process.exitCode = 2; }
finally { if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await backend?.close(); lines.close(); }

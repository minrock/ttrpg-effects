import { describe, expect, it } from "vitest";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { Auth } from "./auth";
import { LIMITS } from "./config";

describe("límites de autenticación", () => {
  const config = { host: "127.0.0.1", port: 0, dataDir: "/unused", publicOrigin: "https://private.example", dmKey: "d".repeat(32), playerKey: "p".repeat(32) };
  it("limita sesiones, permite rotación y recupera capacidad al expirar", () => {
    let time = 0; const auth = new Auth(config, () => time); const req = new IncomingMessage(new Socket());
    let token = "";
    for (let i = 0; i < LIMITS.sessions; i++) token = auth.login(req, config.dmKey).token;
    expect(() => auth.login(req, config.dmKey)).toThrow("Hay demasiadas sesiones");
    req.headers.cookie = `ttrpg_session=${token}`;
    const rotated = auth.login(req, config.dmKey).token; expect(rotated).not.toBe(token); expect(auth.get(req)).toBeUndefined();
    time += LIMITS.sessionMs; expect(() => auth.login(req, config.dmKey)).not.toThrow();
  });
  it("límite general con ventana y mapa acotados", () => {
    let time = 0; const auth = new Auth(config, () => time); const req = new IncomingMessage(new Socket());
    for (let i = 0; i < LIMITS.requestsPerMinute; i++) auth.rate(req);
    expect(() => auth.rate(req)).toThrow("Demasiadas solicitudes");
    time += 60_000; expect(() => auth.rate(req)).not.toThrow();
  });
});

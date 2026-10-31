import { describe, expect, it } from "vitest";
import { captureInvitation } from "./invitation-fragment";
import { normalizeAlias } from "../domain/invitations/invitation";
import { AdmissionQuota, guestCookie } from "../server/invitation-http";
const game = "8a94f050-4e4c-4181-a991-5d56d2c92bb0", secret = "A".repeat(43);
describe("entrada009 para011", () => {
  it("limpia history antes de petición/carga opcional y consume una sola vez", async () => {
    const events: string[] = [], location = { pathname: `/jugar/${game}`, search: "", hash: `#invitacion=${secret}` };
    const entry = captureInvitation(location, { state: null, replaceState(_state, _unused, url) { events.push("limpio"); expect(url).toBe(`/jugar/${game}`); location.hash = ""; } });
    const fetch = async () => { expect(location.hash).toBe(""); events.push("fetch"); }; await fetch();
    expect(events).toEqual(["limpio", "fetch"]); expect(entry.consume()).toBe(secret); expect(entry.consume()).toBeUndefined();
  });
  it("fragmentos inválidos y cancelación también eliminan secreto", () => {
    for (const hash of [`#invitacion=${secret}&extra=1`, "#invitacion=bad", "#otro=foo"]) {
      let cleaned = false; const entry = captureInvitation({ pathname: `/jugar/${game}`, search: "", hash }, { state: null, replaceState() { cleaned = true; } }); expect(cleaned).toBe(true); expect(entry.available()).toBe(false);
    }
    const entry = captureInvitation({ pathname: `/jugar/${game}`, search: "", hash: `#invitacion=${secret}` }, { state: null, replaceState() {} }); entry.cancel(); expect(entry.consume()).toBeUndefined();
  });
  it("alias Unicode/NFC, 40 puntos, formato y HTML solo texto", () => {
    expect(normalizeAlias(" A\u0301na ")).toBe("Ána"); expect(normalizeAlias("😀".repeat(40))).toHaveLength(80); expect(normalizeAlias('<b>"Ana"</b>')).toBe('<b>"Ana"</b>');
    for (const value of ["", " ", "😀".repeat(41), "Ana\u202e", "a\u200b", "a\u0000", "a\ud800", "a\u2028"]) expect(() => normalizeAlias(value)).toThrow();
  });
  it("cuotas no crecen por IDs inválidos y saturación falla cerrada", () => {
    let at = 0; const quota = new AdmissionQuota(() => at, 4); quota.consume("1", "a"); quota.consume("1", "b"); quota.consume("1", "c");
    expect(() => quota.consume("2", "z")).toThrow(); expect(quota.size).toBe(4); at = 60000; quota.consume("2", "z"); expect(quota.size).toBe(2);
    const burst = new AdmissionQuota(() => at); for (let n = 0; n < 10; n++) burst.consume("ip", `id${n}`); expect(() => burst.consume("ip", "otro")).toThrow();
    const games = new AdmissionQuota(() => at); for (let n = 0; n < 60; n++) games.consume(`ip${n}`, "game"); expect(() => games.consume("other", "game")).toThrow();
  });
  it("cookie HTTPS y borrado mantienen path y atributos", () => {
    expect(guestCookie(game, secret, true)).toBe(`ttrpg_guest=${secret}; Path=/api/v1/games/${game}/; HttpOnly; SameSite=Strict; Max-Age=28800; Secure`);
    expect(guestCookie(game, "", true)).toBe(`ttrpg_guest=; Path=/api/v1/games/${game}/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`);
  });
});

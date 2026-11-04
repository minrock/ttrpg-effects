import { describe, expect, it } from "vitest";
import { canonicalEmail } from "./index";
import { LoginQuota, passwordCodec, validatePassword } from "./password";
import { readIdentityConfig } from "./config";
import { randomBytes } from "node:crypto";
describe("Política de identidad", () => {
  it("acepta passphrases Unicode sin trim, normalización ni composición; rechaza límites antes del KDF", async () => {
    for (const value of ["a".repeat(9), "a".repeat(129), "😸".repeat(129), "x".repeat(14) + "\uD800", null]) expect(() => validatePassword(value)).toThrow();
    for (const value of [" ".repeat(10), "a".repeat(10), "😸".repeat(10), "a".repeat(128), "😸".repeat(128)]) expect(() => validatePassword(value)).not.toThrow();
    const value = " cafe\u0301 passphrase ", hash = await passwordCodec.hash(value);
    expect(await passwordCodec.verify({ hash, password: value })).toBe(true);
    expect(await passwordCodec.verify({ hash, password: value.normalize("NFKC") })).toBe(false);
    expect(await passwordCodec.verify({ hash, password: value.trim() })).toBe(false);
    expect(await passwordCodec.verify({ hash: "corrupt", password: value })).toBe(false);
  });
  it("rechaza más de dos KDF reales sin cola y libera cupos después", async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => passwordCodec.hash("passphrase concurrency 123")));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(2);
    expect(results.filter(result => result.status === "rejected" && result.reason.code === "RATE_LIMITED")).toHaveLength(10);
    expect(await passwordCodec.hash("passphrase after saturation")).toContain("scrypt$v1$131072$8$1$");
  });
  it("cuotas por peer e identificador y configuración optativa sin secretos legados", () => {
    const id = new LoginQuota(); for (let n = 0; n < 5; n++) id.consume("ip" + n, "same"); expect(() => id.consume("other", "same")).toThrow();
    const ip = new LoginQuota(); for (let n = 0; n < 10; n++) ip.consume("same", "id" + n); expect(() => ip.consume("same", "other")).toThrow();
    expect(canonicalEmail("  USER+tag@Example.test  ")).toBe("user+tag@example.test"); expect(() => canonicalEmail("x\n@y.test")).toThrow();
    expect(() => readIdentityConfig({})).toThrow(/TTRPG_AUTH_SECRET/); expect(() => readIdentityConfig({TTRPG_IDENTITY_ENABLED:"false"})).toThrow(/retira el selector legado/); expect(() => readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true" })).toThrow();
    const secret = randomBytes(32).toString("base64url");
    expect(readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true", TTRPG_AUTH_SECRET: secret, TTRPG_PUBLIC_ORIGIN: "https://example.test" })).toEqual({ secret, publicOrigin: "https://example.test" });
    expect(() => readIdentityConfig({ TTRPG_IDENTITY_ENABLED: "true", TTRPG_AUTH_SECRET: secret, TTRPG_DM_KEY: secret, TTRPG_PUBLIC_ORIGIN: "https://example.test" })).toThrow();
  });
});

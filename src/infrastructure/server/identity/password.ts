import { passwordProblem } from "../../../application/services/identity-validation";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { IdentityError } from "../../../application/services/identity";
export function validatePassword(password: unknown): asserts password is string {
  if (passwordProblem(password)) throw new IdentityError("INVALID_INPUT");
}
const prefix = "scrypt$v1$131072$8$1$";
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
/** Un presupuesto por proceso, compartido por todas las instancias y operaciones. Sin cola. */
let activeHashes = 0;
async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (activeHashes >= 2) throw new IdentityError("RATE_LIMITED");
  activeHashes++;
  try { return await work(); } finally { activeHashes--; }
}
export const passwordCodec = {
  async hash(password: string): Promise<string> {
    validatePassword(password);
    return limited(async () => { const salt = randomBytes(16); return prefix + salt.toString("hex") + "$" + (await derive(password, salt)).toString("hex"); });
  },
  async verify({ hash, password }: { hash: string; password: string }): Promise<boolean> {
    validatePassword(password);
    return limited(async () => {
      const valid = /^scrypt\$v1\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash);
      const parts = hash.split("$");
      // Un registro corrupto/inexistente consume el mismo KDF, sin parámetros controlados por datos.
      const actual = await derive(password, valid ? Buffer.from(parts[5], "hex") : Buffer.alloc(16));
      return valid && timingSafeEqual(actual, Buffer.from(parts[6], "hex"));
    });
  }
};
export class LoginQuota {
  private readonly counts = new Map<string, { count: number; until: number }>();
  consume(peer: string, email: string): void {
    const now = Date.now();
    for (const [key, entry] of this.counts) if (entry.until <= now) this.counts.delete(key);
    const keys: [string, number][] = [["global", 120], ["ip:" + peer, 10], ["id:" + createHash("sha256").update(email).digest("hex"), 5]];
    if (this.counts.size > 10000 || keys.some(([key, max]) => (this.counts.get(key)?.count ?? 0) >= max)) throw new IdentityError("RATE_LIMITED");
    for (const [key] of keys) { const entry = this.counts.get(key) ?? { count: 0, until: now + 60000 }; entry.count++; this.counts.set(key, entry); }
  }
}

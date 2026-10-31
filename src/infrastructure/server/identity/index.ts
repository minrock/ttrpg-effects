import { randomUUID, createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { makeSignature } from "better-auth/crypto";
import { z } from "zod";
import { IdentityError, type IdentityService, type NewAccount } from "../../../application/services/identity";
import type { AccountDto, IdentitySessionDto } from "../../../shared/contracts/identity";
import { ownedRepositories } from "../owned/repository";
import type { DatabaseConfig } from "../database/config";
import type { CommitEffects } from "../../../application/services/owned-store";
import type { SqlConnection } from "../database/driver";
import { identityDatabase } from "./database";
import { validateIdentityConfig, type IdentityConfig } from "./config";
import { LoginQuota, passwordCodec, validatePassword } from "./password";
const emailSchema = z.email().max(254);
export function canonicalEmail(value: unknown): string {
  if (typeof value !== "string") throw new IdentityError("INVALID_INPUT");
  const email = value.trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) throw new IdentityError("INVALID_INPUT");
  return email;
}
function accountInput(input: NewAccount): NewAccount {
  validatePassword(input.password);
  const name = input.name.trim();
  if (!name || [...name].length > 100 || [...input.name].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new IdentityError("INVALID_INPUT");
  return { email: canonicalEmail(input.email), name, password: input.password };
}
function revision(user: object | undefined): number {
  const value = user && "authVersion" in user ? user.authVersion : undefined;
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new IdentityError("UNAVAILABLE");
  return Number(value);
}
function account(user: Record<string, unknown>): AccountDto {
  if (!["admin", "dm"].includes(String(user.role)) || typeof user.enabled !== "boolean" || typeof user.mustChangePassword !== "boolean" || !Number.isSafeInteger(user.authVersion) || Number(user.authVersion) < 0) throw new IdentityError("UNAVAILABLE");
  return { id: String(user.id), email: String(user.email), name: String(user.name), role: user.role as "admin" | "dm", enabled: user.enabled, mustChangePassword: user.mustChangePassword, emailVerified: user.emailVerified === true,
    createdAt: new Date(user.createdAt as string).toISOString(), updatedAt: new Date(user.updatedAt as string).toISOString() };
}
export async function openIdentity(database: DatabaseConfig, config: IdentityConfig, clock = { now: () => new Date(), id: randomUUID }, lifecycle: { openingInvalidated?: (game: string) => void; accountDisabled?: (owner: string) => void; sessionRevoked?: (owner: string, session?: string) => void } = {}, expectedAccount: () => string | undefined = () => undefined): Promise<IdentityService> {
  validateIdentityConfig(config);
  const unit = await identityDatabase(database);
  const secure = config.publicOrigin.startsWith("https:");
  const cookieName = `${secure ? "__Secure-" : ""}ttrpg_identity.session_token`;
  const auth = betterAuth({
    appName: "TTRPG Identity", baseURL: config.publicOrigin, basePath: "/api/v1/identity/internal-unmounted", secret: config.secret,
    database: { db: unit.db, type: database.driver, transaction: false },
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 15, maxPasswordLength: 256, password: { hash: value => passwordCodec.hash(value), verify: input => passwordCodec.verify(input) } },
    user: { modelName: "identity_user", additionalFields: {
      authVersion: { type: "number", required: true, input: false, defaultValue: 0 },
      role: { type: "string", required: true, input: false, defaultValue: "dm" },
      enabled: { type: "boolean", required: true, input: false, defaultValue: true },
      mustChangePassword: { type: "boolean", required: true, input: false, defaultValue: true }
    } },
    account: { modelName: "identity_account" }, verification: { modelName: "identity_verification" },
    session: { modelName: "identity_session", expiresIn: 28800, disableSessionRefresh: true, cookieCache: { enabled: false } },
    advanced: { database: { validateSchema: false }, cookiePrefix: "ttrpg_identity", useSecureCookies: secure,
      defaultCookieAttributes: { httpOnly: true, sameSite: "strict", path: "/api/v1", secure },
      disableCSRFCheck: false, disableOriginCheck: false },
    trustedOrigins: [config.publicOrigin], logger: { disabled: true }, telemetry: { enabled: false }
  });
  let context: Awaited<typeof auth.$context>;
  try { context = await auth.$context; } catch { await unit.close(); throw new IdentityError("UNAVAILABLE"); }
  const adapter = context.internalAdapter;
  const quota = new LoginQuota();
  const fingerprint = createHash("sha256").update(config.secret).digest("hex");
  try {
    await unit.transaction(async c => {
      const prior = (await c.query("SELECT value FROM identity_settings WHERE key='secret-fingerprint'")).rows[0]?.value;
      if (prior && prior !== fingerprint) {
        await context.adapter.deleteMany({ model: "session", where: [] });
        await audit(c, "local-operator", "all-accounts", "rotate-secret");
      }
      await c.query("INSERT INTO identity_settings(key,value) VALUES('secret-fingerprint',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [fingerprint]);
    });
  } catch (error) { await unit.close(); throw error; }
  const transaction = <T>(work: (c: SqlConnection, effects: CommitEffects) => Promise<T>) => unit.transaction(async (c, effects) => {
    if ((await c.query("SELECT value FROM identity_settings WHERE key='secret-fingerprint'")).rows[0]?.value !== fingerprint) throw new IdentityError("UNAVAILABLE");
    return work(c, effects);
  });
  const cookie = (value: string) => `${cookieName}=${value}; Path=/api/v1; HttpOnly; SameSite=Strict; Max-Age=${value ? 28800 : 0}${secure ? "; Secure" : ""}`;
  async function audit(c: SqlConnection, actor: string, target: string, action: string) {
    await c.query("INSERT INTO identity_audit(id,actor,target,action,at,result) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), actor, target, action, new Date().toISOString(), "success"]);
  }
  async function principal(rawCookie: string, permission?: "admin" | "dm", functional = false): Promise<IdentitySessionDto> {
    const result = await auth.api.getSession({ headers: new Headers({ cookie: rawCookie }), query: { disableRefresh: true, disableCookieCache: true } });
    if (!result) throw new IdentityError("UNAUTHORIZED");
    const dto = account(result.user);
    if (!dto.enabled || expectedAccount() !== undefined && dto.id !== expectedAccount()) throw new IdentityError("UNAUTHORIZED");
    if ((permission || functional) && dto.mustChangePassword) throw new IdentityError("PASSWORD_CHANGE_REQUIRED");
    if (permission && dto.role !== permission) throw new IdentityError("FORBIDDEN");
    return { account: dto, sessionId: result.session.id, expiresAt: new Date(result.session.expiresAt).toISOString() };
  }
  const credentials = async (email: string) => {
    const result = await adapter.findUserByEmail(email, { includeAccounts: true });
    const hash = result?.accounts.find(a => a.providerId === "credential" && a.accountId === result.user.id)?.password ?? "";
    return { user: result?.user, hash };
  };
  async function create(c: SqlConnection, input: NewAccount, hash: string, role: "admin" | "dm", actor: string): Promise<AccountDto> {
    if (await adapter.findUserByEmail(input.email)) throw new IdentityError("CONFLICT");
    const user = await adapter.createUser({ email: input.email, name: input.name, emailVerified: false, role, enabled: true, mustChangePassword: true, authVersion: 0 }, { method: "admin" });
    await adapter.createAccount({ userId: user.id, accountId: user.id, providerId: "credential", password: hash });
    await audit(c, actor, user.id, role === "admin" ? "bootstrap" : "create-dm");
    return account(user);
  }
  return {
    async login(rawEmail, password, peer) {
      const email = canonicalEmail(rawEmail); validatePassword(password); quota.consume(peer, email);
      const before = await transaction(() => credentials(email));
      const verified = await context.password.verify({ hash: before.hash, password });
      if (!verified || !before.user) throw new IdentityError("UNAUTHORIZED");
      return transaction(async () => {
        const current = await credentials(email);
        if (!current.user || current.user.id !== before.user!.id || current.hash !== before.hash || revision(current.user) !== revision(before.user) || !account(current.user).enabled) throw new IdentityError("UNAUTHORIZED");
        const session = await adapter.createSession(current.user.id, false);
        if (!session) throw new IdentityError("UNAVAILABLE");
        return { identity: { account: account(current.user), sessionId: session.id, expiresAt: session.expiresAt.toISOString() }, cookie: cookie(encodeURIComponent(session.token + "." + await makeSignature(session.token, config.secret))) };
      });
    },
    session: rawCookie => transaction(() => principal(rawCookie)),
    async logout(rawCookie, all = false) {
      await transaction(async (c, effects) => {
        let current: IdentitySessionDto;
        try { current = await principal(rawCookie); } catch (error) { if (!all && error instanceof IdentityError && error.code === "UNAUTHORIZED") return; throw error; }
        if (all) await adapter.deleteUserSessions(current.account.id);
        else await context.adapter.delete({ model: "session", where: [{ field: "id", value: current.sessionId }] });
        await audit(c, current.account.id, current.account.id, all ? "logout-all" : "logout");
        effects.afterCommit(() => lifecycle.sessionRevoked?.(current.account.id, all ? undefined : current.sessionId), () => lifecycle.sessionRevoked?.(current.account.id));
      });
    },
    async changePassword(rawCookie, currentPassword, newPassword) {
      validatePassword(currentPassword); validatePassword(newPassword);
      if (currentPassword === newPassword) throw new IdentityError("INVALID_INPUT");
      const snapshot = await transaction(async () => { const identity = await principal(rawCookie); return { identity, ...await credentials(identity.account.email) }; });
      if (!await context.password.verify({ hash: snapshot.hash, password: currentPassword })) throw new IdentityError("UNAUTHORIZED");
      const hash = await context.password.hash(newPassword);
      await transaction(async (c, effects) => {
        const current = await principal(rawCookie); const old = await credentials(current.account.email);
        if (current.sessionId !== snapshot.identity.sessionId || old.hash !== snapshot.hash) throw new IdentityError("UNAUTHORIZED");
        await adapter.updatePassword(current.account.id, hash);
        await adapter.updateUser(current.account.id, { mustChangePassword: false, authVersion: revision(old.user) + 1, updatedAt: new Date() });
        await adapter.deleteUserSessions(current.account.id);
        await audit(c, current.account.id, current.account.id, "change-password");
        effects.afterCommit(() => lifecycle.sessionRevoked?.(current.account.id), () => lifecycle.sessionRevoked?.(current.account.id));
      });
    },
    async createDm(rawCookie, data) {
      await transaction(() => principal(rawCookie, "admin"));
      const input = accountInput(data), hash = await context.password.hash(input.password);
      return transaction(async c => create(c, input, hash, "dm", (await principal(rawCookie, "admin")).account.id));
    },
    async listDms(rawCookie, limit, offset) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) throw new IdentityError("INVALID_INPUT");
      return transaction(async () => {
        await principal(rawCookie, "admin");
        const where = [{ field: "role", value: "dm" }];
        const users = await context.adapter.findMany<Record<string, unknown>>({ model: "user", where, limit, offset, sortBy: { field: "id", direction: "asc" } });
        return { accounts: users.map(account), total: await context.adapter.count({ model: "user", where }) };
      });
    },
    async administer(rawCookie, id, action, password) {
      await transaction(() => principal(rawCookie, "admin"));
      const hash = action === "password" ? (validatePassword(password), await context.password.hash(password)) : undefined;
      await transaction(async (c, effects) => {
        const actor = await principal(rawCookie, "admin"); const user = await adapter.findUserById(id);
        if (!user || account(user).role !== "dm") throw new IdentityError("NOT_FOUND");
        if (action === "disable" || action === "enable") await adapter.updateUser(id, { enabled: action === "enable", authVersion: revision(user) + 1, updatedAt: new Date() });
        if (hash) { await adapter.updatePassword(id, hash); await adapter.updateUser(id, { mustChangePassword: true, authVersion: revision(user) + 1, updatedAt: new Date() }); }
        if (action === "revoke-sessions") await adapter.updateUser(id, { authVersion: revision(user) + 1, updatedAt: new Date() });
        if (action !== "enable") await adapter.deleteUserSessions(id);
        if (action === "disable") await c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE host_account_id=$2 AND state='open'", [new Date().toISOString(), id]);
        await audit(c, actor.account.id, id, action);
        if (action !== "enable") effects.afterCommit(() => { if (action === "disable" || action === "password") lifecycle.accountDisabled?.(id); else lifecycle.sessionRevoked?.(id); }, () => lifecycle.accountDisabled?.(id));
      });
    },
    async bootstrap(data) {
      const input = accountInput(data), hash = await context.password.hash(input.password);
      return transaction(async c => {
        if (await context.adapter.count({ model: "user" })) throw new IdentityError("CONFLICT");
        return create(c, input, hash, "admin", "local-operator");
      });
    },
    async recoverAdmin(rawEmail, password) {
      const email = canonicalEmail(rawEmail); validatePassword(password);
      const hash = await context.password.hash(password);
      await transaction(async c => {
        const record = await credentials(email);
        if (!record.user || account(record.user).role !== "admin") throw new IdentityError("NOT_FOUND");
        await adapter.updatePassword(record.user.id, hash);
        await adapter.updateUser(record.user.id, { mustChangePassword: true, authVersion: revision(record.user) + 1, updatedAt: new Date() });
        await adapter.deleteUserSessions(record.user.id); await audit(c, "local-operator", record.user.id, "recover-admin");
      });
    },
    authorized: (rawCookie, role, work) => transaction(async (connection, effects) => {
      const identity = await principal(rawCookie, role, true);
      let active = true;
      const pending: Promise<unknown>[] = []; let rejected = false, failure: unknown;
      const checks: Array<() => Promise<void>> = [];
      const owned = ownedRepositories(work => {
        if (!active) return Promise.reject(new IdentityError("UNAVAILABLE"));
        let operation: Promise<unknown>;
        try { operation = work(connection); } catch (error) { operation = Promise.reject(error); }
        const tracked = operation.catch(error => {
          if (!rejected) { rejected = true; failure = error ?? new IdentityError("UNAVAILABLE"); }
          throw error;
        });
        pending.push(tracked.catch(() => undefined)); return tracked as ReturnType<typeof work>;
      }, identity, clock, {
        beforeCommit(check) { if (!active) throw new IdentityError("UNAVAILABLE"); checks.push(check); },
        afterCommit(apply, uncertain) { if (!active) throw new IdentityError("UNAVAILABLE"); effects.afterCommit(apply, uncertain); }
      }, lifecycle.openingInvalidated);
      try {
        const result = await work(identity, owned);
        // Resolver escrituras ya iniciadas antes de validar el contexto que se publicará.
        for (let observed = 0; observed < pending.length;) { const batch = pending.slice(observed); observed = pending.length; await Promise.all(batch); }
        if (rejected) throw failure;
        for (const check of checks) await check();
        await owned.verifyInvariants();
        active = false; await Promise.all(pending); if (rejected) throw failure;
        await principal(rawCookie, role, true); return result;
      }
      finally { active = false; await Promise.all(pending); }
    }),
    clearCookie: () => cookie(""), close: () => unit.close()
  };
}

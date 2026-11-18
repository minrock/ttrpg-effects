import { isRecentArcId, readRecentArc, type RecentArcVisit } from "../../domain/campaigns/recent-arc";

export interface CampaignRecentScope {
  readonly origin: string;
  readonly accountId: string;
  readonly campaignId: string;
}

export interface CampaignRecentsOptions {
  readonly signal?: AbortSignal;
  readonly now?: number;
}

interface StoredRecentArc extends CampaignRecentScope, RecentArcVisit {
  readonly key: string;
}

const DATABASE = "ttrpg-campaign-recents-v1";
const STORE = "recents";
const maxOriginLength = 2_048;
const maxAccountIdLength = 128;

function request<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("No se pudo actualizar el reciente local."));
    transaction.onerror = () => undefined;
  });
}

function validScope(value: CampaignRecentScope): boolean {
  return typeof value.origin === "string"
    && value.origin.length > 0
    && value.origin.length <= maxOriginLength
    && value.origin === value.origin.trim()
    && typeof value.accountId === "string"
    && value.accountId.length > 0
    && value.accountId.length <= maxAccountIdLength
    && value.accountId === value.accountId.trim()
    && isRecentArcId(value.campaignId);
}

function scopeKey(scope: CampaignRecentScope): string {
  return JSON.stringify([scope.origin, scope.accountId, scope.campaignId]);
}

function aborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

/**
 * Persistencia local deliberadamente independiente de borradores y del
 * servidor. Sus fallos devuelven ausencia: navegar nunca depende de IndexedDB.
 */
export class IndexedDbCampaignRecents {
  private readonly generations = new Map<string, number>();

  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}

  private async open(): Promise<IDBDatabase> {
    if (!this.factory) throw new Error("IndexedDB no está disponible.");
    const opening = this.factory.open(DATABASE, 1);
    opening.onupgradeneeded = () => {
      const database = opening.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "key" });
    };
    const database = await request(opening);
    database.onversionchange = () => database.close();
    return database;
  }

  private async run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (aborted(signal)) throw new Error("La operación local fue cancelada.");
    const database = await this.open();
    const transaction = database.transaction(STORE, mode);
    const done = complete(transaction);
    const cancel = () => {
      try {
        transaction.abort();
      } catch {
        // La transacción ya terminó; su resultado ya es definitivo.
      }
    };
    signal?.addEventListener("abort", cancel, { once: true });
    void done.catch(() => undefined);
    try {
      const value = await work(transaction.objectStore(STORE));
      await done;
      return value;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // La transacción ya terminó.
      }
      throw error;
    } finally {
      signal?.removeEventListener("abort", cancel);
      database.close();
    }
  }

  /** Devuelve solo una visita vigente; un fallo local se comporta como ausencia. */
  async get(scope: CampaignRecentScope, options: CampaignRecentsOptions = {}): Promise<RecentArcVisit | null> {
    if (!validScope(scope) || aborted(options.signal)) return null;
    try {
      const row = await this.run("readonly", store => request(store.get(scopeKey(scope))), options.signal);
      if (aborted(options.signal) || !this.matchesScope(row, scope)) return null;
      return readRecentArc(row, options.now);
    } catch {
      return null;
    }
  }

  /**
   * Reemplaza la única visita de este origen/cuenta/campaña. `false` significa
   * que no se escribió (cancelación, entrada inválida o almacenamiento fallido).
   */
  async record(scope: CampaignRecentScope, visit: RecentArcVisit, options: CampaignRecentsOptions = {}): Promise<boolean> {
    if (!validScope(scope) || !readRecentArc(visit, options.now) || aborted(options.signal)) return false;
    const key = scopeKey(scope);
    const generation = this.generations.get(key) ?? 0;
    try {
      return await this.run("readwrite", async store => {
        if (aborted(options.signal) || generation !== (this.generations.get(key) ?? 0)) return false;
        const value: StoredRecentArc = { ...scope, ...visit, key };
        await request(store.put(value));
        return !aborted(options.signal) && generation === (this.generations.get(key) ?? 0);
      }, options.signal);
    } catch {
      return false;
    }
  }

  /** Borra solo el ámbito actual e invalida escrituras iniciadas antes del borrado. */
  async clear(scope: CampaignRecentScope, options: CampaignRecentsOptions = {}): Promise<boolean> {
    if (!validScope(scope) || aborted(options.signal)) return false;
    const key = scopeKey(scope);
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    try {
      await this.run("readwrite", async store => {
        if (aborted(options.signal)) return;
        await request(store.delete(key));
      }, options.signal);
      return !aborted(options.signal);
    } catch {
      return false;
    }
  }

  private matchesScope(value: unknown, scope: CampaignRecentScope): value is StoredRecentArc {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<StoredRecentArc>;
    return candidate.key === scopeKey(scope)
      && candidate.origin === scope.origin
      && candidate.accountId === scope.accountId
      && candidate.campaignId === scope.campaignId;
  }
}

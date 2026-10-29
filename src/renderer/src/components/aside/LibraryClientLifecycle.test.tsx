// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNpcLibraryEntry, createPlayerCharacterLibraryEntry } from "../../../../domain/entity-library/entity-library";
import { createMonsterLibraryEntry } from "../../../../domain/monster-library/monster-library";
import { createClient, type TtrpgClient } from "../../../../shared/api/client";
import type { TtrpgApi } from "../../../../shared/api/ttrpg-api";
import { ClientProvider } from "../../client/ClientProvider";
import { NpcLibraryModal } from "./NpcLibraryModal";
import { MonsterLibraryModal } from "./MonsterLibraryModal";
import { PlayerCharacterLibraryModal } from "./PlayerCharacterLibraryModal";

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const options = { id: "same-id", now: new Date("2026-10-28") };
const cases = [
  { name: "NPC", method: "searchNpcLibrary", entry: (name: string) => createNpcLibraryEntry({ name, imagePath: name }, options), content: () => <NpcLibraryModal existingIds={[]} onAddNpc={() => {}} onClose={() => {}} /> },
  { name: "monster", method: "searchMonsterLibrary", entry: (name: string) => createMonsterLibraryEntry({ name, system: "test", contentMarkdown: "", imagePath: name }, options), content: () => <MonsterLibraryModal templates={[]} existingIds={[]} onAddMonster={() => {}} onClose={() => {}} /> },
  { name: "character", method: "searchPlayerCharacterLibrary", entry: (characterName: string) => createPlayerCharacterLibraryEntry({ characterName, imagePath: characterName }, options), content: () => <PlayerCharacterLibraryModal existingIds={[]} onAddCharacter={() => {}} onClose={() => {}} /> }
];
type Entry = ReturnType<(typeof cases)[number]["entry"]>;
type Result = { ok: true; entries: Entry[] };

describe.each(cases)("$name library client lifecycle", ({ method, entry, content }) => {
  let root: Root, host: HTMLDivElement;
  const capabilities = { scenes: false, images: true, libraries: true, player: false, dice: false, nativeMenus: false };
  function client(search: () => Promise<Result>, resolveImage: (path: string) => Promise<string | null> = async path => `https://example.test/${path}`): TtrpgClient {
    // Deliberately partial test double; the production API remains required.
    return createClient({ [method]: search, resolveAsideUrl: resolveImage } as unknown as TtrpgApi, capabilities);
  }
  async function render(value: TtrpgClient | null) { await act(async () => root.render(<StrictMode><ClientProvider client={value}>{content()}</ClientProvider></StrictMode>)); }
  async function search() { await act(async () => { await vi.advanceTimersByTimeAsync(180); }); }
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers(); host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
  it("rejects a late query from A and keeps B loading until its own reply", async () => {
    const a = deferred<Result>(), b = deferred<Result>();
    await render(client(() => a.promise)); await search();
    await render(client(() => b.promise)); await search();
    await act(async () => a.resolve({ ok: true, entries: [entry("old-a")] }));
    expect(document.body.textContent).not.toContain("old-a");
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await act(async () => b.resolve({ ok: true, entries: [entry("current-b")] }));
    expect(document.body.textContent).toContain("current-b");
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });
  it("ignores a late image resolution and an old error after switching clients", async () => {
    const imageA = deferred<string | null>();
    await render(client(async () => ({ ok: true, entries: [entry("old-a")] }), () => imageA.promise)); await search();
    expect(document.body.textContent).toContain("old-a");
    await render(client(async () => ({ ok: true, entries: [entry("current-b")] }))); await search();
    await act(async () => imageA.resolve("https://example.test/old-a"));
    expect(document.body.textContent).not.toContain("old-a");
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://example.test/current-b");
    const queryA = deferred<Result>();
    await render(client(() => queryA.promise)); await search();
    await render(client(async () => ({ ok: true, entries: [entry("new-b")] }))); await search();
    await act(async () => queryA.reject(new Error("old failure")));
    expect(document.body.textContent).not.toContain("old failure");
    expect(document.body.textContent).toContain("new-b");
  });
  it("clears previous entries when unavailable and ignores outstanding replies after disable/unmount", async () => {
    const pending = deferred<Result>();
    const active = client(async () => ({ ok: true, entries: [entry("previous")] }));
    await render(active); await search(); expect(document.body.textContent).toContain("previous");
    await render(client(() => pending.promise)); await search();
    await render(createClient(active.api, { ...capabilities, libraries: false }));
    expect(document.body.textContent).not.toContain("previous");
    await act(async () => pending.resolve({ ok: true, entries: [entry("stale-disabled")] }));
    expect(document.body.textContent).not.toContain("stale-disabled");
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    const final = deferred<Result>(); await render(client(() => final.promise)); await search();
    await act(async () => root.render(null)); await act(async () => final.resolve({ ok: true, entries: [entry("unmounted")] }));
    expect(document.body.textContent).not.toContain("unmounted");
  });
});

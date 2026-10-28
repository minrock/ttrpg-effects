import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDiceDraft, expandDice, type DicePresentation } from "../../domain/dice/dice";
import { DiceRollAudio } from "./DiceRollAudio";

const contexts: FakeContext[] = [];
const fakeSource = () => ({ buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null });
const fakeGain = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } });
class FakeContext {
  currentTime = 20;
  state = "running";
  destination = {};
  sources: ReturnType<typeof fakeSource>[] = [];
  gains: ReturnType<typeof fakeGain>[] = [];
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  decodeAudioData = vi.fn(async () => ({ duration: .5, length: 500, numberOfChannels: 1, sampleRate: 1000, getChannelData: () => Float32Array.from({ length: 500 }, (_, i) => i < 50 ? 0 : .1) }));
  constructor() { contexts.push(this); }
  createBufferSource() {
    const source = fakeSource();
    this.sources.push(source); return source;
  }
  createGain() {
    const gain = fakeGain();
    this.gains.push(gain); return gain;
  }
}
function presentation(count = 1): DicePresentation {
  const draft = { ...defaultDiceDraft(), groups: [{ id: "g", damageType: "none" as const, dice: { d6: count } }] };
  const dice = expandDice({ requestId: "r", contextToken: "c", draft, d20: null });
  const heights = [3, .7, 1, .8, .6, .8, .6, .8];
  return { rollId: "r", contextToken: "c", sceneId: "s", mapId: "m", dice, appearance: draft.appearance,
    replay: { frames: heights.flatMap(z => dice.flatMap(() => [0, 0, z, 0, 0, 0, 1])), frameCount: heights.length, stepMs: 100, durationMs: 700 },
    result: null, startedAt: 10180, settledAt: 10880 };
}
async function flush() { for (let i = 0; i < 15; i++) await Promise.resolve(); }

describe("dice audio lifecycle", () => {
  let audio: DiceRollAudio;
  beforeEach(() => {
    contexts.length = 0;
    vi.spyOn(Date, "now").mockReturnValue(10000);
    vi.stubGlobal("AudioContext", FakeContext);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })));
    audio = new DiceRollAudio();
  });
  afterEach(() => { audio.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("does not create an AudioContext until the launch gesture", async () => {
    audio.present(presentation()); await flush();
    expect(contexts).toHaveLength(0); expect(fetch).not.toHaveBeenCalled();
  });
  it("decodes seven bundled recordings once and schedules bounded impacts on the presentation clock", async () => {
    audio.unlock(); audio.present(presentation()); await flush();
    const context = contexts[0];
    expect(fetch).toHaveBeenCalledTimes(7); expect(context.decodeAudioData).toHaveBeenCalledTimes(7);
    expect(context.sources).toHaveLength(2);
    expect(context.sources[0].start.mock.calls[0][0]).toBe(20.28);
    expect(context.sources[0].start.mock.calls[0][1]).toBeCloseTo(.045);
    expect(context.sources[1].start.mock.calls[0][0]).toBe(20.78);
    expect(context.sources[1].stop.mock.calls[0][0]).toBeCloseTo(20.88);
    expect(context.gains[0].gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0]).toBe(0);
    audio.unlock(); await flush(); expect(fetch).toHaveBeenCalledTimes(7);
  });
  it("uses the single/multiple recording banks according to physical die count", async () => {
    audio.unlock(); await flush(); const context = contexts[0];
    audio.present(presentation()); await flush();
    expect(context.decodeAudioData.mock.results.slice(0, 4).map(r => r.value)).toHaveLength(4);
    const singleBuffers = await Promise.all(context.decodeAudioData.mock.results.slice(0, 4).map(r => r.value));
    expect(singleBuffers).toContain(context.sources[0].buffer);
    audio.present({ ...presentation(24), rollId: "next" }); await flush();
    const multipleBuffers = await Promise.all(context.decodeAudioData.mock.results.slice(4).map(r => r.value));
    expect(multipleBuffers).toContain(context.sources[2].buffer);
    expect(context.sources).toHaveLength(4);
  });
  it("never restarts a duplicate event, summary toggle or already finished roll", async () => {
    audio.unlock(); audio.present(presentation()); await flush();
    audio.present({ ...presentation(), result: null }); await flush();
    expect(contexts[0].sources).toHaveLength(2);
    audio.present(null); vi.mocked(Date.now).mockReturnValue(12000);
    audio.present({ ...presentation(), rollId: "old" }); await flush();
    expect(contexts[0].sources).toHaveLength(2);
  });
  it("skips missed contacts without playing catch-up audio", async () => {
    vi.mocked(Date.now).mockReturnValue(10500);
    audio.unlock(); audio.present(presentation()); await flush();
    expect(contexts[0].sources).toHaveLength(1);
    expect(contexts[0].sources[0].start.mock.calls[0][0]).toBe(20.28);
  });
  it("cancels scheduled voices and disconnects nodes on mute, without replaying on unmute", async () => {
    audio.unlock(); audio.present(presentation()); await flush();
    audio.setEnabled(false);
    for (const source of contexts[0].sources) { expect(source.stop).toHaveBeenLastCalledWith(); expect(source.disconnect).toHaveBeenCalledOnce(); }
    for (const gain of contexts[0].gains) expect(gain.disconnect).toHaveBeenCalledOnce();
    audio.setEnabled(true); audio.present(presentation()); await flush();
    expect(contexts[0].sources).toHaveLength(2);
  });
  it.each(["close", "context", "mute", "dispose"])("does not schedule a pending load after %s", async action => {
    audio.unlock(); audio.present(presentation());
    if (action === "close") audio.present(null);
    if (action === "context") audio.stop();
    if (action === "mute") audio.setEnabled(false);
    if (action === "dispose") audio.dispose();
    await flush(); expect(contexts[0].sources).toHaveLength(0);
  });
  it("waits for async AudioContext activation before scheduling", async () => {
    audio.unlock(); const context = contexts[0];
    let resume!: () => void;
    context.state = "suspended";
    context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { context.state = "running"; resolve(); }; }));
    audio.unlock(); audio.present(presentation()); await flush();
    expect(context.sources).toHaveLength(0);
    resume(); await flush(); expect(context.sources).toHaveLength(2);
  });
  it("releases ended voices, and disposes the context once", async () => {
    audio.unlock(); audio.present(presentation()); await flush();
    const context = contexts[0], first = context.sources[0]; first.onended?.();
    audio.dispose();
    expect(first.disconnect).toHaveBeenCalledOnce(); expect(context.close).toHaveBeenCalledOnce();
    expect(context.sources[1].disconnect).toHaveBeenCalledOnce();
  });
  it.each(["unavailable", "fetch", "suspended"])("fails silently when audio is %s", async failure => {
    if (failure === "unavailable") vi.stubGlobal("AudioContext", undefined);
    if (failure === "fetch") vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    expect(() => audio.unlock()).not.toThrow();
    if (failure === "suspended") contexts[0].state = "suspended";
    audio.present(presentation()); await flush();
    expect(contexts[0]?.sources ?? []).toHaveLength(0);
  });
});

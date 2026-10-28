import type { DicePresentation } from "../../domain/dice/dice";
import { planDiceSounds } from "../../domain/dice/sound";

const SOUNDS = {
  single: [
    new URL("../../../assets/dice/audio/die-throw-1.ogg", import.meta.url).href,
    new URL("../../../assets/dice/audio/die-throw-2.ogg", import.meta.url).href,
    new URL("../../../assets/dice/audio/die-throw-3.ogg", import.meta.url).href,
    new URL("../../../assets/dice/audio/die-throw-4.ogg", import.meta.url).href
  ],
  multiple: [
    new URL("../../../assets/dice/audio/dice-throw-1.ogg", import.meta.url).href,
    new URL("../../../assets/dice/audio/dice-throw-2.ogg", import.meta.url).href,
    new URL("../../../assets/dice/audio/dice-throw-3.ogg", import.meta.url).href
  ]
};
interface Recording { readonly buffer: AudioBuffer; readonly offset: number }

function recording(buffer: AudioBuffer): Recording {
  let onset = buffer.length;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const first = buffer.getChannelData(channel).findIndex(sample => Math.abs(sample) > .01);
    if (first >= 0) onset = Math.min(onset, first);
  }
  // Skip recording lead-in so the first audible tap coincides with the simulated contact.
  return { buffer, offset: onset === buffer.length ? 0 : Math.max(0, onset / buffer.sampleRate - .005) };
}

export class DiceRollAudio {
  private context: AudioContext | null = null;
  private buffers: Record<keyof typeof SOUNDS, Recording[]> | null = null;
  private loading: Promise<void> | null = null;
  private resuming: Promise<void> = Promise.resolve();
  private readonly sources = new Map<AudioBufferSourceNode, GainNode>();
  private presentation: DicePresentation | null = null;
  private generation = 0;
  private enabled = true;
  private disposed = false;

  // Called synchronously from the launch gesture, before worker/import awaits can lose activation.
  unlock(): void {
    if (!this.enabled || this.disposed) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      this.resuming = context.resume().catch(() => {});
      if (!this.buffers && !this.loading) {
        const decode = async (url: string): Promise<Recording> => {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Dice sound unavailable");
          return recording(await context.decodeAudioData(await response.arrayBuffer()));
        };
        this.loading = Promise.all([Promise.all(SOUNDS.single.map(decode)), Promise.all(SOUNDS.multiple.map(decode))])
          .then(([single, multiple]) => { if (!this.disposed) this.buffers = { single, multiple }; })
          .catch(() => {}).finally(() => { this.loading = null; });
      }
    } catch { /* Audio is optional: unsupported devices must not interrupt a roll. */ }
  }

  present(value: DicePresentation | null): void {
    if (this.disposed) return;
    if (value?.rollId === this.presentation?.rollId && value?.contextToken === this.presentation?.contextToken) return;
    this.stop(); this.presentation = value;
    if (!this.enabled || !value?.replay || !this.context) return;
    const generation = this.generation;
    void Promise.all([this.resuming, this.loading]).then(() => {
      if (this.disposed || generation !== this.generation || !this.enabled) return;
      this.schedule(value);
    }).catch(() => { if (generation === this.generation) this.stop(); });
  }

  private schedule(value: DicePresentation): void {
    const context = this.context, buffers = this.buffers, now = Date.now();
    if (!context || !buffers || context.state !== "running" || now >= value.settledAt) return;
    const plan = planDiceSounds(value), end = context.currentTime + (value.settledAt - now) / 1000;
    for (const cue of plan.cues) {
      const delay = (value.startedAt + cue.atMs - now) / 1000;
      if (delay < 0) continue; // Do not replay missed impacts after loading or window hydration.
      const when = context.currentTime + delay;
      // A short sample per impact cluster avoids multiplying loudness by the number of dice.
      const { buffer, offset } = buffers[plan.family][cue.variant];
      const duration = Math.min((buffer.duration - offset) / cue.rate, .30, end - when);
      if (duration <= .01) continue;
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; source.playbackRate.value = cue.rate;
      source.connect(gain); gain.connect(context.destination);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(cue.gain, when + .005);
      gain.gain.setValueAtTime(cue.gain, when + Math.max(.005, duration - .025));
      gain.gain.linearRampToValueAtTime(0, when + duration);
      this.sources.set(source, gain);
      source.onended = () => { source.disconnect(); gain.disconnect(); this.sources.delete(source); };
      source.start(when, offset); source.stop(when + duration);
    }
  }

  setEnabled(enabled: boolean): void { this.enabled = enabled; if (!enabled) this.stop(); }
  stop(): void {
    this.generation++;
    for (const [source, gain] of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended. */ }
      source.disconnect(); gain.disconnect();
    }
    this.sources.clear();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.stop(); this.buffers = null;
    void this.context?.close().catch(() => {});
  }
}

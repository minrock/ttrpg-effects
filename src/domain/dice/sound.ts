import type { DicePresentation } from "./dice";

export interface DiceSoundCue {
  readonly atMs: number;
  readonly variant: number;
  readonly gain: number;
  readonly rate: number;
}
export interface DiceSoundPlan { readonly family: "single" | "multiple"; readonly cues: readonly DiceSoundCue[] }
export const DICE_SOUND_GAP_MS = 320;
export const MAX_DICE_SOUND_CUES = 32;

// The shared replay already contains contact bounces. No second simulation or IPC stream is needed.
export function planDiceSounds(value: DicePresentation): DiceSoundPlan {
  const count = value.dice.length, family = count === 1 ? "single" : "multiple";
  const replay = value.replay, cues: DiceSoundCue[] = [];
  if (!replay || count === 0 || replay.stepMs <= 0 || replay.frames.length !== replay.frameCount * count * 7) return { family, cues };
  let seed = 2166136261;
  for (const character of value.rollId) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const random = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let lastCue = -Infinity;
  for (let frame = 1; frame < replay.frameCount - 1 && cues.length < MAX_DICE_SOUND_CUES; frame++) {
    const atMs = frame * replay.stepMs;
    if (atMs >= replay.durationMs || atMs - lastCue < DICE_SOUND_GAP_MS) continue;
    let impact = 0;
    for (let die = 0; die < count; die++) {
      const offset = (frame * count + die) * 7 + 2;
      const previous = replay.frames[offset - count * 7], z = replay.frames[offset], next = replay.frames[offset + count * 7];
      const downwardSpeed = (previous - z) * 1000 / replay.stepMs;
      if (z < 1.6 && next >= z && downwardSpeed > .12) impact = Math.max(impact, downwardSpeed);
    }
    if (impact === 0) continue;
    cues.push({ atMs, variant: Math.floor(random() * (family === "single" ? 4 : 3)), gain: Math.min(.55, .15 + Math.sqrt(impact / 8) * .35), rate: .96 + random() * .08 });
    lastCue = atMs;
  }
  return { family, cues };
}

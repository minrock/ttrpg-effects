export const ALLOWED_SHAPE_EMOJIS = ["💧", "💨", "🤐", "🤢", "💀", "☠️", "🔮"] as const;

export type AllowedShapeEmoji = typeof ALLOWED_SHAPE_EMOJIS[number];

export function getSelectedShapeEmojis(value: string | undefined): readonly AllowedShapeEmoji[] {
  if (value === undefined) {
    return [];
  }

  return ALLOWED_SHAPE_EMOJIS.filter((emoji) => value.includes(emoji));
}

export function serializeShapeEmojis(emojis: readonly string[]): string | undefined {
  const selected = ALLOWED_SHAPE_EMOJIS.filter((emoji) => emojis.includes(emoji));
  return selected.length === 0 ? undefined : selected.join("");
}

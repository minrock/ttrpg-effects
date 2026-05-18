export const ALLOWED_SHAPE_EMOJIS = [
  ["❄️", "Hielo / frío"],
  ["🌊", "Agua"],
  ["💨", "Viento / aire"],
  ["🟦", "Fuerza mágica"],
  ["🪨", "Piedra / tierra / roca"],
  ["🟫", "Barro / lodo"],
  ["🏜️", "Arena / polvo"],
  ["🌫️", "Niebla"],
  ["☠️", "Gas venenoso"],
  ["🧪", "Ácido"],
  ["🌵", "Espinas / zarzas"],
  ["🌿", "Raíces / lianas"],
  ["🕸️", "Telarañas / seda"],
  ["🗡️", "Cuchillas / filos"],
  ["🌑", "Oscuridad / sombra"],
  ["💀", "Energía necrótica"],
  ["🧫", "Veneno / miasma"],
  ["⚡", "Relámpago"],
  ["⛈️", "Tormenta"],
  ["🤫", "Silencio"],
  ["🧠", "Psíquico / locura"],
  ["🎭", "Ilusión"],
  ["🚫", "Antimagia"],
  ["🕯️", "Consagración / sagrado"],
  ["🌀", "Planar / extradimensional"],
  ["🐙", "Tentáculos / apéndices"],
  ["🕳️", "Gravedad / vacío"],
  ["🪤", "Terreno difícil"],
  ["👻", "Espíritus"]
] as const;

export type AllowedShapeEmoji = typeof ALLOWED_SHAPE_EMOJIS[number][0];
export type AllowedShapeEmojiOption = typeof ALLOWED_SHAPE_EMOJIS[number];

export function getSelectedShapeEmojis(value: string | undefined): readonly AllowedShapeEmoji[] {
  if (value === undefined) {
    return [];
  }

  return ALLOWED_SHAPE_EMOJIS
    .map(([emoji]) => emoji)
    .filter((emoji) => value.includes(emoji));
}

export function serializeShapeEmojis(emojis: readonly string[]): string | undefined {
  const selected = ALLOWED_SHAPE_EMOJIS
    .map(([emoji]) => emoji)
    .filter((emoji) => emojis.includes(emoji));
  return selected.length === 0 ? undefined : selected.join("");
}

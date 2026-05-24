export const renderLayerNames = [
  "background",
  "map",
  "grid",
  "tokens",
  "darkness",
  "lights",
  "effects",
  "magicalDarkness",
  "fogOfWar",
  "walls",
  "shapesAndMeasurements",
  "selection",
  "pointer"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

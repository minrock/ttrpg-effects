export const renderLayerNames = [
  "background",
  "map",
  "darkness",
  "grid",
  "lights",
  "effects",
  "fogOfWar",
  "magicalDarkness",
  "tokens",
  "walls",
  "shapesAndMeasurements",
  "selection",
  "pointer"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

export const renderLayerNames = [
  "background",
  "map",
  "darkness",
  "grid",
  "lights",
  "fogOfWar",
  "effects",
  "magicalDarkness",
  "tokens",
  "walls",
  "shapesAndMeasurements",
  "selection",
  "pointer"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

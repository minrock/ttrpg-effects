export const renderLayerNames = [
  "background",
  "map",
  "darkness",
  "grid",
  "lights",
  "fogOfWar",
  "effects",
  "walls",
  "shapesAndMeasurements",
  "selection"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

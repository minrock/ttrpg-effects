export const renderLayerNames = [
  "background",
  "map",
  "grid",
  "darkness",
  "lights",
  "effects",
  "shapesAndMeasurements",
  "selection"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

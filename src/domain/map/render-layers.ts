export const renderLayerNames = [
  "background",
  "map",
  "darkness",
  "grid",
  "lights",
  "effects",
  "shapesAndMeasurements",
  "selection"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

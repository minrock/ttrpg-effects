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
  "mapAnnotations",
  "walls",
  "shapesAndMeasurements",
  "labels",
  "informationAreaHighlights",
  "selection",
  "pointer"
] as const;

export type RenderLayerName = (typeof renderLayerNames)[number];

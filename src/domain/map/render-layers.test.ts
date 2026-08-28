import { describe, expect, it } from "vitest";
import { renderLayerNames } from "./render-layers";

describe("render layer order", () => {
  it("keeps visual gameplay layers in the agreed bottom-to-top order", () => {
    expect(renderLayerNames).toEqual([
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
      "pointer",
      "playerCameraControls"
    ]);
  });
});

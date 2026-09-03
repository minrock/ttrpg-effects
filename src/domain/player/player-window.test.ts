import { describe, expect, it } from "vitest";
import {
  deriveFogPresentation,
  deriveHiddenTokenPolicy,
  createPlayerSceneSnapshot,
  getTokensForRole,
  normalizeCameraSnapshot
} from "./player-window";
import type { SceneToken } from "../sessions/scene-document";
import { createDefaultScene } from "../sessions/default-scene";
import { createSceneLabel } from "../labels/labels";

const token: SceneToken = {
  id: "token-1",
  name: "Goblin",
  type: "creature",
  imagePath: "/tmp/goblin.png",
  position: { x: 0, y: 0 },
  size: "medium",
  footprintCells: 1,
  selectionColor: "#fff0a8",
  badgeNumber: 1,
  order: 1,
  visible: true
};

describe("player window view rules", () => {
  it("shares cell calibration without an extension toggle in the player snapshot", () => {
    const scene = createDefaultScene();
    const grid = { ...scene.grid, cellSizeWorld: 57, lineWidth: 3 as const };
    expect(createPlayerSceneSnapshot({ ...scene, grid }).grid).toEqual(grid);
  });

  it("uses blocking fog for players and a local preview flag for the DM", () => {
    expect(deriveFogPresentation("player", false)).toBe("player-blocking");
    expect(deriveFogPresentation("dm", false)).toBe("dm-hidden");
    expect(deriveFogPresentation("dm", true)).toBe("dm-preview");
  });

  it("hides invisible tokens only from players", () => {
    const hiddenToken = { ...token, id: "token-2", visible: false };
    expect(getTokensForRole([token, hiddenToken], "dm")).toHaveLength(2);
    expect(getTokensForRole([token, hiddenToken], "player")).toEqual([token]);
    expect(deriveHiddenTokenPolicy("dm")).toBe("show-with-indicator");
    expect(deriveHiddenTokenPolicy("player")).toBe("hide");
  });

  it("normalizes invalid camera values", () => {
    expect(
      normalizeCameraSnapshot({
        center: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
        zoom: -2
      })
    ).toEqual({
      center: { x: 0, y: 0 },
      zoom: 1
    });
  });

  it("removes DM-only labels and map annotations from the player snapshot", () => {
    const scene = createDefaultScene();
    const snapshot = createPlayerSceneSnapshot({
      ...scene,
      labels: [createSceneLabel("label-1", { x: 10, y: 20 })],
      mapAnnotations: {
        pins: [
          {
            id: "pin-1",
            kind: "room-pin",
            title: "Sala secreta",
            content: "Solo para el DM",
            position: { x: 10, y: 20 },
            locked: false
          }
        ],
        areas: [
          {
            id: "area-1",
            kind: "information-area",
            areaType: "trap",
            name: "Trampa",
            description: "Pozo oculto",
            cells: [{ x: 0, y: 0, size: 100 }],
            locked: false
          }
        ],
        sceneLinks: []
      }
    });

    expect(snapshot.labels).toEqual([]);
    expect(snapshot.mapAnnotations).toEqual({ pins: [], areas: [], sceneLinks: [] });
  });
});

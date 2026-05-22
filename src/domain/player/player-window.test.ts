import { describe, expect, it } from "vitest";
import {
  deriveFogPresentation,
  deriveHiddenTokenPolicy,
  getTokensForRole,
  normalizeCameraSnapshot
} from "./player-window";
import type { SceneToken } from "../sessions/scene-document";

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
});

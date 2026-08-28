import { describe, expect, it } from "vitest";
import { resolveContextMenuPosition } from "./context-menu-position";

describe("resolveContextMenuPosition", () => {
  it("opens below the pointer when enough vertical space remains", () => {
    expect(
      resolveContextMenuPosition(
        { x: 240, y: 180 },
        { width: 180, height: 260 },
        { width: 1280, height: 720 }
      )
    ).toMatchObject({ left: 240, top: 180, opensUpward: false });
  });

  it("opens above the pointer when the menu would exceed the bottom edge", () => {
    expect(
      resolveContextMenuPosition(
        { x: 240, y: 650 },
        { width: 180, height: 260 },
        { width: 1280, height: 720 }
      )
    ).toMatchObject({ left: 240, top: 390, opensUpward: true });
  });

  it("keeps oversized menus within the usable viewport bounds", () => {
    expect(
      resolveContextMenuPosition(
        { x: 1275, y: 710 },
        { width: 180, height: 800 },
        { width: 1280, height: 720 }
      )
    ).toMatchObject({ left: 1092, top: 8, opensUpward: true, opensLeftward: true });
  });
});

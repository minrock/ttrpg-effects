// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CompassOrientation } from "../../../domain/map/compass-orientation";
import { CompassOverlay } from "./CompassOverlay";

const cssPath = "./CompassOverlay.css";
const compassCss = readFileSync(new URL(cssPath, import.meta.url), "utf8");

type Point = readonly [number, number];

function rotatePoint([x, y]: Point, transform: string): Point {
  const [degrees, cx, cy] = transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const radians = degrees * Math.PI / 180;
  return [cx + (x - cx) * Math.cos(radians) - (y - cy) * Math.sin(radians),
    cy + (x - cx) * Math.sin(radians) + (y - cy) * Math.cos(radians)];
}

function expectPoint(actual: Point, expected: Point): void {
  expect(actual[0]).toBeCloseTo(expected[0]);
  expect(actual[1]).toBeCloseTo(expected[1]);
}

describe("CompassOverlay", () => {
  let host: HTMLDivElement;
  let root: Root;
  let style: HTMLStyleElement;

  function render(orientation: CompassOrientation, variant: "dm" | "player" = "dm", lab = false): void {
    act(() => root.render(lab
      ? <div className="lab-compass"><CompassOverlay orientation={orientation} variant={variant} /></div>
      : <CompassOverlay orientation={orientation} variant={variant} />));
  }

  function bearingTransform(): string {
    return host.querySelector(".compass-overlay__bearing")!.getAttribute("transform")!;
  }

  function northTip(): Point {
    const [x, y] = host.querySelector(".compass-overlay__north")!.getAttribute("points")!.split(" ")[0].split(",").map(Number);
    return rotatePoint([x, y], bearingTransform());
  }

  function expectUprightNorthLabel(position: Point): void {
    const label = host.querySelector(".compass-overlay__north-label")!;
    const origin: Point = [Number(label.getAttribute("x")), Number(label.getAttribute("y"))];
    const labelTransform = label.getAttribute("transform")!;
    const transformedOrigin = rotatePoint(rotatePoint(origin, labelTransform), bearingTransform());
    const transformedRight = rotatePoint(rotatePoint([origin[0] + 1, origin[1]], labelTransform), bearingTransform());
    expect(label.textContent).toBe("N");
    expectPoint(transformedOrigin, position);
    expectPoint(transformedRight, [position[0] + 1, position[1]]);
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    style = document.createElement("style");
    style.textContent = compassCss;
    document.head.append(style);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    style.remove();
  });

  it.each([
    { orientation: 0, tip: [40, 19], label: [40, 8] },
    { orientation: 90, tip: [61, 40], label: [72, 40] },
    { orientation: 180, tip: [40, 61], label: [40, 72] },
    { orientation: 270, tip: [19, 40], label: [8, 40] }
  ] as const)("points north at $orientation degrees in DM, moving N without rotating its text", ({ orientation, tip, label }) => {
    render(orientation);
    expectPoint(northTip(), tip);
    expectUprightNorthLabel(label);
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(`Brujula: norte ${orientation} grados`);
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector("svg")?.getAttribute("focusable")).toBe("false");
  });

  it.each([0, 90, 180, 270] as const)("defends north-up inside the player component with a %s-degree input", orientation => {
    render(orientation, "player");
    expectPoint(northTip(), [40, 19]);
    expectUprightNorthLabel([40, 8]);
    expect(bearingTransform()).toBe("rotate(0 40 40)");
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Brujula: norte 0 grados");
  });

  it("updates the existing overlay when orientation or role changes", () => {
    render(0);
    const overlay = host.firstElementChild;
    render(270);
    expectPoint(northTip(), [19, 40]);
    render(270, "player");
    expectPoint(northTip(), [40, 19]);
    render(90);
    expectPoint(northTip(), [61, 40]);
    expect(host.firstElementChild).toBe(overlay);
  });

  it("makes the solid north needle longer and wider than the subdued south needle", () => {
    render(0);
    const north = host.querySelector<SVGPolygonElement>(".compass-overlay__north")!;
    const south = host.querySelector<SVGPolygonElement>(".compass-overlay__south")!;
    const extent = (element: SVGPolygonElement, axis: 0 | 1): number => {
      const values = element.getAttribute("points")!.split(" ").map(point => Number(point.split(",")[axis]));
      return Math.max(...values) - Math.min(...values);
    };
    expect(extent(north, 1)).toBeGreaterThan(extent(south, 1));
    expect(extent(north, 0)).toBeGreaterThan(extent(south, 0));
    expect(getComputedStyle(north).fill).toBe("rgb(180, 244, 215)");
    expect(getComputedStyle(south).fill).toBe("rgb(114, 133, 125)");
    expect(Number(getComputedStyle(south).opacity)).toBeLessThan(1);
  });

  it.each([
    { variant: "dm", size: "80px", top: "14px", right: "14px" },
    { variant: "player", size: "84px", top: "18px", right: "210px" }
  ] as const)("keeps the $variant size and placement with styles imported by the component", ({ variant, size, top, right }) => {
    render(90, variant);
    const computed = getComputedStyle(host.querySelector(".compass-overlay")!);
    expect(computed.width).toBe(size);
    expect(computed.height).toBe(size);
    expect(computed.position).toBe("absolute");
    expect(computed.top).toBe(top);
    expect(computed.right).toBe(right);
    expect(computed.pointerEvents).toBe("none");
    expect(host.querySelector("button, input, [tabindex]")).toBeNull();
  });

  it("uses the lab wrapper's placement while keeping the same geometry and size", () => {
    render(180, "dm", true);
    const computed = getComputedStyle(host.querySelector(".compass-overlay")!);
    expect(computed.position).toBe("relative");
    expect(computed.top).toBe("auto");
    expect(computed.right).toBe("auto");
    expect(computed.width).toBe("80px");
    expectPoint(northTip(), [40, 61]);
    expectUprightNorthLabel([40, 72]);
  });
});

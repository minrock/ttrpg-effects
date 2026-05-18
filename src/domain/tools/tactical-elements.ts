import type { WorldPoint } from "../shared/coordinates";

export const tacticalElementKinds = [
  "measurement",
  "line",
  "circle",
  "cone",
  "rectangle",
  "pointLight",
  "coneLight",
  "fire"
] as const;

export type TacticalElementKind = (typeof tacticalElementKinds)[number];

export interface TacticalElement {
  readonly id: string;
  readonly kind: TacticalElementKind;
  readonly position: WorldPoint;
}

export function createTacticalElement(
  id: string,
  kind: TacticalElementKind,
  position: WorldPoint
): TacticalElement {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Element position must be a finite world coordinate.");
  }

  return {
    id,
    kind,
    position
  };
}

export function getTacticalElementLabel(kind: TacticalElementKind): string {
  switch (kind) {
    case "measurement":
      return "Medicion";
    case "line":
      return "Linea";
    case "circle":
      return "Circulo";
    case "cone":
      return "Cono";
    case "rectangle":
      return "Rectangulo";
    case "pointLight":
      return "Luz puntual";
    case "coneLight":
      return "Luz conica";
    case "fire":
      return "Fuego";
  }
}

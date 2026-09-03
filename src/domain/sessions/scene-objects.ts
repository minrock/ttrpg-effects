import type { SceneDocument, SceneEffect, SceneLight, SceneShape } from "./scene-document";
import type { WorldPoint } from "../shared/coordinates";

export interface SceneObjectEntry {
  readonly id: string;
  readonly collection: "lights" | "effects" | "shapes";
  readonly group: "Efectos" | "Areas";
  readonly label: string;
  readonly visible: boolean;
  readonly center: WorldPoint;
}

const shapeNames: Record<SceneShape["type"], string> = {
  measurement: "Medicion", circle: "Circulo", cone: "Cono", rectangle: "Rectangulo", path: "Camino"
};
const effectNames: Record<SceneEffect["kind"], string> = {
  fire: "Fuego", "dynamic-light": "Luz dinamica", "magical-darkness": "Oscuridad magica", water: "Agua"
};

export function listSceneObjects(lights: readonly SceneLight[], effects: readonly SceneEffect[], shapes: readonly SceneShape[]): SceneObjectEntry[] {
  return [
    ...lights.map((light): SceneObjectEntry => ({ id: light.id, collection: "lights", group: "Efectos", label: `${light.kind === "point" ? "Luz puntual" : "Luz conica"} · ${light.id}`, visible: light.visible, center: light.position })),
    ...effects.map((effect): SceneObjectEntry => ({ id: effect.id, collection: "effects", group: "Efectos", label: `${effectNames[effect.kind]} · ${effect.id}`, visible: effect.visible, center: effect.position })),
    ...shapes.map((shape): SceneObjectEntry => ({ id: shape.id, collection: "shapes", group: "Areas", label: `${shapeNames[shape.type]} · ${shape.id}`, visible: true, center: shapeCenter(shape) }))
  ];
}

export function removeSceneObject(scene: SceneDocument, entry: Pick<SceneObjectEntry, "id" | "collection">): SceneDocument {
  if (!scene[entry.collection].some((item) => item.id === entry.id)) return scene;
  if (entry.collection === "lights") return { ...scene, lights: scene.lights.filter((item) => item.id !== entry.id) };
  if (entry.collection === "effects") return { ...scene, effects: scene.effects.filter((item) => item.id !== entry.id) };
  return { ...scene, shapes: scene.shapes.filter((item) => item.id !== entry.id) };
}

function shapeCenter(shape: SceneShape): WorldPoint {
  const first = shape.points[0] ?? { x: 0, y: 0 };
  if (shape.type === "circle" || shape.type === "cone" || shape.type === "rectangle") return first;
  let left = first.x, right = first.x, top = first.y, bottom = first.y;
  for (const point of shape.points) {
    left = Math.min(left, point.x); right = Math.max(right, point.x);
    top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
  }
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

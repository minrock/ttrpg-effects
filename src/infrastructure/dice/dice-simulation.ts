import { Body, ContactMaterial, GSSolver, Material, Plane, Quaternion, Vec3, World } from "cannon-es";
import { Quaternion as RenderQuaternion, Vector3 } from "three";
import type { DiceSimulation, PhysicalDie, PhysicalDieType } from "../../domain/dice/dice";
import { DiceFactory, type DiceGeometry } from "../../render/three/dice/vendor/DiceFactory.js";

export const DICE_SCALE = .8;
export const TABLE_WIDTH = 16;
export const TABLE_HEIGHT = 9;
class UnsettledDiceError extends Error {}

export function readDieFace(geometry: DiceGeometry, type: PhysicalDieType, quaternion: readonly number[]): { value: number; alignment: number } {
  const q = new RenderQuaternion(...quaternion as [number, number, number, number]);
  const normals = geometry.getAttribute("normal");
  let alignment = -Infinity, material = 0;
  for (const group of geometry.groups) {
    if (!group.materialIndex) continue;
    const normal = new Vector3().fromBufferAttribute(normals, group.start).applyQuaternion(q);
    const dot = normal.z * (type === "d4" ? -1 : 1);
    if (dot > alignment) { alignment = dot; material = group.materialIndex; }
  }
  return { value: type === "d100" ? material * 10 : type === "d10" ? material : material - 1, alignment };
}

export function simulateDice(dice: readonly PhysicalDie[], force: number, random: () => number): DiceSimulation {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return simulateAttempt(dice, force, random); }
    catch (error) { if (!(error instanceof UnsettledDiceError) || attempt === 2) throw error; }
  }
  throw new UnsettledDiceError("Los dados no se asentaron. Vuelve a lanzar.");
}

function simulateAttempt(dice: readonly PhysicalDie[], force: number, random: () => number): DiceSimulation {
  const factory = new DiceFactory({ baseScale: DICE_SCALE, bumpMapping: false });
  const geometries = new Map<PhysicalDieType, DiceGeometry>();
  const world = new World({ gravity: new Vec3(0, 0, -28), allowSleep: true });
  if (world.solver instanceof GSSolver) world.solver.iterations = 20;
  const material = new Material("dice-table");
  world.addContactMaterial(new ContactMaterial(material, material, { friction: .35, restitution: .38 }));
  const plane = (position: Vec3, rotation: Quaternion): void => {
    const body = new Body({ mass: 0, shape: new Plane(), material, position, quaternion: rotation });
    world.addBody(body);
  };
  plane(new Vec3(), new Quaternion());
  plane(new Vec3(-8, 0, 0), new Quaternion().setFromEuler(0, Math.PI / 2, 0));
  plane(new Vec3(8, 0, 0), new Quaternion().setFromEuler(0, -Math.PI / 2, 0));
  plane(new Vec3(0, -4.5, 0), new Quaternion().setFromEuler(-Math.PI / 2, 0, 0));
  plane(new Vec3(0, 4.5, 0), new Quaternion().setFromEuler(Math.PI / 2, 0, 0));
  const bodies = dice.map((die, i) => {
    let geometry = geometries.get(die.type);
    if (!geometry) { const preset = factory.get(die.type); geometry = factory.createGeometry(preset.shape, preset.scale * DICE_SCALE); geometries.set(die.type, geometry); }
    const body = new Body({ mass: 1, shape: geometry.cannon_shape, material, linearDamping: .18, angularDamping: .22, sleepSpeedLimit: .18, sleepTimeLimit: .45 });
    body.position.set(-6.1 + (i % 6) * 2.35, -2.9 + Math.floor(i / 6) * 1.9, 2.5 + random() * 2);
    body.quaternion.setFromEuler(random() * 6.28, random() * 6.28, random() * 6.28);
    body.velocity.set((random() * 4 - 2) * force, (random() * 5 - 2.5) * force, 2 * force);
    body.angularVelocity.set((random() - .5) * 22 * force, (random() - .5) * 22 * force, (random() - .5) * 18 * force);
    world.addBody(body);
    return body;
  });
  const frames: number[] = [];
  const quietFrames = bodies.map(() => 0);
  const sample = (): void => { for (const b of bodies) frames.push(...[b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w].map(n => Math.round(n * 100000) / 100000)); };
  try {
    sample();
    let settled = false;
    for (let step = 1; step <= 720; step++) {
      world.step(1 / 60);
      if (step % 2 !== 0) continue;
      sample();
      if (step <= 60) continue;
      for (const [i, body] of bodies.entries()) {
        const quiet = body.velocity.lengthSquared() < .0625 && body.angularVelocity.lengthSquared() < .16;
        quietFrames[i] = quiet ? quietFrames[i] + 1 : 0;
        if (body.sleepState !== Body.SLEEPING && quietFrames[i] < 15) continue;
        const face = readDieFace(geometries.get(dice[i].type)!, dice[i].type, [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w]);
        // Contact jitter can repeatedly wake a resting body. Sleep only a stable,
        // unambiguous face; resolve cocked dice through another physical impulse.
        if (face.alignment >= .99) body.sleep();
        else { quietFrames[i] = 0; body.wakeUp(); body.velocity.set((random() - .5) * 6, (random() - .5) * 6, 5); body.angularVelocity.set(3 + random() * 3, 4, 2); }
      }
      if (bodies.every(b => b.sleepState === Body.SLEEPING)) { settled = true; break; }
    }
    if (!settled) throw new UnsettledDiceError("Los dados no se asentaron. Vuelve a lanzar.");
    const frameCount = frames.length / (dice.length * 7), stepMs = 1000 / 30;
    const values = bodies.map((b, i) => ({ id: dice[i].id, value: readDieFace(geometries.get(dice[i].type)!, dice[i].type, [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]).value }));
    return { replay: { frames, frameCount, stepMs, durationMs: (frameCount - 1) * stepMs }, values };
  } finally { geometries.forEach(g => g.dispose()); }
}

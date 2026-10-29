import type { BufferGeometry, Mesh, MeshStandardMaterial, Texture } from "three";
import type { ConvexPolyhedron } from "cannon-es";
export interface DiceGeometry extends BufferGeometry { cannon_shape: ConvexPolyhedron }
export interface DiceMesh extends Mesh<DiceGeometry, MeshStandardMaterial[]> { mass: number }
export class DiceFactory {
  constructor(options: { baseScale: number; bumpMapping?: boolean });
  geometries: Record<string, DiceGeometry>;
  materials_cache: Record<string, { composite: Texture; bump: Texture | null }>;
  get(type: string): { shape: string; scale: number; mass: number };
  create(type: string): DiceMesh;
  createGeometry(type: string, radius: number): DiceGeometry;
  applyColorSet(colors: { foreground: string; background: string; outline: string; edge: string; texture: { name: string; material: string } }): void;
}

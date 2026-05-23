import type { SceneAside } from "./scene-aside";

export const SCENE_DOCUMENT_VERSION = 1;

export type DistanceUnit = "ft" | "m";
export type DiagonalMode = "dnd5e-default" | "dnd5e-alternating" | "manhattan" | "euclidean";

export interface SceneMap {
  readonly imagePath: string | null;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly scale: number;
}

export interface SceneCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface SceneGrid {
  readonly enabled: boolean;
  readonly locked: boolean;
  readonly cellSizeWorld: number;
  readonly opacity: number;
  readonly unit: DistanceUnit;
  readonly distancePerCell: number;
  readonly metricDistancePerCell: number;
}

export interface SceneDarkness {
  readonly enabled: boolean;
  readonly opacity: number;
  readonly color: string;
  readonly darkvisionEnabled: boolean;
}

export type SceneFogRevealArea =
  | {
      readonly id: string;
      readonly kind: "circle";
      readonly center: {
        readonly x: number;
        readonly y: number;
      };
      readonly radius: number;
    }
  | {
      readonly id: string;
      readonly kind: "stroke";
      readonly points: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>;
      readonly radius: number;
    };

export interface SceneFogObstacle {
  readonly id: string;
  readonly kind: "wall";
  readonly points: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
  }>;
}

export interface SceneFogOfWar {
  readonly enabled: boolean;
  readonly opacity: number;
  readonly color: string;
  readonly revealRadius: number;
  readonly revealedAreas: readonly SceneFogRevealArea[];
  readonly obstacles: readonly SceneFogObstacle[];
}

export interface SceneSettings {
  readonly diagonalMode: DiagonalMode;
  readonly snapToGrid: boolean;
}

export interface SceneLight {
  readonly id: string;
  readonly kind: "point" | "cone";
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
  readonly opacity: number;
  readonly angle: number;
  readonly direction: number;
  readonly visible: boolean;
  readonly snapToGrid: boolean;
}

export type SceneEffect = SceneFireEffect | SceneMagicalDarknessEffect | SceneWaterEffect;

export interface SceneFireEffect {
  readonly id: string;
  readonly kind: "fire";
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly zone: SceneFireZone;
  readonly scale: number;
  readonly opacity: number;
  readonly color: string;
  readonly visible: boolean;
  readonly emitsLight: boolean;
  readonly lightRadius: number;
}

export interface SceneMagicalDarknessEffect {
  readonly id: string;
  readonly kind: "magical-darkness";
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly radius: number;
  readonly opacity: number;
  readonly visible: boolean;
}

export type SceneWaterEffect =
  | {
      readonly id: string;
      readonly kind: "water";
      readonly variant: "river";
      readonly position: {
        readonly x: number;
        readonly y: number;
      };
      readonly points: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>;
      readonly width: number;
      readonly lineRotation: number;
      readonly patternRotation: number;
      readonly hue: number;
      readonly saturation: number;
      readonly opacity: number;
      readonly visible: boolean;
    }
  | {
      readonly id: string;
      readonly kind: "water";
      readonly variant: "water-body";
      readonly position: {
        readonly x: number;
        readonly y: number;
      };
      readonly points: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>;
      readonly lineRotation: number;
      readonly patternRotation: number;
      readonly hue: number;
      readonly saturation: number;
      readonly opacity: number;
      readonly visible: boolean;
    };

export type SceneFireZone =
  | {
      readonly kind: "circle";
      readonly mode: "closed" | "open";
      readonly radius: number;
      readonly innerRadiusRatio: number;
    }
  | {
      readonly kind: "cells";
      readonly radius: number;
      readonly cells: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
        readonly size: number;
      }>;
    };

export interface SceneShape {
  readonly id: string;
  readonly type: "measurement" | "circle" | "cone" | "rectangle" | "path";
  readonly emoji?: string;
  readonly points: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
  }>;
  readonly radius?: number;
  readonly width?: number;
  readonly height?: number;
  readonly angle?: number;
  readonly direction?: number;
}

export interface SceneToken {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly imagePath: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly size: "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";
  readonly footprintCells: 1 | 2 | 3 | 4;
  readonly selectionColor: string;
  readonly badgeNumber: number;
  readonly order: number;
  readonly visible: boolean;
}

export interface SceneDocumentV1 {
  readonly version: typeof SCENE_DOCUMENT_VERSION;
  readonly map: SceneMap;
  readonly camera: SceneCamera;
  readonly grid: SceneGrid;
  readonly darkness: SceneDarkness;
  readonly fogOfWar: SceneFogOfWar;
  readonly settings: SceneSettings;
  readonly lights: readonly SceneLight[];
  readonly effects: readonly SceneEffect[];
  readonly shapes: readonly SceneShape[];
  readonly tokens: readonly SceneToken[];
  readonly sceneAside?: SceneAside;
}

export type SceneDocument = SceneDocumentV1;

export interface SceneWarning {
  readonly code: "map-image-missing" | "scene-format-outdated";
  readonly message: string;
  readonly path: string;
}

export interface SceneOperationSuccess {
  readonly ok: true;
  readonly scene: SceneDocument;
  readonly filePath: string;
  readonly mapImageUrl?: string;
  readonly tokenImageUrls?: Readonly<Record<string, string>>;
  readonly warnings: readonly SceneWarning[];
}

export interface SceneOperationFailure {
  readonly ok: false;
  readonly error: string;
}

export type SceneOperationResult = SceneOperationSuccess | SceneOperationFailure;

export const SCENE_DOCUMENT_VERSION = 1;

export type DistanceUnit = "ft" | "m";
export type DiagonalMode = "dnd5e-default" | "manhattan" | "euclidean";

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
}

export interface SceneFogRevealArea {
  readonly id: string;
  readonly kind: "circle";
  readonly center: {
    readonly x: number;
    readonly y: number;
  };
  readonly radius: number;
}

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

export interface SceneEffect {
  readonly id: string;
  readonly kind: "fire";
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly scale: number;
  readonly opacity: number;
  readonly color: string;
  readonly visible: boolean;
  readonly emitsLight: boolean;
  readonly lightRadius: number;
}

export interface SceneShape {
  readonly id: string;
  readonly type: "measurement" | "line" | "circle" | "cone" | "rectangle";
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
}

export type SceneDocument = SceneDocumentV1;

export interface SceneWarning {
  readonly code: "map-image-missing";
  readonly message: string;
  readonly path: string;
}

export interface SceneOperationSuccess {
  readonly ok: true;
  readonly scene: SceneDocument;
  readonly filePath: string;
  readonly mapImageUrl?: string;
  readonly warnings: readonly SceneWarning[];
}

export interface SceneOperationFailure {
  readonly ok: false;
  readonly error: string;
}

export type SceneOperationResult = SceneOperationSuccess | SceneOperationFailure;

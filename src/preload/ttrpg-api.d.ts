import type { SceneDocument, SceneOperationResult } from "../domain/sessions/scene-document";
import type { InformationAreaHighlightBroadcast } from "../domain/annotations/map-annotations";
import type { MapOpenResult } from "../domain/map/map-image";
import type { TokenOpenResult } from "../domain/tokens/token-image";
import type {
  ArcanePointerBroadcast,
  PlayerWindowSnapshot,
  ViewportCameraSnapshot
} from "../domain/player/player-window";
import type {
  PlayerCameraCommand,
  PlayerCameraReport
} from "../domain/player/player-camera-control";
import type { MonsterTemplate } from "../domain/monster-templates/monster-template";
import type {
  MonsterLibraryEntry,
  MonsterLibrarySaveInput,
  MonsterLibrarySearchQuery
} from "../domain/monster-library/monster-library";
import type {
  EntityLibrarySearchQuery,
  NpcLibraryEntry,
  NpcLibrarySaveInput,
  PlayerCharacterLibraryEntry,
  PlayerCharacterLibrarySaveInput
} from "../domain/entity-library/entity-library";
import type {
  ConnectSceneLinkRequest,
  DisconnectSceneLinkRequest,
  LoadSceneLinkTargetRequest,
  SceneLinkCandidateFile,
  SceneLinkValidationStatus,
  ValidateSceneLinksRequest
} from "../domain/annotations/scene-navigation-links";
import type {
  SceneLinkMutationResult,
  SceneLinkNavigationResult
} from "../application/use-cases/scene-navigation-links";

export interface TtrpgAppInfo {
  name: "TTRPG Effects";
  version: "0.0.0";
  status: "Bootstrap listo";
}

export interface TtrpgApi {
  getAppInfo: () => TtrpgAppInfo;
  saveScene: (
    scene: SceneDocument,
    options?: { readonly suggestedFilePath?: string | null }
  ) => Promise<SceneOperationResult>;
  saveSceneToPath: (scene: SceneDocument, filePath: string) => Promise<SceneOperationResult>;
  loadScene: () => Promise<SceneOperationResult>;
  selectSceneLinkTargetFile: () => Promise<
    { readonly ok: true; readonly filePath: string | null } | { readonly ok: false; readonly error: string }
  >;
  listSceneLinkCandidates: (filePath: string) => Promise<
    { readonly ok: true; readonly candidate: SceneLinkCandidateFile } | { readonly ok: false; readonly error: string }
  >;
  connectSceneLink: (request: ConnectSceneLinkRequest) => Promise<SceneLinkMutationResult>;
  disconnectSceneLink: (request: DisconnectSceneLinkRequest) => Promise<SceneLinkMutationResult>;
  validateSceneLinks: (request: ValidateSceneLinksRequest) => Promise<
    { readonly ok: true; readonly statuses: Readonly<Record<string, SceneLinkValidationStatus>> } |
    { readonly ok: false; readonly error: string }
  >;
  loadSceneLinkTarget: (request: LoadSceneLinkTargetRequest) => Promise<SceneLinkNavigationResult>;
  onRecentSceneOpen: (handler: (result: SceneOperationResult) => void) => () => void;
  listMonsterTemplates: () => Promise<MonsterTemplateOperationResult>;
  saveMonsterTemplate: (template: MonsterTemplate) => Promise<MonsterTemplateOperationResult>;
  deleteMonsterTemplate: (id: string) => Promise<MonsterTemplateOperationResult>;
  onOpenMonsterTemplateManager: (handler: () => void) => () => void;
  searchMonsterLibrary: (query: MonsterLibrarySearchQuery) => Promise<MonsterLibrarySearchResult>;
  getMonsterLibraryEntry: (id: string) => Promise<MonsterLibraryGetResult>;
  saveMonsterLibraryEntry: (entry: MonsterLibrarySaveInput) => Promise<MonsterLibrarySaveResult>;
  searchNpcLibrary: (query: EntityLibrarySearchQuery) => Promise<NpcLibrarySearchResult>;
  getNpcLibraryEntry: (id: string) => Promise<NpcLibraryGetResult>;
  saveNpcLibraryEntry: (entry: NpcLibrarySaveInput) => Promise<NpcLibrarySaveResult>;
  searchPlayerCharacterLibrary: (query: EntityLibrarySearchQuery) => Promise<PlayerCharacterLibrarySearchResult>;
  getPlayerCharacterLibraryEntry: (id: string) => Promise<PlayerCharacterLibraryGetResult>;
  savePlayerCharacterLibraryEntry: (entry: PlayerCharacterLibrarySaveInput) => Promise<PlayerCharacterLibrarySaveResult>;
  openMapImage: () => Promise<MapOpenResult>;
  resolveMapUrl: (imagePath: string) => Promise<string | null>;
  openTokenImage: () => Promise<TokenOpenResult>;
  resolveTokenUrl: (imagePath: string) => Promise<string | null>;
  openAsideImage: () => Promise<TokenOpenResult>;
  resolveAsideUrl: (imagePath: string) => Promise<string | null>;
  openPlayerWindow: (snapshot?: PlayerWindowSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  getPlayerWindowState: () => Promise<{
    readonly snapshot: PlayerWindowSnapshot | null;
    readonly camera: ViewportCameraSnapshot | null;
    readonly cameraCommand: PlayerCameraCommand | null;
    readonly isOpen: boolean;
  }>;
  publishPlayerScene: (snapshot: PlayerWindowSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  publishPlayerCamera: (camera: ViewportCameraSnapshot) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  commandPlayerCamera: (command: PlayerCameraCommand) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  reportPlayerCamera: (report: PlayerCameraReport) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  publishPlayerPointer: (pointer: ArcanePointerBroadcast) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  publishPlayerInformationAreaHighlight: (highlight: InformationAreaHighlightBroadcast) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  notifyPlayerContentReady: () => Promise<{ readonly ok: boolean; readonly error?: string }>;
  onPlayerScene: (handler: (snapshot: PlayerWindowSnapshot) => void) => () => void;
  onPlayerCamera: (handler: (camera: ViewportCameraSnapshot) => void) => () => void;
  onPlayerCameraCommand: (handler: (command: PlayerCameraCommand) => void) => () => void;
  onPlayerCameraReport: (handler: (report: PlayerCameraReport) => void) => () => void;
  onPlayerPointer: (handler: (pointer: ArcanePointerBroadcast) => void) => () => void;
  onPlayerInformationAreaHighlight: (handler: (highlight: InformationAreaHighlightBroadcast) => void) => () => void;
  onPlayerWindowClosed: (handler: () => void) => () => void;
  onPlayerWindowReady: (handler: () => void) => () => void;
}

export type MonsterTemplateOperationResult =
  | {
      readonly ok: true;
      readonly templates: readonly MonsterTemplate[];
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type MonsterLibrarySearchResult =
  | {
      readonly ok: true;
      readonly entries: readonly MonsterLibraryEntry[];
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type MonsterLibraryGetResult =
  | {
      readonly ok: true;
      readonly entry: MonsterLibraryEntry | null;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type MonsterLibrarySaveResult =
  | {
      readonly ok: true;
      readonly entry: MonsterLibraryEntry;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type NpcLibrarySearchResult =
  | {
      readonly ok: true;
      readonly entries: readonly NpcLibraryEntry[];
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type NpcLibraryGetResult =
  | {
      readonly ok: true;
      readonly entry: NpcLibraryEntry | null;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type NpcLibrarySaveResult =
  | {
      readonly ok: true;
      readonly entry: NpcLibraryEntry;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type PlayerCharacterLibrarySearchResult =
  | {
      readonly ok: true;
      readonly entries: readonly PlayerCharacterLibraryEntry[];
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type PlayerCharacterLibraryGetResult =
  | {
      readonly ok: true;
      readonly entry: PlayerCharacterLibraryEntry | null;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type PlayerCharacterLibrarySaveResult =
  | {
      readonly ok: true;
      readonly entry: PlayerCharacterLibraryEntry;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

declare global {
  interface Window {
    ttrpg?: TtrpgApi;
  }
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "pixi.js/unsafe-eval";
import type { TtrpgApi } from "../../../preload/ttrpg-api";
import { createPlayerSceneSnapshot } from "../../../domain/player/player-window";
import { PlayerApp } from "../PlayerApp";
import { createLabScene } from "./fixture";
import mapUrl from "../../../../assets/lab/cloister-map.png";
import "../styles.css";
import "../components/workspace/workspace.css";

// Browser-only fixture for reviewing the real Player UI; never imported by the application.
const base = createLabScene();
const requestedNorth = Number(new URLSearchParams(location.search).get("north"));
const north = requestedNorth === 90 || requestedNorth === 180 || requestedNorth === 270 ? requestedNorth : 0;
const scene = createPlayerSceneSnapshot({ ...base, compassOrientation: north, map: { ...base.map, imagePath: "lab-cloister.png" } });
const unsubscribe = () => () => undefined;
const api = {
  getPlayerWindowState: async () => ({
    isOpen: true, camera: null, cameraCommand: null,
    snapshot: { scene, mapImageUrl: mapUrl, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 0.65 },
      cameraSyncKey: 1, showDmFogOverlay: false, showZoomIndicator: false }
  }),
  onPlayerScene: unsubscribe, onPlayerCameraCommand: unsubscribe,
  onPlayerPointer: unsubscribe, onPlayerInformationAreaHighlight: unsubscribe,
  notifyPlayerContentReady: async () => ({ ok: true as const }),
  reportPlayerCamera: async () => ({ ok: true as const }),
  reportPlayerMapImageStatus: async () => undefined
} satisfies Partial<TtrpgApi>;
Object.defineProperty(window, "ttrpg", { configurable: true, value: api });
createRoot(document.getElementById("root")!).render(<StrictMode><PlayerApp /></StrictMode>);

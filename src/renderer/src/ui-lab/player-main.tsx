import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "pixi.js/unsafe-eval";
import { createClient } from "../../../shared/api/client";
import type { TtrpgApi } from "../../../shared/api/ttrpg-api";
import { createPlayerSceneSnapshot } from "../../../domain/player/player-window";
import { PlayerApp } from "../PlayerApp";
import { ClientProvider } from "../client/ClientProvider";
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
const client = createClient(api as unknown as TtrpgApi, {
  scenes: false,
  images: true,
  libraries: false,
  templateAdministration: false,
  player: true,
  dice: false
}, "service");
createRoot(document.getElementById("root")!).render(<StrictMode><ClientProvider client={client}><PlayerApp /></ClientProvider></StrictMode>);

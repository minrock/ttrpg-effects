import type { WorldPoint } from "../shared/coordinates";
import type { SceneLabel } from "../sessions/scene-document";

export const systemLabelFonts = [
  "system-ui, sans-serif",
  "Arial, sans-serif",
  "Helvetica, Arial, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Courier New, monospace"
] as const;

export const defaultSceneLabelStyle = {
  text: "Label",
  fontFamily: systemLabelFonts[0],
  color: "#fff0a8",
  opacity: 1,
  shadow: {
    enabled: true,
    color: "#101315",
    blur: 4
  }
} as const;

export interface SceneLabelPatch {
  readonly text?: string;
  readonly position?: WorldPoint;
  readonly fontFamily?: string;
  readonly color?: string;
  readonly opacity?: number;
  readonly shadow?: Partial<SceneLabel["shadow"]>;
}

export function createSceneLabel(id: string, position: WorldPoint): SceneLabel {
  return {
    id,
    type: "label",
    position,
    ...defaultSceneLabelStyle,
    shadow: { ...defaultSceneLabelStyle.shadow }
  };
}

export function updateSceneLabel(label: SceneLabel, patch: SceneLabelPatch): SceneLabel {
  return {
    ...label,
    text: patch.text !== undefined ? normalizeLabelText(patch.text) : label.text,
    position: patch.position ?? label.position,
    fontFamily: patch.fontFamily !== undefined ? normalizeLabelFont(patch.fontFamily) : label.fontFamily,
    color: patch.color ?? label.color,
    opacity: patch.opacity !== undefined ? clampOpacity(patch.opacity) : label.opacity,
    shadow:
      patch.shadow !== undefined
        ? {
            ...label.shadow,
            ...patch.shadow,
            blur:
              patch.shadow.blur !== undefined
                ? Math.max(0, Number.isFinite(patch.shadow.blur) ? patch.shadow.blur : label.shadow.blur)
                : label.shadow.blur
          }
        : label.shadow
  };
}

export function normalizeLabelText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : defaultSceneLabelStyle.text;
}

export function normalizeLabelFont(fontFamily: string): string {
  return systemLabelFonts.includes(fontFamily as (typeof systemLabelFonts)[number])
    ? fontFamily
    : defaultSceneLabelStyle.fontFamily;
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultSceneLabelStyle.opacity;
  }

  return Math.min(1, Math.max(0, value));
}

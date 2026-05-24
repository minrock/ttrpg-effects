import type { JSX } from "react";
import type { SceneDarkness } from "../../../domain/sessions/scene-document";

interface DmDarknessStatusBadgeProps {
  readonly darkness: SceneDarkness;
}

/**
 * Floating badge rendered inside the DM map viewport when the ambient-darkness
 * or darkvision layers are active.  Because those layers are player-only the DM
 * cannot see them directly, so this badge gives visual feedback that the player
 * window is receiving a darkness / darkvision effect.
 *
 * The badge is absolutely positioned relative to the `.map-viewport` container,
 * so it automatically tracks the top-left corner of the canvas as the aside
 * panels open and close.
 */
export function DmDarknessStatusBadge({ darkness }: DmDarknessStatusBadgeProps): JSX.Element | null {
  const showDarkness = darkness.enabled && !darkness.darkvisionEnabled && darkness.opacity > 0;
  const showDarkvision = darkness.darkvisionEnabled;

  if (!showDarkness && !showDarkvision) {
    return null;
  }

  return (
    <div className="dm-darkness-badge" aria-label="Estado de oscuridad activo en ventana de jugador">
      {showDarkvision && (
        <span className="dm-darkness-badge-item">
          <span className="dm-darkness-badge-icon" aria-hidden="true">👁</span>
          Visión en oscuridad
        </span>
      )}
      {showDarkness && (
        <span className="dm-darkness-badge-item">
          <span className="dm-darkness-badge-icon" aria-hidden="true">🌑</span>
          Oscuridad
          <span className="dm-darkness-badge-value">{Math.round(darkness.opacity * 100)}%</span>
        </span>
      )}
    </div>
  );
}

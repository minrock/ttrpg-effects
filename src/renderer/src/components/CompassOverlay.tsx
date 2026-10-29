import type { JSX } from "react";
import { DEFAULT_COMPASS_ORIENTATION, type CompassOrientation } from "../../../domain/map/compass-orientation";
import "./CompassOverlay.css";

interface CompassOverlayProps {
  readonly orientation: CompassOrientation;
  readonly variant?: "dm" | "player";
}

export function CompassOverlay({ orientation, variant = "dm" }: CompassOverlayProps): JSX.Element {
  const displayedOrientation = variant === "player" ? DEFAULT_COMPASS_ORIENTATION : orientation;

  return (
    <div className={`compass-overlay compass-overlay--${variant}`} role="img" aria-label={`Brujula: norte ${displayedOrientation} grados`}>
      <svg className="compass-overlay__graphic" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle className="compass-overlay__ring" cx="40" cy="40" r="26" />
        <g className="compass-overlay__bearing" transform={`rotate(${displayedOrientation} 40 40)`}>
          <polygon className="compass-overlay__north" points="40,19 33,40 47,40" />
          <polygon className="compass-overlay__south" points="35,42 45,42 40,55" />
          <circle className="compass-overlay__pivot" cx="40" cy="40" r="2" />
          <text className="compass-overlay__north-label" x="40" y="8" transform={`rotate(${-displayedOrientation} 40 8)`}>N</text>
        </g>
      </svg>
    </div>
  );
}

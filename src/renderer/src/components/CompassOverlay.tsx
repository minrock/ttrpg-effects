import type { JSX } from "react";
import type { CompassOrientation } from "../../../domain/map/compass-orientation";
import compassImage from "../../../../assets/compass/compass.png";

interface CompassOverlayProps {
  readonly orientation: CompassOrientation;
  readonly variant?: "dm" | "player";
}

export function CompassOverlay({ orientation, variant = "dm" }: CompassOverlayProps): JSX.Element {
  return (
    <div className={`compass-overlay compass-overlay--${variant}`} aria-label={`Brujula: norte ${orientation} grados`}>
      <img
        src={compassImage}
        alt=""
        aria-hidden="true"
        style={{ transform: `rotate(${orientation}deg)` }}
      />
    </div>
  );
}

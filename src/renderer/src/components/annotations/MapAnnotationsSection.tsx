import type { JSX } from "react";
import { SharedSwitch } from "../SharedSwitch";

interface MapAnnotationsSectionProps {
  readonly visible: boolean;
  readonly onVisibleChange: (visible: boolean) => void;
}

export function MapAnnotationsSection({
  visible,
  onVisibleChange
}: MapAnnotationsSectionProps): JSX.Element {
  return (
    <div className="annotations-section">
      <div className="sidebar-switch-row">
        <span>Mostrar anotaciones</span>
        <SharedSwitch checked={visible} onCheckedChange={onVisibleChange} ariaLabel="Mostrar anotaciones" />
      </div>
    </div>
  );
}

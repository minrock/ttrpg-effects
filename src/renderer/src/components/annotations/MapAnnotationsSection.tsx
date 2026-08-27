import type { JSX } from "react";
import * as Switch from "@radix-ui/react-switch";

interface MapAnnotationsSectionProps {
  readonly visible: boolean;
  readonly activeTool: string;
  readonly onVisibleChange: (visible: boolean) => void;
  readonly onStartPin: () => void;
  readonly onStartArea: () => void;
  readonly onStartSceneLink: () => void;
}

export function MapAnnotationsSection({
  visible,
  activeTool,
  onVisibleChange,
  onStartPin,
  onStartArea,
  onStartSceneLink
}: MapAnnotationsSectionProps): JSX.Element {
  return (
    <div className="annotations-section">
      <div className="sidebar-switch-row">
        <span>Mostrar anotaciones</span>
        <Switch.Root className="switch-root" checked={visible} onCheckedChange={onVisibleChange}>
          <Switch.Thumb className="switch-thumb" />
        </Switch.Root>
      </div>
      <div className="annotation-tool-buttons">
        <button type="button" className={activeTool === "room-pin" ? "is-active" : ""} onClick={onStartPin}>
          Pin de habitacion
        </button>
        <button type="button" className={activeTool === "information-area" ? "is-active" : ""} onClick={onStartArea}>
          Area de informacion
        </button>
        <button type="button" className={activeTool === "scene-link" ? "is-active" : ""} onClick={onStartSceneLink}>
          Conexion de escena
        </button>
      </div>
    </div>
  );
}

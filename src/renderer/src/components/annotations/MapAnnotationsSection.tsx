import type { JSX } from "react";
import * as Switch from "@radix-ui/react-switch";

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
        <Switch.Root className="switch-root" checked={visible} onCheckedChange={onVisibleChange}>
          <Switch.Thumb className="switch-thumb" />
        </Switch.Root>
      </div>
    </div>
  );
}

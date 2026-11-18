import * as Switch from "@radix-ui/react-switch";
import "./SharedSwitch.css";

type SharedSwitchProps = {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly ariaLabel: string;
  readonly id?: string;
};

export function SharedSwitch({ checked, disabled = false, onCheckedChange, ariaLabel, id }: SharedSwitchProps) {
  return <Switch.Root id={id} className="shared-switch" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={ariaLabel}>
    <Switch.Thumb className="shared-switch__thumb" />
  </Switch.Root>;
}

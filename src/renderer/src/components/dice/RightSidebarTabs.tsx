import { Dices, SlidersHorizontal } from "lucide-react";
import { useRef, type JSX } from "react";

export function RightSidebarTabs({ value, onChange }: { value: "properties" | "dice"; onChange: (value: "properties" | "dice") => void }): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  return <div className="right-sidebar-tabs" ref={host} role="tablist" aria-label="Panel derecho" onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const next = event.key === "Home" ? "properties" : event.key === "End" ? "dice" : value === "properties" ? "dice" : "properties";
    onChange(next); host.current?.querySelector<HTMLButtonElement>(`#right-tab-${next}`)?.focus();
  }}>
    <button type="button" role="tab" id="right-tab-properties" aria-selected={value === "properties"} aria-controls="right-panel-properties" tabIndex={value === "properties" ? 0 : -1} onClick={() => onChange("properties")}><SlidersHorizontal size={16} />Propiedades</button>
    <button type="button" role="tab" id="right-tab-dice" aria-selected={value === "dice"} aria-controls="right-panel-dice" tabIndex={value === "dice" ? 0 : -1} onClick={() => onChange("dice")}><Dices size={16} />Dados</button>
  </div>;
}

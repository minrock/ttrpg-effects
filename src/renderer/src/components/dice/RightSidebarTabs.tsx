import { Dices, SlidersHorizontal, Users } from "lucide-react";
import { useRef, type JSX } from "react";

type SidebarTab = "properties" | "dice" | "table";

export function RightSidebarTabs({ value, onChange, showTable = false }: { value: SidebarTab; onChange: (value: SidebarTab) => void; showTable?: boolean }): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const tabs: SidebarTab[] = showTable ? ["properties", "dice", "table"] : ["properties", "dice"];
  return <div className={`right-sidebar-tabs${showTable ? " right-sidebar-tabs--table" : ""}`} ref={host} role="tablist" aria-label="Panel derecho" onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : tabs[(tabs.indexOf(value) + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next); host.current?.querySelector<HTMLButtonElement>(`#right-tab-${next}`)?.focus();
  }}>
    <button type="button" role="tab" id="right-tab-properties" aria-selected={value === "properties"} aria-controls="right-panel-properties" tabIndex={value === "properties" ? 0 : -1} onClick={() => onChange("properties")}><SlidersHorizontal size={16} />Propiedades</button>
    <button type="button" role="tab" id="right-tab-dice" aria-selected={value === "dice"} aria-controls="right-panel-dice" tabIndex={value === "dice" ? 0 : -1} onClick={() => onChange("dice")}><Dices size={16} />Dados</button>
    {showTable && <button type="button" role="tab" id="right-tab-table" aria-selected={value === "table"} aria-controls="right-panel-table" tabIndex={value === "table" ? 0 : -1} onClick={() => onChange("table")}><Users size={16} />Mesa</button>}
  </div>;
}

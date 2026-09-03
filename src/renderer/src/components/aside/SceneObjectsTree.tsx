import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Crosshair, EyeOff, Lightbulb, Search, Shapes, Sparkles, Trash2 } from "lucide-react";
import type { SceneObjectEntry } from "../../../../domain/sessions/scene-objects";

interface Props {
  readonly objects: readonly SceneObjectEntry[];
  readonly selectedElementId: string | null;
  readonly onSelect: (entry: SceneObjectEntry) => void;
  readonly onLocate: (entry: SceneObjectEntry) => void;
  readonly onDelete: (entry: SceneObjectEntry) => void;
}

export const SceneObjectsTree = memo(function SceneObjectsTree({ objects, selectedElementId, onSelect, onLocate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const matches = useMemo(() => objects.filter((entry) => entry.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [objects, query]);
  return <div className="scene-objects-panel">
    <label className="annotation-tree-search">
      <Search size={14} aria-hidden="true" />
      <input type="search" aria-label="Buscar objetos" placeholder="Buscar objetos" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
    </label>
    <ul className="scene-object-tree" aria-label="Objetos de escena">
      {(["Efectos", "Areas"] as const).map((group) => {
        const entries = matches.filter((entry) => entry.group === group);
        const open = query.trim() !== "" || !collapsed.has(group);
        return <li key={group}>
          <button className="scene-object-group" type="button" aria-expanded={open} onClick={() => setCollapsed((current) => {
            const next = new Set(current); if (next.has(group)) next.delete(group); else next.add(group); return next;
          })}>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>{group}</span><small>{entries.length}</small>
          </button>
          {open ? <ul>
            {entries.map((entry) => <li key={`${entry.collection}:${entry.id}`} className={`scene-object-row${selectedElementId === entry.id ? " is-selected" : ""}`}>
              <button className="scene-object-select" type="button" title={entry.label} aria-pressed={selectedElementId === entry.id}
                onClick={() => onSelect(entry)} onKeyDown={(event) => {
                  if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); event.stopPropagation(); onDelete(entry); }
                }}>
                {entry.collection === "shapes" ? <Shapes size={14} /> : entry.collection === "lights" ? <Lightbulb size={14} /> : <Sparkles size={14} />}
                <span>{entry.label}</span>
                {!entry.visible ? <EyeOff size={12} aria-label="Oculto" /> : null}
              </button>
              <button type="button" className="scene-object-action" title="Centrar objeto" aria-label={`Centrar ${entry.label}`} onClick={() => onLocate(entry)}><Crosshair size={14} /></button>
              <button type="button" className="scene-object-action" title="Borrar objeto" aria-label={`Borrar ${entry.label}`} onClick={() => onDelete(entry)}><Trash2 size={14} /></button>
            </li>)}
          </ul> : null}
        </li>;
      })}
    </ul>
    {matches.length === 0 ? <p className="sidebar-hint">Sin objetos.</p> : null}
  </div>;
});

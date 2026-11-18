import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import "./SearchableSelect.css";

export type SearchableSelectOption = { readonly id: string; readonly name: string };

export function SearchableSelect({ label, options, value, onChange, disabled = false, fallbackLabel, placeholder = "Buscar y elegir", noResultsText = "No hay coincidencias.", description }: {
  readonly label: string;
  readonly options: readonly SearchableSelectOption[];
  readonly value: string | null;
  readonly onChange: (id: string) => void;
  readonly disabled?: boolean;
  readonly fallbackLabel?: string;
  readonly placeholder?: string;
  readonly noResultsText?: string;
  readonly description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef(new Map<string, HTMLElement>());
  const generatedId = useId().replace(/:/g, "");
  const listboxId = `searchable-select-${generatedId}-listbox`;
  const descriptionId = `searchable-select-${generatedId}-description`;
  const statusId = `searchable-select-${generatedId}-status`;
  const selected = options.find(option => option.id === value);
  const confirmedLabel = selected?.name ?? fallbackLabel ?? "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(confirmedLabel);
  const [hasQuery, setHasQuery] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const matching = useMemo(() => {
    if (!hasQuery) return options;
    const normalized = query.trim().toLocaleLowerCase();
    return options.filter(option => option.name.toLocaleLowerCase().includes(normalized));
  }, [hasQuery, options, query]);

  const restore = () => {
    setQuery(confirmedLabel);
    setHasQuery(false);
    setActiveId(null);
  };
  const close = (restoreText: boolean) => {
    setOpen(false);
    if (restoreText) restore();
  };
  const openList = () => {
    if (disabled) return;
    const nextActive = selected?.id && options.some(option => option.id === selected.id) ? selected.id : options[0]?.id ?? null;
    setOpen(true);
    setQuery(confirmedLabel);
    setHasQuery(false);
    setActiveId(nextActive);
    requestAnimationFrame(() => inputRef.current?.select());
  };
  const choose = (id: string) => {
    if (disabled) return;
    onChange(id);
    setOpen(false);
    setHasQuery(false);
    setActiveId(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
  useEffect(() => {
    const option = activeId ? optionRefs.current.get(activeId) : undefined;
    const listbox = listboxRef.current;
    if (!option || !listbox) return;
    if (option.offsetTop < listbox.scrollTop) listbox.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > listbox.scrollTop + listbox.clientHeight) listbox.scrollTop = option.offsetTop + option.offsetHeight - listbox.clientHeight;
  }, [activeId]);
  useEffect(() => {
    if (activeId && !matching.some(option => option.id === activeId)) setActiveId(matching[0]?.id ?? null);
  }, [activeId, matching]);
  useEffect(() => { if (disabled && open) close(true); }, [disabled, open]);
  useEffect(() => {
    if (!open) restore();
  }, [confirmedLabel, open]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      if (open) close(true);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        openList();
        return;
      }
      if (!matching.length) return;
      const index = activeId ? matching.findIndex(option => option.id === activeId) : -1;
      const next = event.key === "ArrowDown" ? (index + 1) % matching.length : (index <= 0 ? matching.length - 1 : index - 1);
      setActiveId(matching[next]?.id ?? null);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (open && !event.nativeEvent.isComposing && activeId && matching.some(option => option.id === activeId)) choose(activeId);
    }
  };

  const describedBy = [description ? descriptionId : null, open ? statusId : null].filter(Boolean).join(" ") || undefined;
  return <div className="searchable-select" ref={rootRef}>
    <label className="searchable-select-label">
      <span>{label}</span>
      <span className="searchable-select-input-wrap">
        <input
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && activeId ? `${listboxId}-${activeId}` : undefined}
          aria-describedby={describedBy}
          value={open ? query : confirmedLabel}
          placeholder={placeholder}
          disabled={disabled}
          onClick={() => { if (!open) openList(); }}
          onChange={event => {
            setQuery(event.currentTarget.value);
            setHasQuery(true);
            setOpen(true);
            const normalized = event.currentTarget.value.trim().toLocaleLowerCase();
            setActiveId(options.find(option => option.name.toLocaleLowerCase().includes(normalized))?.id ?? null);
          }}
          onBlur={() => { if (open) close(true); }}
          onKeyDown={onKeyDown}
        />
        <ChevronDown aria-hidden="true" className="searchable-select-chevron" size={18}/>
      </span>
    </label>
    {description && <p id={descriptionId} className="searchable-select-description">{description}</p>}
    {open && <div className="searchable-select-popup">
      <p id={statusId} className="searchable-select-status" role="status" aria-live="polite">{matching.length} {matching.length === 1 ? "resultado" : "resultados"}</p>
      {matching.length === 0 && <p className="searchable-select-empty">{noResultsText}</p>}<ul ref={listboxRef} id={listboxId} className="searchable-select-listbox" role="listbox" aria-label={label}>
        {matching.map(option => <li
          key={option.id}
          id={`${listboxId}-${option.id}`}
          ref={node => { if (node) optionRefs.current.set(option.id, node); else optionRefs.current.delete(option.id); }}
          role="option"
          aria-selected={option.id === value}
          data-active={option.id === activeId || undefined}
          className="searchable-select-option"
          onMouseDown={event => event.preventDefault()}
          onClick={() => choose(option.id)}
        >{option.name}</li>)}
      </ul>
    </div>}
  </div>;
}

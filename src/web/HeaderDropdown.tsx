import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Desplegable nativo: Tab conserva su orden y Escape devuelve el foco al disparador. */
export function HeaderDropdown({ label, children, align = "left", className = "", title }: {
  label: ReactNode; children: ReactNode; align?: "left" | "right"; className?: string; title: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (ref.current?.open && event.target instanceof Node && !ref.current.contains(event.target)) ref.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss); };
  }, []);
  return <details ref={ref} className={`header-dropdown ${className}`} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === "Escape" && ref.current?.open) {
      event.preventDefault(); ref.current.open = false; ref.current.querySelector("summary")?.focus();
    }
  }}>
    <summary aria-label={title} title={title}>{label}<ChevronDown size={13} aria-hidden="true" className="header-chevron"/></summary>
    <div className={`header-dropdown-panel header-dropdown-panel--${align}`} onClickCapture={event => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (button && !button.disabled && ref.current) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }}>{children}</div>
  </details>;
}

import type { JSX, ReactNode } from "react";
import { Button } from "./ui/Controls";

export interface SidebarAccordionProps {
  readonly id: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}

export function SidebarAccordion({ id, icon, title, isOpen, onToggle, children }: SidebarAccordionProps): JSX.Element {
  return (
    <section className={`sidebar-accordion${isOpen ? " is-open" : ""}`} data-panel={id} aria-labelledby={`${id}-header`}>
      <Button
        id={`${id}-header`}
        className="sidebar-accordion-header"
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className="sidebar-accordion-icon" aria-hidden="true">{icon}</span>
        <span className="sidebar-accordion-title">{title}</span>
        <span className="sidebar-accordion-chevron" aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </Button>
      {isOpen ? <div id={id} className="sidebar-accordion-content">{children}</div> : null}
    </section>
  );
}

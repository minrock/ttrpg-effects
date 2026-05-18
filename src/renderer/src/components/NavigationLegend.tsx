import type { JSX } from "react";

type MouseHighlight = "left" | "middle" | "right" | "scroll";

function MouseIcon({ highlight }: { readonly highlight: MouseHighlight }): JSX.Element {
  const accent = "rgba(255,240,168,0.92)";
  const dim = "rgba(255,255,255,0.08)";
  const stroke = "rgba(255,255,255,0.45)";

  return (
    <svg width="16" height="22" viewBox="0 0 16 22" fill="none" aria-hidden="true">
      {/* Body outline */}
      <rect x="1" y="6" width="14" height="15" rx="7" fill={dim} stroke={stroke} strokeWidth="1.2" />
      {/* Left button fill */}
      <path
        d="M1 13V9a7 7 0 0 1 7-7v7H1z"
        fill={highlight === "left" ? accent : dim}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* Right button fill */}
      <path
        d="M15 13V9a7 7 0 0 0-7-7v7h7z"
        fill={highlight === "right" ? accent : dim}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* Middle button / wheel highlight */}
      <rect
        x="6"
        y="5"
        width="4"
        height="7"
        rx="2"
        fill={highlight === "middle" || highlight === "scroll" ? accent : dim}
        stroke={stroke}
        strokeWidth="1"
      />
    </svg>
  );
}

export function NavigationLegend(): JSX.Element {
  return (
    <div className="navigation-legend" aria-hidden="true">
      <span className="nav-legend-label">Menu</span>
      <MouseIcon highlight="right" />
      <div className="nav-legend-divider" />
      <kbd className="nav-legend-key">Space</kbd>
      <span className="nav-legend-plus">+</span>
      <MouseIcon highlight="left" />
      <div className="nav-legend-divider" />
      <span className="nav-legend-label">Zoom</span>
      <MouseIcon highlight="scroll" />
    </div>
  );
}

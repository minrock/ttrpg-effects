import { type JSX, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalBackdropProps {
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** 600 px fixed width */
  readonly wide?: boolean;
  /** 80 vw min-width × 60 vh min-height — for detail / presentation modals */
  readonly large?: boolean;
  readonly fitContent?: boolean;
}

export function ModalBackdrop({ onClose, children, wide = false, large = false, fitContent = false }: ModalBackdropProps): JSX.Element {
  const panelStyle: React.CSSProperties = fitContent
    ? {
        backgroundColor: "#1e2025",
        border: "1px solid #2e3035",
        borderRadius: 12,
        padding: 22,
        width: "fit-content",
        maxWidth: "95vw",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 12px 48px rgba(0,0,0,0.75)"
      }
    : large
    ? {
        backgroundColor: "#1e2025",
        border: "1px solid #2e3035",
        borderRadius: 12,
        padding: 28,
        minWidth: "80vw",
        maxWidth: "95vw",
        minHeight: "60vh",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 12px 48px rgba(0,0,0,0.75)"
      }
    : {
        backgroundColor: "#1e2025",
        border: "1px solid #2e3035",
        borderRadius: 10,
        padding: 24,
        width: wide ? 600 : 380,
        maxWidth: "90vw",
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
      };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        {children}
      </div>
    </div>,
    document.body
  );
}

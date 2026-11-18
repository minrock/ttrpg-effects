import type { Decorator, Preview } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { ClientProvider } from "../src/renderer/src/client/ClientProvider";
import { PortalTargetProvider } from "../src/renderer/src/client/PortalTarget";
import "../src/renderer/src/styles.css";
import "../src/renderer/src/components/workspace/workspace.css";
import "../src/web/service.css";
import "./preview.css";

type UiContext = "neutral" | "editor" | "service" | "workspace" | "administration";

function ContextFrame({ context, children }: { readonly context: UiContext; readonly children: ReactNode }) {
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const content = portalTarget !== null && <PortalTargetProvider target={portalTarget}><div className="storybook-canvas">{children}</div></PortalTargetProvider>;

  let framed: ReactNode;
  if (context === "editor") framed = <div className="vtt-interface"><div className="control-sidebar"><div className="sidebar-accordion-content">{content}</div></div><div className="storybook-portal-target" ref={setPortalTarget} /></div>;
  else if (context === "service") framed = <main className="service-page service-app">{content}<div className="storybook-portal-target" ref={setPortalTarget} /></main>;
  else if (context === "administration") framed = <>{content}<div className="storybook-portal-target" ref={setPortalTarget} /></>;
  else if (context === "workspace") framed = <div className="vtt-interface"><div className="app-workspace">{content}<div className="storybook-portal-target" ref={setPortalTarget} /></div></div>;
  else framed = <>{content}<div className="storybook-portal-target" ref={setPortalTarget} /></>;

  return <ClientProvider client={null}>
    <div className={`storybook-context storybook-context--${context}`}>{framed}</div>
  </ClientProvider>;
}

const withProductContext: Decorator = (Story, context) => {
  const uiContext = (context.parameters.uiContext ?? "neutral") as UiContext;
  return <ContextFrame context={uiContext}><Story /></ContextFrame>;
};

const preview: Preview = {
  decorators: [withProductContext],
  parameters: {
    uiContext: "neutral",
    options: {
      storySort: {
        order: ["Fundamentos", "Controles", "Composiciones"]
      }
    },
    controls: { expanded: true },
    a11y: {},
    viewport: {
      options: {
        narrow: { name: "Estrecho · 390 px", styles: { width: "390px", height: "844px" }, type: "mobile" },
        wide: { name: "Amplio · 1440 px", styles: { width: "1440px", height: "900px" }, type: "desktop" }
      }
    }
  }
};

export default preview;

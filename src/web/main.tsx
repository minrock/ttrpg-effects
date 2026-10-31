// Polyfills de Pixi que evitan generación dinámica de código y conservan CSP sin unsafe-eval.
import "pixi.js/unsafe-eval";
import { createRoot } from "react-dom/client";
import { captureInvitation } from "./invitation-fragment";
import { ServiceApp } from "./ServiceApp";
import "../renderer/src/styles.css";
import "../renderer/src/components/workspace/workspace.css";
import "./service.css";
const invitation = captureInvitation(location, history);
createRoot(document.getElementById("root")!).render(<ServiceApp invitation={invitation}/>);

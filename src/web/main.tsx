// Polyfills de Pixi que evitan generación dinámica de código y conservan CSP sin unsafe-eval.
import "pixi.js/unsafe-eval";
import { createRoot } from "react-dom/client";
import { ServiceApp } from "./ServiceApp";
import "../renderer/src/styles.css";
import "../renderer/src/components/workspace/workspace.css";
import "./service.css";
createRoot(document.getElementById("root")!).render(<ServiceApp/>);

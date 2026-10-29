import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InterfaceLab } from "./InterfaceLab";
import "./ui-lab.css";

createRoot(document.getElementById("root")!).render(<StrictMode><InterfaceLab /></StrictMode>);
import "pixi.js/unsafe-eval";

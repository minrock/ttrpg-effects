import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PlayerApp } from "./PlayerApp";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const RootApp = params.get("view") === "player" ? PlayerApp : App;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);

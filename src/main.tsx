import { instance } from "./instance";
import CloudGate from "./CloudGate";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {instance.dataMode === "firebase" ? (
      <CloudGate>
        <App />
      </CloudGate>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);

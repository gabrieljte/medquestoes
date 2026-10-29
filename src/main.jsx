import React from "react";
import { createRoot } from "react-dom/client";
import App from "./PlannerApp.jsx";
import "../app/globals.css";
import "../app/modern-theme.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

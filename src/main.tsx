import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { privateHistoryScope, PRIVATE_HISTORY_BASE } from "./lib/private-history-release";
import "./styles.css";
import "./features.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={privateHistoryScope ? PRIVATE_HISTORY_BASE.slice(0, -1) : undefined}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

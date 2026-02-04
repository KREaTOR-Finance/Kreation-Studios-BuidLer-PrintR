import React from "react";
import ReactDOM from "react-dom/client";
import RouterApp from "./RouterApp";
import "./styles/tokens.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterApp />
  </React.StrictMode>
);

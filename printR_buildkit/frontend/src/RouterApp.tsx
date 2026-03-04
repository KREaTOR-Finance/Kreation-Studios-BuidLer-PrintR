import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import { PrintrLanding } from "./printr2/PrintrLanding";
import { PrintrLobby } from "./printr2/PrintrLobby";
import { PrintrGame } from "./printr2/PrintrGame";

// PrintR-only app shell.
// HashRouter kept for itch.io / Telegram webview compatibility.
export default function RouterApp(){
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PrintrLanding />} />
        <Route path="/play" element={<PrintrLobby />} />
        <Route path="/session/:sessionId" element={<PrintrGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

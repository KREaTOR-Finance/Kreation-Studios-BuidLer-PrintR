import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import { PrintrLanding } from "./printr2/PrintrLanding";
import { PrintrLobby } from "./printr2/PrintrLobby";
import { PrintrGame } from "./printr2/PrintrGame";
import { PrintrTransparency } from "./printr2/PrintrTransparency";
import { PrintrStore } from "./printr2/PrintrStore";
import { PrintrLeaderboard } from "./printr2/PrintrLeaderboard";

// PrintR-only app shell.
// HashRouter kept for itch.io / Telegram webview compatibility.
export default function RouterApp(){
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PrintrLanding />} />
        <Route path="/play" element={<PrintrLobby />} />
        <Route path="/session/:sessionId" element={<PrintrGame />} />
        <Route path="/transparency" element={<PrintrTransparency />} />
        <Route path="/store" element={<PrintrStore />} />
        <Route path="/leaderboard" element={<PrintrLeaderboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

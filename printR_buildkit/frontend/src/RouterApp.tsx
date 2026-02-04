import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import SiteLayout from "./layouts/SiteLayout";

import HomePage from "./pages/HomePage";
import GamesPage from "./pages/GamesPage";
import AboutPage from "./pages/AboutPage";
import SupportPage from "./pages/SupportPage";
import DevelopersPage from "./pages/DevelopersPage";
import PrintRLandingPage from "./pages/PrintRLandingPage";
import LegalPage from "./pages/LegalPage";
import AdminLeadsPage from "./pages/AdminLeadsPage";
import NotFoundPage from "./pages/NotFoundPage";

import { PrintrShell } from "./printr/PrintrShell";

// Site + App share one brand system. PrintR runs under /printr.
// Using HashRouter for itch.io iframe compatibility.
export default function RouterApp(){
  return (
    <HashRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/developers" element={<DevelopersPage />} />
          <Route path="/admin/leads" element={<AdminLeadsPage />} />
          <Route path="/legal" element={<LegalPage />} />

          {/* PrintR Marketing landing */}
          <Route path="/printr/landing" element={<PrintRLandingPage />} />

          {/* PrintR App routes */}
          <Route path="/printr" element={<PrintrShell initialView="home" />} />
          <Route path="/printr/store" element={<PrintrShell initialView="store" />} />
          <Route path="/printr/profile" element={<PrintrShell initialView="profile" />} />
          <Route path="/printr/leaderboards" element={<PrintrShell initialView="leaderboard" />} />
          <Route path="/printr/progress" element={<PrintrShell initialView="progress" />} />

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

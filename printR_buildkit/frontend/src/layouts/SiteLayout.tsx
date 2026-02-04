import React from "react";
import { Outlet } from "react-router-dom";
import { SiteNav } from "../components/site/SiteNav";
import { SiteFooter } from "../components/site/SiteFooter";
import { tokens } from "../theme/tokens";
import { ErrorBoundary } from "../components/site/ErrorBoundary";

export default function SiteLayout() {
  return (
    <div style={{ minHeight:"100vh", background: tokens.colors.bg0 }}>
      <a href="#main" style={{
        position:"absolute", left:-9999, top: 10,
        background: tokens.colors.panel, color: tokens.colors.text,
        padding:"10px 12px", borderRadius: 12, border:`1px solid ${tokens.colors.border}`
      }}
      onFocus={(e)=>{ (e.currentTarget as any).style.left="10px"; }}
      onBlur={(e)=>{ (e.currentTarget as any).style.left="-9999px"; }}
      >
        Skip to content
      </a>

      <SiteNav />

      <main id="main" style={{ display:"block" }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <SiteFooter />
    </div>
  );
}

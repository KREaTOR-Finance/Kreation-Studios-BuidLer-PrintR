import React from "react";
import { tokens } from "../../theme/tokens";

export function SiteFooter() {
  return (
    <div style={{ borderTop:`1px solid ${tokens.colors.border}`, background: tokens.colors.bg0, marginTop: 40 }}>
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"22px 16px", color: tokens.colors.textDim, fontSize: 13, display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ color: tokens.colors.text, fontWeight: 900 }}>Kreation Studios Games</div>
          <div style={{ marginTop: 6 }}>Premier title: <span style={{ color: tokens.colors.accentA, fontWeight: 800 }}>PrintR</span> by <span style={{ color: tokens.colors.accentB, fontWeight: 800 }}>BuidLer Labs</span></div>
        </div>
        <div style={{ display:"flex", gap:14 }}>
          <a href="#" style={{ color: tokens.colors.link, textDecoration:"none" }}>Telegram</a>
          <a href="#" style={{ color: tokens.colors.link, textDecoration:"none" }}>X</a>
          <a href="/developers" style={{ color: tokens.colors.link, textDecoration:"none" }}>Developers</a>
          <a href="/legal" style={{ color: tokens.colors.link, textDecoration:"none" }}>Legal</a>
        </div>
      </div>
    </div>
  );
}

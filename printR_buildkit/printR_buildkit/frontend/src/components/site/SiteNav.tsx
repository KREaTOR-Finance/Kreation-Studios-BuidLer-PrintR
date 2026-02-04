import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCreditsBalance } from "../../hooks/useCreditsBalance";
import { tokens } from "../../theme/tokens";

const navItemStyle = ({ isActive }: any) => ({
  color: isActive ? tokens.colors.accentA : tokens.colors.textDim,
  textDecoration: "none",
  fontSize: 14,
  padding: "10px 10px",
});

export function SiteNav() {
  const loc = useLocation();
  const inPrintr = loc.pathname.startsWith("/printr");
  const showAdmin = new URLSearchParams(loc.search).get("admin") === "1";
  const bal = useCreditsBalance(inPrintr ? 8000 : 0);
  return (
    <div style={{
      position:"sticky", top:0, zIndex:50,
      background: tokens.colors.bg0,
      borderBottom: `1px solid ${tokens.colors.border}`
    }}>
      <div style={{ maxWidth: 1080, margin:"0 auto", padding:"12px 16px", display:"flex", alignItems:"center", gap:16 }}>
        <Link to="/" style={{ color: tokens.colors.text, textDecoration:"none", fontWeight:800, letterSpacing:0.4 }}>
          Kreation Studios <span style={{ color: tokens.colors.accentB, fontWeight:900 }}>Games</span>
        </Link>

        <div style={{ display:"flex", gap:10, marginLeft:"auto" }}>
          <NavLink to="/" style={navItemStyle} end>Home</NavLink>
          <NavLink to="/games" style={navItemStyle}>Games</NavLink>
          <NavLink to="/printr" style={navItemStyle}>PrintR</NavLink>
          <NavLink to="/about" style={navItemStyle}>About</NavLink>
          <NavLink to="/support" style={navItemStyle}>Support</NavLink>
          <NavLink to="/developers" style={navItemStyle}>Developers</NavLink>
          {showAdmin ? <NavLink to="/admin/leads" style={navItemStyle}>Admin</NavLink> : null}
        </div>

        {inPrintr ? (
          <div style={{ marginLeft: 8, padding:"8px 10px", borderRadius: 999, border:`1px solid ${tokens.colors.border}`, background:"rgba(0,0,0,0.25)", color: tokens.colors.text, fontWeight: 900, fontSize: 12 }}>
            Sessions: {bal.loading ? "…" : bal.sessionsBalance}
          </div>
        ) : null}

        <Link to="/printr" style={{
          marginLeft: 8,
          background: `linear-gradient(90deg, ${tokens.colors.accentA}, ${tokens.colors.accentB})`,
          color: "#0B0D12",
          padding: "10px 14px",
          borderRadius: 14,
          textDecoration:"none",
          fontWeight: 900,
          fontSize: 13
        }}>
          Play PrintR
        </Link>
      </div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";

export function Hero({eyebrow, title, subtitle, ctas}:{eyebrow:string; title:React.ReactNode; subtitle:React.ReactNode; ctas:React.ReactNode}) {
  return (
    <div className="hero">
      <div className="badge">{eyebrow}</div>
      <div className="h1">{title}</div>
      <div className="small" style={{ marginTop: 10, maxWidth: 820 }}>{subtitle}</div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop: 18 }}>
        {ctas}
      </div>
    </div>
  );
}

export function Section({title, subtitle, children}:{title:string; subtitle?:React.ReactNode; children:React.ReactNode}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div className="h2">{title}</div>
      {subtitle ? <div className="small" style={{ marginTop: 6, maxWidth: 900 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

export function GameCard({title, status, desc, ctaTo}:{title:string; status:"LIVE"|"SOON"; desc:string; ctaTo:string}) {
  return (
    <div className="panel">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <div style={{ fontWeight: 1000 }}>{title}</div>
        <div style={{ fontWeight: 900, fontSize: 12, color: status==="LIVE" ? "var(--accentA)" : "var(--textDim)" }}>{status}</div>
      </div>
      <div className="small" style={{ marginTop: 6 }}>{desc}</div>
      <div style={{ marginTop: 12, display:"flex", gap:12, flexWrap:"wrap" }}>
        <Link to={ctaTo} className={"btn " + (status==="LIVE" ? "btnPrimary" : "")}>{status==="LIVE" ? "Play" : "Learn more"}</Link>
        {title==="PrintR" ? <Link to="/printr/landing" className="btn">Details</Link> : null}
      </div>
    </div>
  );
}

export function FAQ({items}:{items:{q:string;a:React.ReactNode}[]}) {
  return (
    <div className="panel">
      {items.map((it, idx)=>(
        <div key={idx} style={{ padding:"10px 0" }}>
          <div style={{ fontWeight: 950 }}>{it.q}</div>
          <div className="small" style={{ marginTop: 6 }}>{it.a}</div>
          {idx < items.length-1 ? <div className="hr" /> : null}
        </div>
      ))}
    </div>
  );
}

export function CTA({title, body, primaryTo, primaryText, secondaryTo, secondaryText}:{title:string; body:React.ReactNode; primaryTo:string; primaryText:string; secondaryTo?:string; secondaryText?:string}) {
  return (
    <div className="panel" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{ fontWeight: 1000 }}>{title}</div>
        <div className="small" style={{ marginTop: 6 }}>{body}</div>
      </div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <Link to={primaryTo} className="btn btnPrimary">{primaryText}</Link>
        {secondaryTo && secondaryText ? <Link to={secondaryTo} className="btn">{secondaryText}</Link> : null}
      </div>
    </div>
  );
}

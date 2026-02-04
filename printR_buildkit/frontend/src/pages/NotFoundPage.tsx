import React from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/site/Seo";

export default function NotFoundPage(){
  return (
    <div className="container">
      <Seo title="404 • Not Found" description="Page not found." canonicalPath="/404" />
      <div className="panel">
        <div style={{ fontWeight: 1000 }}>Page not found</div>
        <div className="small" style={{ marginTop: 6 }}>The page you requested doesn’t exist.</div>
        <div style={{ marginTop: 12, display:"flex", gap:12, flexWrap:"wrap" }}>
          <Link to="/" className="btn btnPrimary">Home</Link>
          <Link to="/printr" className="btn">Play PrintR</Link>
        </div>
      </div>
    </div>
  );
}

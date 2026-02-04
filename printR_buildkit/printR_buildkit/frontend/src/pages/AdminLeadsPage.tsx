import React, { useEffect, useMemo, useState } from "react";
import { Section } from "../components/site/SiteComponents";
import { Seo } from "../components/site/Seo";

type Lead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  studio?: string;
  gameTitle: string;
  gameLink?: string;
  pitch: string;
  stack?: string;
  socials?: string;
  notes?: string;
  playerRef?: string;
  ip?: string;
  userAgent?: string;
};

function apiBase() {
  return import.meta.env.VITE_API_BASE || "";
}

export default function AdminLeadsPage() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("ADMIN_TOKEN") || "");
  const [status, setStatus] = useState<"idle"|"loading"|"error">("idle");
  const [error, setError] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const limit = 50;

  const authed = useMemo(()=> token.trim().length >= 8, [token]);

  useEffect(() => {
    localStorage.setItem("ADMIN_TOKEN", token);
  }, [token]);

  async function load(nextOffset = 0){
    if (!authed) return;
    setStatus("loading");
    setError("");
    try{
      const res = await fetch(`${apiBase()}/api/admin/developer-leads?limit=${limit}&offset=${nextOffset}`, {
        headers: { "X-Admin-Token": token.trim() }
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "LOAD_FAILED");
      setLeads(data.leads || []);
      setTotal(data.total || 0);
      setOffset(nextOffset);
      setStatus("idle");
    }catch(e:any){
      setError(e?.message ?? "LOAD_FAILED");
      setStatus("error");
    }
  }

  return (
    <div className="container">
      <Seo title="Admin • Developer Leads" description="Internal ops page to review developer submissions." canonicalPath="/admin/leads" />
      <div className="h2">Admin • Developer Leads</div>
      <div className="small" style={{ marginTop: 6, maxWidth: 980 }}>
        Use your backend <b>ADMIN_TOKEN</b> to view incoming “Submit your game” entries.
        This is meant for internal ops only.
      </div>

      <Section title="Admin token">
        <div className="panel">
          <div className="small" style={{ marginBottom: 8 }}>Stored locally in your browser (localStorage). Never embed this in public builds.</div>
          <input
            value={token}
            onChange={(e)=>setToken(e.target.value)}
            placeholder="Paste ADMIN_TOKEN"
            style={{ width:"100%", borderRadius: 14, border:"1px solid var(--border)", background:"rgba(0,0,0,0.25)", color:"var(--text)", padding: 12, outline:"none" }}
          />
          <div style={{ marginTop: 12, display:"flex", gap:12, flexWrap:"wrap" }}>
            <button className="btn btnPrimary" onClick={()=>load(0)} disabled={!authed || status==="loading"} style={{ opacity: (!authed||status==="loading") ? 0.6 : 1 }}>
              {status==="loading" ? "Loading…" : "Load Leads"}
            </button>
            {status==="error" ? <span className="small">Error: <b>{error}</b></span> : null}
          </div>
        </div>
      </Section>

      <Section title={`Leads (${total})`}>
        <div className="panel" style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ textAlign:"left", borderBottom:"1px solid var(--border)" }}>
                <th style={{ padding:"10px 8px" }}>Created</th>
                <th style={{ padding:"10px 8px" }}>Name</th>
                <th style={{ padding:"10px 8px" }}>Email</th>
                <th style={{ padding:"10px 8px" }}>Game</th>
                <th style={{ padding:"10px 8px" }}>Link</th>
                <th style={{ padding:"10px 8px" }}>Pitch</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding:"10px 8px", whiteSpace:"nowrap" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td style={{ padding:"10px 8px" }}>{l.name}</td>
                  <td style={{ padding:"10px 8px" }}>{l.email}</td>
                  <td style={{ padding:"10px 8px" }}>{l.gameTitle}</td>
                  <td style={{ padding:"10px 8px" }}>
                    {l.gameLink ? <a href={l.gameLink} target="_blank" rel="noreferrer">{l.gameLink}</a> : <span className="small">—</span>}
                  </td>
                  <td style={{ padding:"10px 8px" }}>
                    <div className="small" style={{ maxWidth: 520, whiteSpace:"pre-wrap" }}>{l.pitch}</div>
                  </td>
                </tr>
              ))}
              {leads.length===0 ? (
                <tr><td colSpan={6} style={{ padding:"14px 8px" }} className="small">No leads loaded yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ display:"flex", gap:12, marginTop: 12, flexWrap:"wrap" }}>
          <button className="btn" onClick={()=>load(Math.max(0, offset - limit))} disabled={!authed || offset===0 || status==="loading"} style={{ opacity: (!authed || offset===0 || status==="loading") ? 0.6 : 1 }}>Prev</button>
          <button className="btn" onClick={()=>load(offset + limit)} disabled={!authed || (offset+limit)>=total || status==="loading"} style={{ opacity: (!authed || (offset+limit)>=total || status==="loading") ? 0.6 : 1 }}>Next</button>
        </div>
      </Section>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Panel, TopBar } from "./ui";
import { backendHttpBase } from "./net";

import "./tokens.css";
import "./ui.css";
import "./screens.css";

type Row = {
  referralCode: string;
  referredPurchaseUsdCents: number;
  referredPurchaseCount: number;
};

function fmtUsd(cents: number){
  const v = (Number(cents ?? 0) / 100).toFixed(2);
  return `$${v}`;
}

export function PrintrTransparency(){
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${backendHttpBase()}/api/public/referrals/top?limit=20`);
        const j = await res.json();
        if (!alive) return;
        setRows(Array.isArray(j?.rows) ? j.rows : []);
        setStatus("ok");
      } catch {
        if (!alive) return;
        setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame">
        <TopBar
          left={<Button variant="ghost" onClick={() => nav("/")}>Home</Button>}
          center={<div className="p2-mini">TRANSPARENCY</div>}
          right={null}
        />

        <Panel className="p2-panel" as="div">
        <div className="p2-panelTitle">Top 20 Referrals</div>
        <div className="p2-panelSub">Ranked by total purchases made by referred users.</div>

        {status === "loading" ? (
          <div className="p2-mini" style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div>
        ) : null}
        {status === "error" ? (
          <div className="p2-mini p2-error" style={{ marginTop: 10 }}>Failed to load.</div>
        ) : null}

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {rows.map((r, idx) => (
            <div key={r.referralCode} className="p2-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap: 12 }}>
              <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
                <div className="p2-pill" style={{ minWidth: 44, justifyContent:"center" }}>#{idx+1}</div>
                <div>
                  <div className="p2-mini" style={{ opacity: 0.9 }}>CODE</div>
                  <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>{r.referralCode}</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight: 900 }}>{fmtUsd(r.referredPurchaseUsdCents)}</div>
                <div className="p2-mini" style={{ opacity: 0.8 }}>{r.referredPurchaseCount} purchases</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="p2-panelTitle">Treasury Policy</div>
          <div className="p2-mini" style={{ opacity: 0.82, lineHeight: 1.35 }}>
            All net proceeds earned by the app are used to purchase SKR and stake with a guardian.
            (Receipts section coming next.)
          </div>
        </div>
        </Panel>
      </div>
    </div>
  );
}

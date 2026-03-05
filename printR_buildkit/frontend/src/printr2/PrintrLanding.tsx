import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./tokens.css";
import "./ui.css";
import "./screens.css";

import { Button, Panel } from "./ui";
import { ConnectButton } from "./wallet/ConnectButton";
import { apiGet, apiPost } from "../network/httpClient";
import { getPrintr2PlayerRef } from "./playerRef";

export function PrintrLanding(){
  const nav = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);

  const player = useMemo(() => ({ playerRef: getPrintr2PlayerRef() }), []);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [refInput, setRefInput] = useState("");
  const [refMsg, setRefMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiGet<{ ok: boolean; referralCode: string }>("/api/referrals/me", player);
        if (!alive) return;
        setMyCode(r.referralCode);
      } catch {
        // referrals might not be enabled in this backend env
      }
    })();
    return () => { alive = false; };
  }, [player]);

  useEffect(() => {
    const seen = localStorage.getItem("printr:tutorial:seen") === "1";
    if (!seen) setShowTutorial(true);
  }, []);

  const openTutorial = () => setShowTutorial(true);
  const closeTutorial = () => {
    localStorage.setItem("printr:tutorial:seen", "1");
    setShowTutorial(false);
  };

  const headline = useMemo(() => {
    const lines = ["COMMIT", "THE TAPE", "CLOSE CLEAN"]; 
    return lines;
  }, []);

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame">
        <header className="p2-top">
          <div className="p2-mark">
            <div className="p2-markDot" />
            <div>
              <div className="p2-markText">PrintR</div>
              <div className="p2-mini" style={{ marginTop: 2, letterSpacing: ".16em" }}>by Kreation Studios</div>
            </div>
          </div>
          <div className="p2-topActions">
            <Button variant="ghost" onClick={() => nav("/transparency")}>Transparency</Button>
            <Button variant="ghost" onClick={openTutorial}>How it works</Button>
            <ConnectButton compact />
          </div>
        </header>

        <main className="p2-hero">
          <div className="p2-headline">
            {headline.map((t) => (
              <div key={t} className="p2-headlineLine">{t}</div>
            ))}
          </div>
          <div className="p2-sub">
            A chart-first score chase. Leverage points. Survive Closing. Verify fairness.
          </div>

          <div className="p2-ctaRow">
            <Button onClick={() => nav("/play")}>PLAY</Button>
            <Button variant="secondary" onClick={() => nav("/store")}>STORE</Button>
            <Button variant="ghost" onClick={() => nav("/leaderboard")}>LEADERBOARD</Button>
          </div>

          <div style={{ marginTop: 16, width: "min(640px, 100%)" }}>
            <Panel className="p2-panel" as="div">
              <div className="p2-panelTitle">Referrals</div>
              <div className="p2-panelSub">New buyers get 50% off their first purchase with a code. Referrers earn +10% sessions on first purchase.</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div>
                  <div className="p2-mini">YOUR CODE</div>
                  <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>{myCode ?? "—"}</div>
                  <div className="p2-mini" style={{ opacity: 0.75, marginTop: 4 }}>Share this code with friends.</div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div className="p2-mini">APPLY A CODE</div>
                  <input
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    placeholder="KRE-XXXXXXXX"
                    className="p2-input"
                    style={{ height: 44, borderRadius: 12, padding: "0 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "white" }}
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        setRefMsg(null);
                        try {
                          await apiPost("/api/referrals/apply", { code: refInput }, player);
                          setRefMsg("Referral applied.");
                        } catch (e: any) {
                          setRefMsg(e?.message ?? "Failed to apply.");
                        }
                      }}
                    >
                      APPLY
                    </Button>
                    <Button variant="ghost" onClick={() => { setRefInput(""); setRefMsg(null); }}>CLEAR</Button>
                  </div>
                  {refMsg ? <div className="p2-mini" style={{ opacity: 0.85 }}>{refMsg}</div> : null}
                </div>
              </div>
            </Panel>
          </div>

          <div className="p2-footnote">
            Arcade points only. No financial product. Proof badge available in-game.
          </div>
        </main>
      </div>

      {showTutorial && (
        <TutorialModal onClose={closeTutorial} onPlay={() => { closeTutorial(); nav("/play"); }} />
      )}
    </div>
  );
}

function TutorialModal({ onClose, onPlay }: { onClose: () => void; onPlay: () => void }){
  return (
    <div className="p2-modalBack" role="dialog" aria-modal="true">
      <div className="p2-modal">
        <div className="p2-modalHeader">
          <div className="p2-modalTitle">How PrintR works</div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="p2-steps">
          <Step n="01" title="Markers = ammo" body="Opening and closing consumes markers. Don’t run dry." />
          <Step n="02" title="Leverage multiplies points" body="Higher leverage swings harder—up or down." />
          <Step n="03" title="Break Point" body="If losses exceed your threshold, you’re force-closed." />
          <Step n="04" title="Closing pressure" body="Late commits lock. Plan your exit." />
          <Step n="05" title="Proof" body="A badge opens Switchboard proof + session commitment." />
        </div>

        <div className="p2-ctaRow" style={{ marginTop: 12 }}>
          <Button onClick={onPlay}>PLAY NOW</Button>
          <Button variant="secondary" onClick={onClose}>NOT YET</Button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }){
  return (
    <div className="p2-step">
      <div className="p2-stepN">{n}</div>
      <div className="p2-stepBody">
        <div className="p2-stepTitle">{title}</div>
        <div className="p2-stepText">{body}</div>
      </div>
    </div>
  );
}

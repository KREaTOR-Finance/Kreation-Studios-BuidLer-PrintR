import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./tokens.css";
import "./ui.css";
import "./screens.css";

import { Button } from "./ui";

export function PrintrLanding(){
  const nav = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);

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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button variant="ghost" onClick={openTutorial}>How it works</Button>
            {/* Wallet optional on landing */}
            {/**/}
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
            <Button variant="secondary" onClick={openTutorial}>TUTORIAL</Button>
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

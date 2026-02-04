import React from "react";
import { Link } from "react-router-dom";
import { Hero, Section, CTA, FAQ } from "../components/site/SiteComponents";

export default function PrintRLandingPage() {
  return (
    <div className="container">
      <Hero
        eyebrow="BUILDLER LABS • PRINT R"
        title={<>PrintR: a fast chart game where your score follows the tape.</>}
        subtitle={<>Commit points into a position, Close to lock score, and survive the Closing pressure window. Designed like a broker page: chart dominates the screen, controls stay minimal, and every action feels weighted.</>}
        ctas={
          <>
            <Link to="/printr" className="btn btnPrimary">Play Now</Link>
            <Link to="/printr/store" className="btn">Buy Sessions</Link>
          </>
        }
      />

      <Section title="Core loop" subtitle="Simple to learn. Hard to master. Built for repeat play.">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="panel"><div style={{fontWeight:1000}}>1) Join</div><div className="small" style={{marginTop:6}}>Pick one of four live asset sessions. Each session runs ~20 minutes.</div></div>
          <div className="panel"><div style={{fontWeight:1000}}>2) Commit</div><div className="small" style={{marginTop:6}}>Choose a points size, press/hold to arm, then execute. Only one open position at a time.</div></div>
          <div className="panel"><div style={{fontWeight:1000}}>3) Close</div><div className="small" style={{marginTop:6}}>Close to lock score. In Closing, no new commits — only closes and the end-price option.</div></div>
          <div className="panel"><div style={{fontWeight:1000}}>4) Rank up</div><div className="small" style={{marginTop:6}}>Earn badges, trophies, and seasonal placements across your sessions.</div></div>
        </div>
      </Section>

      <Section title="Session phases" subtitle="Clear timing removes confusion and increases intensity.">
        <div className="panel">
          <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div>
              <div style={{ fontWeight: 950 }}>LIVE</div>
              <div className="small" style={{ marginTop: 6 }}>Commits + closes allowed. Tick moves every ~5 seconds.</div>
            </div>
            <div>
              <div style={{ fontWeight: 950 }}>FINAL 30s WARNING</div>
              <div className="small" style={{ marginTop: 6 }}>Last chance to commit. Optional Crowd Tape prints can appear.</div>
            </div>
            <div>
              <div style={{ fontWeight: 950 }}>CLOSING</div>
              <div className="small" style={{ marginTop: 6 }}>No new commits. Close only. Optional close-at-end-price.</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Pricing" subtitle="Arcade credits (sessions). No speculative token required to play.">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>$10</div>
            <div className="small" style={{ marginTop: 6 }}>40 sessions (minimum)</div>
            <div style={{ marginTop: 12 }}><Link to="/printr/store" className="btn btnPrimary">Buy</Link></div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>$100</div>
            <div className="small" style={{ marginTop: 6 }}>500 sessions (best value)</div>
            <div style={{ marginTop: 12 }}><Link to="/printr/store" className="btn btnPrimary">Buy</Link></div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>1 USDC</div>
            <div className="small" style={{ marginTop: 6 }}>4 sessions (reference)</div>
            <div className="small" style={{ marginTop: 10 }}>Credit accounting is server-authoritative and displayed in your profile and lobby header.</div>
          </div>
        </div>
      </Section>

      <Section title="FAQ">
        <FAQ items={[
          { q:"Is this gambling?", a:<>PrintR is an arcade-style points game. Players purchase sessions to play and compete for scores and progression.</> },
          { q:"Do I need to close?", a:<>Yes. Leaving a position open at end forfeits the session score. The closing period exists to make this clear and intense.</> },
          { q:"Can I play multiple sessions?", a:<>Yes. Parallel sessions exist (2–4 charts). You can focus one chart or view a grid.</> },
        ]}/>
      </Section>

      <CTA title="Start playing" body={<>Open PrintR now and see the interface in action.</>} primaryTo="/printr" primaryText="Play PrintR" secondaryTo="/games" secondaryText="Explore Games" />
    </div>
  );
}

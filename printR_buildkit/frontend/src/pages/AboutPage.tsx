import React from "react";
import { Section, CTA, FAQ } from "../components/site/SiteComponents";

export default function AboutPage() {
  return (
    <div className="container">
      <div className="h2">About Kreation Studios</div>
      <div className="small" style={{ marginTop: 6, maxWidth: 900 }}>
        Kreation Studios is the umbrella brand for premium, mobile-first games. <b>BuidLer Labs</b> is the engineering studio behind PrintR — built with gold-standard architecture: clear state machines, trust-first backend authority, and VRF proof access for player confidence.
      </div>

      <Section title="Brand system" subtitle="One design language across website and gameplay — so players feel like they never ‘leave the universe.’">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Visual language</div>
            <div className="small" style={{ marginTop: 6 }}>Dark broker panels + Solana-leaning neon accents. Minimal controls. Strong clarity.</div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Interaction language</div>
            <div className="small" style={{ marginTop: 6 }}>Two-step Commit/Close, micro animations, and haptics to reinforce decisions.</div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Trust cues</div>
            <div className="small" style={{ marginTop: 6 }}>VRF proof badge and transparent session phases reduce “rigged” perceptions.</div>
          </div>
        </div>
      </Section>

      <Section title="Governance (later)" subtitle="Airdropped governance token can enable weighted voting on features and changes — without requiring a speculative token for play.">
        <FAQ items={[
          { q:"What do players vote on?", a:<>UI upgrades, new session archetypes, new progression rewards, and seasonal adjustments.</> },
          { q:"Is governance required to play?", a:<>No. PrintR is sessions-based arcade play. Governance is optional and future-facing.</> },
        ]}/>
      </Section>

      <CTA title="Experience the flagship" body={<>PrintR is the proving ground for Kreation Studios quality standards.</>} primaryTo="/printr" primaryText="Play PrintR" secondaryTo="/printr/landing" secondaryText="Learn PrintR" />
    </div>
  );
}

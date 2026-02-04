import React from "react";
import { Section, FAQ, CTA } from "../components/site/SiteComponents";

export default function SupportPage() {
  return (
    <div className="container">
      <div className="h2">Support</div>
      <div className="small" style={{ marginTop: 6 }}>Answers for credits, purchases, and fairness. Expand with real links once domain + support email exist.</div>

      <Section title="Common questions">
        <FAQ items={[
          { q:"How do credits work?", a:<>Credits are <b>sessions</b>. Joining a live session consumes 1 session. Spectating is free.</> },
          { q:"What are the bundles?", a:<>$10 buys 40 sessions. $100 buys 500 sessions. 1 USDC equals 4 sessions.</> },
          { q:"What if I join in the final 2 minutes?", a:<>If a session is in Closing, you join as a spectator and can watch the action without consuming a session.</> },
          { q:"How do I verify fairness?", a:<>Use the in-game VRF badge to view the proof payload for a session/tick.</> },
        ]}/>
      </Section>

      <Section title="Contact" subtitle="Placeholders for now (domain not purchased yet).">
        <div className="panel">
          <div className="small">Support email: support@kreationstudios.games (placeholder)</div>
          <div className="small">Telegram: @KreationStudios (placeholder)</div>
          <div className="small">X: @KreationStudios (placeholder)</div>
        </div>
      </Section>

      <CTA title="Play instead of reading" body={<>Most questions become obvious once you run a session. Jump in.</>} primaryTo="/printr" primaryText="Play PrintR" secondaryTo="/printr/store" secondaryText="Buy Sessions" />
    </div>
  );
}

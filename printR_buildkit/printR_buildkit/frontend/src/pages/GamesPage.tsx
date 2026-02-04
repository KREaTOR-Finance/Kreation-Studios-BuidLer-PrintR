import React from "react";
import { Section, GameCard, CTA } from "../components/site/SiteComponents";
import { Seo } from "../components/site/Seo";
import { gamesCatalog } from "../content/gamesCatalog";

export default function GamesPage() {
  return (
    <>
      <Seo title="Kreation Studios Games • Games" description="Browse the Kreation Studios catalog." canonicalPath="/games" />

    <div className="container">
      <div className="h2">Games</div>
      <div className="small" style={{ marginTop: 6 }}>Premier title now live. More titles will ship under the same Kreation Studios brand system.</div>

      <Section title="Now Live">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          {gamesCatalog.filter(g=>g.status==="LIVE").map(g => (
            <GameCard key={g.key} title={g.name} status="LIVE" desc={g.short} ctaTo={g.playPath || "/games"} />
          ))}
        </div>
      </Section>

      <Section title="Coming Soon" subtitle="These are placeholders to establish the ‘studio catalog’ look. Replace as projects mature.">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          {gamesCatalog.filter(g=>g.status==="SOON").map(g => (
            <GameCard key={g.key} title={g.name} status="SOON" desc={g.short} ctaTo={g.comingSoonPath || "/games"} />
          ))}
        </div>
      </Section>

      <CTA title="Play the premier title" body={<>PrintR is the flagship experience right now — it sets the bar for quality, speed, and trust.</>} primaryTo="/printr" primaryText="Play PrintR" />
    </div>
    </>
  );
}

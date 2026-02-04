import React from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/site/Seo";
import { gamesCatalog } from "../content/gamesCatalog";
import { siteConfig } from "../content/siteConfig";
import { Hero, Section, GameCard, CTA, FAQ } from "../components/site/SiteComponents";

export default function HomePage() {
  return (
    <>
      <Seo title={`${siteConfig.brand} • Home`} description={siteConfig.tagline} canonicalPath="/" />

    <div className="container">
      <Hero
        eyebrow="KREATION STUDIOS GAMES"
        title={<>A one-brand arcade for modern crypto-native games.</>}
        subtitle={<>A clean, premium experience across website and gameplay. Our premier title is <b>PrintR</b> by <b>BuidLer Labs</b> — a TradingView-style score chase built for mobile speed and trust.</>}
        ctas={
          <>
            <Link to="/printr" className="btn btnPrimary">Play PrintR</Link>
            <Link to="/printr/landing" className="btn">What is PrintR?</Link>
            <a className="btn" href="#" aria-label="Join on Telegram (placeholder)">Open in Telegram</a>
          </>
        }
      />

      <Section
        title="Featured"
        subtitle={<>Fast sessions, real-time score intensity, and fairness features players can inspect. Built to be “round after round” addictive.</>}
      >
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          <GameCard title="PrintR" status="LIVE" desc="Commit and Close on a fast-moving chart. Survive Closing. Climb leaderboards." ctaTo="/printr" />
          <GameCard title="Next Title" status="SOON" desc="Kreation Studios is building a growing catalog. PrintR ships first. More coming soon." ctaTo="/games" />
        </div>
      </Section>

      <Section title="Why players stay" subtitle="Habit-forming by design: fast feedback, clear wins/losses, and progression loops that keep you chasing better closes.">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Broker-style feel</div>
            <div className="small" style={{ marginTop: 6 }}>Chart takes the screen. Controls stay minimal. Your score moves with the tape.</div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Closing pressure</div>
            <div className="small" style={{ marginTop: 6 }}>No new commits late. Close at end price option adds strategy and intensity.</div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Progression</div>
            <div className="small" style={{ marginTop: 6 }}>Badges, trophies, and seasonal ranks give long-term goals beyond a single session.</div>
          </div>
        </div>
      </Section>

      <Section title="Fairness & trust (built in)" subtitle="Players should never feel like the game is ‘rigged.’ Proof access and clear rules create confidence.">
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>VRF proof access</div>
            <div className="small" style={{ marginTop: 6 }}>A small in-game badge opens a modal with the tick/session proof payload.</div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Crowd Tape window</div>
            <div className="small" style={{ marginTop: 6 }}>In the final 30 seconds, optional prints can show what the crowd is doing — safely gated and privacy-aware.</div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 1000 }}>Arcade credits</div>
            <div className="small" style={{ marginTop: 6 }}>Buy sessions. Chase points. No speculative token required to play.</div>
          </div>
        </div>
      </Section>

      <CTA
        title="Ready to play?"
        body={<>Jump into PrintR now. Buy sessions in the Store and start climbing the boards.</>}
        primaryTo="/printr"
        primaryText="Play PrintR"
        secondaryTo="/printr/store"
        secondaryText="Buy Sessions"
      />

      <Section title="FAQ">
        <FAQ items={[
          { q:"What do I buy?", a:<>You buy <b>sessions</b> (arcade credits). 1 USDC buys 4 sessions. Minimum purchase is $10 (40 sessions).</> },
          { q:"Do I need a wallet?", a:<>Not required to start. Telegram can provide identity. Wallet can be linked later for governance or on-chain features.</> },
          { q:"Can I join mid-session?", a:<>Yes. If the session is in Closing, you join as a spectator so the rules stay fair.</> },
        ]}/>
      </Section>
    </div>
    </>
  );
}

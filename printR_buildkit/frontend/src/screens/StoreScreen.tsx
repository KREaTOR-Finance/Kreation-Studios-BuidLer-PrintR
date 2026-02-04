import React, { useState } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { CreditPackCard } from "../components/CreditPackCard";
import type { GameAPI } from "../state/useGameMachine";
import { useSounds } from "../state/SoundProvider";
import { useHaptics } from "../state/HapticsProvider";
import { apiPost } from "../network/httpClient";
import { getPlayerHeaders } from "../state/player";
import { useCreditsBalance } from "../hooks/useCreditsBalance";

type Bundle = "BUNDLE_10" | "BUNDLE_100" | "RESET_POINTS";

export function StoreScreen({ game }:{ game:GameAPI }){
  const { state } = game;
  const { play } = useSounds();
  const h = useHaptics();
  const player = getPlayerHeaders();
  const { sessionsBalance, refresh } = useCreditsBalance(player);
  const [busy, setBusy] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (bundle: Bundle) => {
    play("tap");
    h.selection();
    setError(null);
    setBusy(bundle);
    try {
      const r = await apiPost<{ ok: boolean; url: string }>(`/api/payments/stripe/checkout`, { bundle }, player);
      // Telegram WebApp supports window.location and also openLink; we'll keep it simple for scaffold.
      const openLink = (window as any).Telegram?.WebApp?.openLink;
      if (openLink) openLink(r.url);
      else window.location.href = r.url;
    } catch (e: any) {
      setError(e?.message ?? "checkout_error");
      setBusy(null);
    }
  };

  return (
    <div style={{ padding: 16, display:"grid", gap: 12 }}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card title="Store — Session Credits" subtitle="1 USDC buys 4 sessions. Credits are arcade sessions, not a token.">
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
          Minimum buy: <b>$10</b> for <b>40 sessions</b>. Bulk: <b>$100</b> for <b>500 sessions</b>.
        </div>

        <div style={{marginTop:14, display:"grid", gap: 12}}>
          <CreditPackCard
            title="Minimum Pack"
            tokens={40}
            price="$10"
            highlight="Minimum"
            onBuy={()=>buy("BUNDLE_10")}
            disabled={busy !== null}
            busy={busy==="BUNDLE_10"}
          />
          <CreditPackCard
            title="Bulk Pack"
            tokens={500}
            price="$100"
            highlight="Best Value"
            onBuy={()=>buy("BUNDLE_100")}
            disabled={busy !== null}
            busy={busy==="BUNDLE_100"}
          />
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.6 }}>Points Reset</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Reset your points back to zero. Streak stays as-is.
          </div>
          <button
            disabled={busy !== null}
            onClick={() => buy("RESET_POINTS")}
            style={{
              marginTop: 10,
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: busy ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, rgba(34,211,238,0.92), rgba(59,130,246,0.92))",
              boxShadow: busy ? "none" : "0 0 18px rgba(56,189,248,0.25)",
              color: "#F8FAFC",
              fontWeight: 900,
              letterSpacing: 1.1,
              textTransform: "uppercase",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1
            }}
          >
            {busy === "RESET_POINTS" ? "Opening Checkout..." : "Buy $5"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,120,120,0.95)" }}>
            {error}
          </div>
        )}

        <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          Payments: Stripe (card/Apple Pay/Google Pay). Crypto rails (Solana USDC) can be added later with the same credit ledger.
        </div>

        <div style={{ marginTop: 10, display:"flex", gap: 10 }}>
          <button
            onClick={() => refresh()}
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"white", borderRadius: 10, padding:"10px 12px" }}
          >
            Refresh balance
          </button>
        </div>
      </Card>
    </div>
  );
}
